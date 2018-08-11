// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const { simpleDOMListParser, simpleDOMGet } = require("../utils");

const MAIN_URL = "https://e-dziennik.men.gov.pl";
const SOURCE_NAME = "men";

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

  const YEARS_SELECTOR = "#mainmenu > ul > li.item-101.active.deeper.parent > ul > li > a";

  const PAGES_SELECTOR = "#table1 > tbody > tr > td:nth-child(3) > a:nth-child(1)";

  const ITEM_SELECTOR = "#jwts_tab1 > div > table > tbody";

  const yearsData = $(YEARS_SELECTOR)
    .map((i, d) => MAIN_URL + $(d).attr("href"))
    .get();

  await page.close();

  const pages = await new Promise((resolve, reject) => {
    async.mapLimit(
      yearsData,
      1,
      async currentYearUrl => {
        const newPage = await browser.newPage();
        await newPage.goto(currentYearUrl);
        const entity = await simpleDOMListParser(
          browser,
          currentYearUrl,
          PAGES_SELECTOR,
          node => MAIN_URL + node.attr("href")
        );

        await newPage.close();

        return entity;
      },
      (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(flatten(results));
      }
    );
  });

  return new Promise((resolve, reject) => {
    async.mapLimit(
      pages,
      5,
      async currentPageUrl => {
        const entity = await simpleDOMGet(browser, currentPageUrl, ITEM_SELECTOR, node => ({
          title: node
            .find("tr:nth-child(9) > td:nth-child(2)")
            .text()
            .trim(),
          date: node
            .find("tr:nth-child(4) > td:nth-child(2)")
            .text()
            .trim()
            .split(".")
            .reverse()
            .join("-"),
          updateDate: node
            .find("tr:nth-child(5) > td:nth-child(2)")
            .text()
            .trim()
            .split(".")
            .reverse()
            .join("-"),
          url: MAIN_URL + node.find("tr:nth-child(10) > td:nth-child(2) > a").attr("href"),
          sourceName: SOURCE_NAME,
          ocr: false
        }));

        emitter.emit("entity", [entity]);

        return entity;
      },
      (err, results) => {
        browser.close();
        if (err) {
          return reject(err);
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
