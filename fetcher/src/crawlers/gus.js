const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const fs = require("fs");

const logger = require("../logger");
const { simpleDOMListParser, simpleDOMGet, formatFromDotToDash } = require("../utils");

const BASE_URL = "http://dziennikigus.stat.gov.pl";
const MAIN_URL = `${BASE_URL}/dzienniki-urzedowe-gus`;
const SOURCE_NAME = "bip.gitd.gov.pl";

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

  const YEARS_SELECTOR = "#txt > div.video-menu a";

  const ITEM_SELECTOR = "#txt > div.white-box > table > tbody > tr";

  const yearsData = $(YEARS_SELECTOR)
    .map((i, d) => $(d).attr("href"))
    .get();

  return new Promise(async (resolve, reject) => {
    async.mapLimit(
      yearsData,
      1,
      async currentYearUrl => {
        const list = await simpleDOMListParser(browser, BASE_URL + currentYearUrl, ITEM_SELECTOR, node => ({
          title: node
            .find("td:nth-child(3) > div")
            .text()
            .trim(),
          url: BASE_URL + node.find("td:nth-child(4) a.pdf").attr("href"),
          date: formatFromDotToDash(
            node
              .find("td:nth-child(1)")
              .text()
              .trim()
          ),
          source: SOURCE_NAME
        }));
        console.log(list);
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
