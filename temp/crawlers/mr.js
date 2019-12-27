const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const async = require("async");
const fs = require("fs");

const logger = require("../logger");
const { simpleDOMListParser, simpleDOMGet } = require("../utils");

const MAIN_URL = "https://dziennikurzedowy.mr.gov.pl";
const SOURCE_NAME = "dziennikurzedowy.mr.gov.pl";

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

  const YEARS_SELECTOR = "#boxes-standard > div > div > ul > li > a";

  const ITEM_SELECTOR = "#viev-message > article > table > tbody > tr";

  const yearsData = $(YEARS_SELECTOR)
    .map((i, d) => $(d).attr("href"))
    .get();

  return new Promise(async (resolve, reject) => {
    async.mapLimit(
      yearsData,
      1,
      async currentYear => {
        return await simpleDOMListParser(browser, MAIN_URL + currentYear, ITEM_SELECTOR, node => ({
          title: node.find("td:nth-child(2)").text(),
          url:
            MAIN_URL +
            node
              .find("td:nth-child(3) a")
              .first()
              .attr("href"),
          date: node
            .find("td:nth-child(4)")
            .text()
            .split("-")
            .reverse()
            .join("-"),
          source: SOURCE_NAME
        }));
      },
      async (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(flatten(results));
        await browser.close();
      }
    );
  });
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};