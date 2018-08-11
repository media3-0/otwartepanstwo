const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const async = require("async");
const { EventEmitter } = require("events");

const logger = require("../logger");

// const MAIN_URL = "http://dziennikustawnauchodzstwie.gov.pl";
// const SOURCE_NAME = "dziennikustawnauchodzstwie.gov.pl";
const MAIN_URL = "http://monitorpolskinauchodzstwie.gov.pl";
const SOURCE_NAME = "monitorpolskinauchodzstwie.gov.pl";

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

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);

  const years = await simpleDOMListParser(browser, MAIN_URL, ".content li a", data => ({
    url: MAIN_URL + data.attr("href"),
    year: parseInt(data.text())
  }));

  return new Promise(resolve => {
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
            date: `${current.year}-01-01`,
            sourceName: SOURCE_NAME,
            ocr: true
          })
        );

        emitter.emit("entity", flatten(data));
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

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
