const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const fs = require("fs");

const logger = require("../logger");
const { simpleDOMListParser, simpleDOMGet, formatFromDotToDash } = require("../utils");

const BASE_URL = "http://dziennik.msp.gov.pl/";
const MAIN_URL = `${BASE_URL}/du/dzienniki`;
const SOURCE_NAME = "msp";

const crawl = async () => {
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

  const pages = await new Promise((resolve, reject) => {
    async.mapLimit(
      pagination,
      1,
      async pageNumber => {
        const list = await simpleDOMListParser(
          browser,
          `${MAIN_URL}?page=${pageNumber}`,
          PAGE_SELECTOR,
          node => BASE_URL + node.attr("href")
        );
        return list;
      },
      async (err, results) => {
        if (err) {
          console.log(err);
        }
        resolve(flatten(results));
      }
    );
  });

  return new Promise((resolve, reject) => {
    async.mapLimit(
      pages,
      5,
      async pageUrl => {
        const list = await simpleDOMGet(browser, pageUrl, ITEM_SELECTOR, node => ({
          title: node
            .find("div.head > h2")
            .text()
            .trim(),
          date: formatFromDotToDash(
            node
              .find("div:nth-child(3)")
              .text()
              .slice(17, 27)
          ),
          update_date: formatFromDotToDash(
            node
              .find("div:nth-child(4)")
              .text()
              .slice(20, 30)
          ),
          url:
            BASE_URL +
            node
              .find("div.zalaczniki > ul > li > a")
              .first()
              .attr("href"),
          source: SOURCE_NAME
        }));
        return list;
      },
      async (err, results) => {
        await browser.close();
        if (err) {
          console.log(err);
        }
        resolve(flatten(results));
      }
    );
  });
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
