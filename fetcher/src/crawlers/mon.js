// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const { simpleDOMListParser, simpleDOMGet } = require("../utils");

const MAIN_URL = "http://www.dz.urz.mon.gov.pl";
const SOURCE_NAME = "Dziennik Urzędowy Ministerstwa Obrony Narodowej";

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  const YEARS_SELECTOR = "#lista-all > div > div > a";

  const PAGE_SELECTOR = "#srodek > table > tbody > tr > td > div > a";

  const ITEM_SELECTOR = "#srodek";

  const yearsData = $(YEARS_SELECTOR)
    .map((i, d) => $(d).attr("href"))
    .get();

  const pages = await new Promise(async (resolve, reject) => {
    async.mapLimit(
      yearsData,
      1,
      async currentYear => {
        const list = await simpleDOMListParser(
          browser,
          MAIN_URL + currentYear,
          PAGE_SELECTOR,
          node => MAIN_URL + node.attr("href")
        );
        // resolve(list.slice(1));
        return list;
      },
      async (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(flatten(results));
      }
    );
  });

  return new Promise(async (resolve, reject) => {
    async.mapLimit(
      pages,
      8,
      async pageUrl => {
        const data = await simpleDOMGet(browser, pageUrl, ITEM_SELECTOR, node => ({
          title: node.find("table:nth-child(2) > tbody > tr.t-pozycja-a > td:nth-child(2) > div > span").text(),
          date: node
            .find("table:nth-child(2) > tbody > tr.t-pozycja-a > td:nth-child(4)")
            .text()
            .split(".")
            .join("-"),
          url: MAIN_URL + node.find("#pozycja-zalaczniki > li > a").attr("href"),
          sourceName: SOURCE_NAME
        }));

        emitter.emit("entity", [data]);

        return data;
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

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
