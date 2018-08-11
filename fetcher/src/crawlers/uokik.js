const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const fs = require("fs");

const logger = require("../logger");
const { simpleDOMListParser, simpleDOMGet } = require("../utils");

const BASE_URL = "http://www.uokik.gov.pl";
const MAIN_URL = `${BASE_URL}/dzienniki_urzedowe_uokik2.php`;
const SOURCE_NAME = "uokik.gov.pl";

const crawl = async () => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);

  const ITEM_SELECTOR = "#subpage > div > div > ul > li";

  return new Promise(async (resolve, reject) => {
    const page = await browser.newPage();
    await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

    const list = await simpleDOMListParser(browser, MAIN_URL, ITEM_SELECTOR, node => ({
      title: node
        .find("a")
        .text()
        .trim(),
      url: BASE_URL + node.find("a").attr("href"),
      source: SOURCE_NAME,
      date: `01-0${node
        .find("a")
        .text()
        .trim()
        .slice(-6)
        .replace("/", "-")}`
    }));

    resolve(list);

    await browser.close();
  });
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
