const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const BASE_URL = "https://www.bip.ms.gov.pl";
const MAIN_URL = `${BASE_URL}/pl/ministerstwo/dziennik-urzedowy-ministra-sprawiedliwosci/`;
const SOURCE_NAME = "Dziennik Urzędowy Ministerstwa Sprawiedliwości";

const getYearsUrls = async browser => {
  const page = await browser.newPage();
  await page.goto(MAIN_URL);
  const result = await page.evaluate(() => {
    const elements = document
      .querySelector(
        "body > div > div > div > div.pageclass.bip.page > div.outer-container > div > div > div.content > div.main-content.clearfix > div.left > div > div.frame.no-bg.jq-resize > div > div.page-cont.clearfix > div.mapaserwisu > div > ul"
      )
      .querySelectorAll("a");
    return [...elements].map(a => ({ url: a.href, year: parseInt(a.innerText) }));
  });

  await page.close();

  return result;
};

const getAllPdfsUrls = async (browser, url, year) => {
  const page = await browser.newPage();
  await page.goto(url);

  const content = await page.content();
  const $ = cheerio.load(content);

  const pdfs = $(".pliki a")
    .map((i, link) => {
      const url = BASE_URL + $(link).attr("href");
      const title = $(link)
        .text()
        .trim();
      const date = `${year}-01-01`;
      return { url, title, date, sourceName: SOURCE_NAME };
    })
    .get();

  await page.close();

  return new Promise(resolve => {
    resolve(pdfs);
  });
};

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);

  const yearsUrls = await getYearsUrls(browser);
  const filteredYears = yearsUrls.slice(1);

  const pdfsUrls = async.mapLimit(
    filteredYears,
    1,
    async current => {
      const pdfs = await getAllPdfsUrls(browser, current.url, current.year);

      emitter.emit("entity", pdfs);

      return pdfs;
    },
    () => {
      browser.close();
    }
  );
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
