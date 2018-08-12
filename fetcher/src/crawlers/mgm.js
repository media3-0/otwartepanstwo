// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const { simpleDOMListParser } = require("../utils");

const MAIN_URL = "https://mgm.gov.pl";
const SOURCE_NAME = "Dziennik Urzędowy Ministra Gospodarki Morskiej i Żeglugi Śródlądowej";

const crawl = async emitter => {
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

  return new Promise(resolve => {
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
          sourceName: SOURCE_NAME,
          ocr: false
        }));

        await newPage.close();

        emitter.emit("entity", list);

        return list;
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
