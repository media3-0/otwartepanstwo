const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const { simpleDOMListParser, simpleDOMGet } = require("../utils");

const BASE_URL = "http://dziennik.msp.gov.pl/";
const MAIN_URL = `${BASE_URL}/du/dzienniki`;
const SOURCE_NAME = "Dziennik Urzędowy Ministerstwa Skarbu Państwa";

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

  const PAGINATION_SELECTOR = "#wyborStron";

  const PAGE_SELECTOR = "#content > section > div.subRight > table > tbody > tr > td:nth-child(2) > a";

  const ITEM_SELECTOR = "#content > section > div.subRight > article";

  const pagination = $(PAGINATION_SELECTOR + " option")
    .map((i, d) => $(d).val())
    .get();

  const pages = await new Promise(resolve => {
    async.mapLimit(
      pagination,
      1,
      async pageNumber => {
        const item = await simpleDOMListParser(
          browser,
          `${MAIN_URL}?page=${pageNumber}`,
          PAGE_SELECTOR,
          node => BASE_URL + node.attr("href")
        );
        return item;
      },
      async (err, results) => {
        resolve(flatten(results));
      }
    );
  });

  return new Promise(resolve => {
    async.mapLimit(
      pages,
      5,
      async pageUrl => {
        const item = await simpleDOMGet(browser, pageUrl, ITEM_SELECTOR, node => ({
          title: node
            .find("div.head > h2")
            .text()
            .trim(),
          date: node
            .find("div:nth-child(3)")
            .text()
            .slice(17, 27)
            .split(".")
            .reverse()
            .join("-"),
          updateDate: node
            .find("div:nth-child(4)")
            .text()
            .slice(20, 30)
            .split(".")
            .reverse()
            .join("-"),
          url:
            BASE_URL +
            node
              .find("div.zalaczniki > ul > li > a")
              .first()
              .attr("href"),
          sourceName: SOURCE_NAME
        }));

        emitter.emit("entity", [item]);

        return item;
      },
      async (err, results) => {
        await browser.close();
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
