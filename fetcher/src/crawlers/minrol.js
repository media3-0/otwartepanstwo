// Generic 2
// BUT THIS DIFFERS - TAKE SELECTORS AS PARAMETER
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const logger = require("../logger");

const { simpleDOMGet } = require("../utils");

const MAIN_URL = "https://edziennik.minrol.gov.pl";
const SOURCE_NAME = "Dziennik Urzędowy Ministerstwa Rolnictwa i Rozwoju Wsi";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  const YEARS_SELECTOR =
    "#main-content > div > div > div.page-header.clearfix > div.form-inline.form--years > div > select:nth-child(2)";

  const PAGE_SELECTOR = "#main-content > div > div > div:nth-child(3) > div > div > div a";

  const ITEM_SELECTOR = "#main-content > div";

  const yearsData = $(YEARS_SELECTOR + " option")
    .map((i, d) => $(d).text())
    .get();

  const pages = await new Promise((resolve, reject) => {
    async.mapLimit(
      yearsData,
      1,
      async current => {
        logger.debug(`Processing year ${current}`);

        const newPage = await browser.newPage();
        await newPage.goto(MAIN_URL, { waitUntil: "networkidle0" });

        let content = await newPage.content();
        let $ = cheerio.load(content);

        const toSelect = $(YEARS_SELECTOR + " option")
          .map((i, d) => ({ label: $(d).text(), value: $(d).val() }))
          .get()
          .find(d => d.label === current);

        const currentlySelected = $(YEARS_SELECTOR).val();

        if (currentlySelected !== toSelect.value) {
          const watcherForResponse = newPage.waitForResponse(() => true);

          await newPage.select(YEARS_SELECTOR, toSelect.value);

          await watcherForResponse;

          await sleep(1000);

          content = await newPage.content();
          $ = cheerio.load(content);
        }
        return $(PAGE_SELECTOR)
          .map((i, d) => MAIN_URL + $(d).attr("href"))
          .get();
      },
      async (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(flatten(results));
      }
    );
  });

  return new Promise((resolve, reject) => {
    async.mapLimit(
      pages,
      6,
      async current => {
        const result = await simpleDOMGet(browser, current, ITEM_SELECTOR, node => ({
          title: node.find("div:nth-child(3) > div.row > div.col-md-9 > div:nth-child(1) > div > p > span").text(),
          date: node
            .find("#positionSidePanel > div:nth-child(1) > ul > li:nth-child(4) > span")
            .text()
            .split(".")
            .reverse()
            .join("-"),
          url: MAIN_URL + "/" + node.find("#notHtmlVersionOfAct > div > div > abc-download-pdf > div > a").attr("href"),
          sourceName: SOURCE_NAME
        }));

        emitter.emit("entity", [result]);

        return result;
      },
      async (err, results) => {
        await browser.close();
        if (err) {
          reject(err);
        }
        resolve(flatten(results));
      }
    );
  });
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
