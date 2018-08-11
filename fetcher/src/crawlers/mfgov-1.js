const async = require("async");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { flatten } = require("lodash");
const logger = require("../logger");
const leftPad = require("left-pad");
const { EventEmitter } = require("events");

const IS_DEV = false;

const MAIN_URL = "https://www.mf.gov.pl/ministerstwo-finansow/minister-finansow/dziennik-urzedowy";
const SOURCE_NAME = "mf.gov.pl";

const PL_MONTHS = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia"
];

const crawlTable = $ => {
  const urlsOnPage = $("td.first a")
    .map((i, d) => {
      const $d = $(d);

      const url = $d.attr("href");

      const title = $d
        .find(".file-entry-list-description")
        .text()
        .trim();

      const dateStr = $d
        .find(".taglib-text")
        .text()
        .trim();

      const maybeDate = dateStr.match(/(\d\d?) (.*) (\d{4})/);

      if (!maybeDate) {
        logger.debug(`can't parse date for ${dateStr}`);
        return {};
      }

      const day = maybeDate[1];
      const month = PL_MONTHS.findIndex(plMonth => maybeDate[2].toLowerCase().includes(plMonth)) + 1;

      if (month === 0) {
        logger.debug(`can't parse month for ${maybeDate[2]}`);
      }

      const year = maybeDate[3];

      const date = `${year}-${leftPad(month, 2, "0")}-${leftPad(day, 2, "0")}`;

      return {
        date,
        url,
        title,
        sourceName: SOURCE_NAME,
        ocr: false
      };
    })
    .get();

  return urlsOnPage;
};

const crawlYear = async (browser, year, emitter) => {
  const newPage = await browser.newPage();
  await newPage.goto(year, { waitUntil: "networkidle0" });
  await newPage.waitForSelector(".taglib-search-iterator");

  const content = await newPage.content();
  let $ = cheerio.load(content);

  let urls = crawlTable($);

  emitter.emit("entity", urls);

  const hasNext = () => $(".page-links a.next").length > 0;

  if (!hasNext()) {
    return new Promise(resolve => resolve(urls));
  }

  return new Promise((resolve, reject) =>
    // async/await is not playing nice with doWhilst
    async.whilst(
      hasNext,
      callback => {
        newPage.click(".page-links a.next").then(() =>
          newPage.waitForSelector(".taglib-search-iterator").then(() => {
            newPage.content().then(content => {
              $ = cheerio.load(content);

              const pageUrls = crawlTable($);

              emitter.emit("entity", pageUrls);

              urls = [...urls, ...pageUrls];

              callback();
            });
          })
        );
      },
      err => {
        newPage.close().then(() => {
          if (err) {
            return reject(err);
          }

          resolve(flatten(urls));
        });
      }
    )
  );
};

const crawl = async emitter => {
  const browserOpts = {
    // headless: false,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--proxy-server='direct://'", "--proxy-bypass-list=*"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

  await page.waitForSelector(".taglib-search-iterator");

  const content = await page.content();
  const $ = cheerio.load(content);

  const yearLinks = $(".col-1 a:first-child").map((i, d) => $(d).attr("href"));

  return new Promise((resolve, reject) =>
    async.mapLimit(
      IS_DEV ? yearLinks.slice(0, 1) : yearLinks,
      3,
      async yearLink => {
        logger.info(`Opening ${yearLink}`);
        const urls = await crawlYear(browser, yearLink, emitter);
        return urls;
      },
      async (err, data) => {
        await browser.close();

        if (err) {
          return reject(err);
        }

        const urls = flatten(data);
        resolve(urls);
      }
    )
  );
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
