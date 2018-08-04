// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const async = require("async");
const fs = require("fs");

const logger = require("../logger");
const { simpleDOMListParser, simpleDOMGet } = require("../utils");

const MAIN_URL = "https://mgm.gov.pl";
const SOURCE_NAME = "mgm";

const crawl = async () => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL + "/du", { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  const YEARS_SELECTOR = "#main > ul > li > a";

  const ITEM_SELECTOR = "#main > table > tbody > tr";

  const yearsData = $(YEARS_SELECTOR)
    .map((i, d) => MAIN_URL + $(d).attr("href"))
    .get();

  await page.close();

  return new Promise((resolve, reject) => {
    async.mapLimit(
      yearsData,
      1,
      async currentYearUrl => {
        const newPage = await browser.newPage();
        await newPage.goto(currentYearUrl);
        const list = await simpleDOMListParser(browser, currentYearUrl, ITEM_SELECTOR, node => ({
          title: node.find("td:nth-child(3)").text(),
          date: node
            .find("td:nth-child(1) > div > time.entry-date.published")
            .attr("datetime")
            .substring(0, 10),
          url: node.find("td:nth-child(3) a").attr("href"),
          source: SOURCE_NAME,
          ocr: false
        }));

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
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
