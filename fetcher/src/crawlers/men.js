// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const async = require("async");
const fs = require("fs");

const logger = require("../logger");
const { simpleDOMListParser, simpleDOMGet } = require("../utils");

const MAIN_URL = "https://e-dziennik.men.gov.pl";
const SOURCE_NAME = "men";

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
        const list = await simpleDOMListParser(
          browser,
          currentYearUrl,
          PAGES_SELECTOR,
          node => MAIN_URL + node.attr("href")
        );

        await newPage.close();

        return list;
      },
      (err, results) => {
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
      async currentPageUrl => {
        return simpleDOMGet(browser, currentPageUrl, ITEM_SELECTOR, node => ({
          title: node
            .find("tr:nth-child(9) > td:nth-child(2)")
            .text()
            .trim(),
          date: node.find("tr:nth-child(4) > td:nth-child(2)").text(),
          update_date: node
            .find("tr:nth-child(5) > td:nth-child(2)")
            .text()
            .trim(),
          url: MAIN_URL + node.find("tr:nth-child(10) > td:nth-child(2) > a").attr("href"),
          source: SOURCE_NAME,
          ocr: false
        }));
      },
      (err, results) => {
        if (err) {
          console.log(err);
        }
        resolve(flatten(results));
        browser.close();
      }
    );
  });
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
