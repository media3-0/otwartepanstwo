const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");

const logger = require("../logger");

// const MAIN_URL = "http://dziennikustawnauchodzstwie.gov.pl";
// const SOURCE_NAME = "dziennikustawnauchodzstwie.gov.pl";
const MAIN_URL = "http://monitorpolskinauchodzstwie.gov.pl";
const SOURCE_NAME = "monitorpolskinauchodzstwie.gov.pl";
const NEEDS_OCR_BEFORE = "ALL";

const simpleDOMListParser = async (browser, url, path, parse) => {
  const page = await browser.newPage();
  await page.goto(url);

  const content = await page.content();
  const $ = cheerio.load(content);

  const results = $(path)
    .map((i, link) => parse($(link)))
    .get();

  await page.close();

  return results;
};

const crawl = async () => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);

  const years = await simpleDOMListParser(browser, MAIN_URL, ".content li a", data => ({
    url: MAIN_URL + data.attr("href"),
    year: parseInt(data.text())
  }));

  return new Promise((resolve, reject) => {
    async.mapLimit(
      years,
      1,
      async current => {
        const data = await simpleDOMListParser(
          browser,
          current.url,
          ".content table tbody tr td:first-child a",
          data => ({
            title: data.text(),
            url: MAIN_URL + data.attr("href"),
            date: `01-01-${current.year}`,
            sourceName: SOURCE_NAME,
            ocr: current.year < NEEDS_OCR_BEFORE || NEEDS_OCR_BEFORE === "ALL"
          })
        );

        return flatten(data);
      },
      async (err, results) => {
        if (err) logger.error(err);
        await browser.close();
        resolve(results);
      }
    );
  });
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
