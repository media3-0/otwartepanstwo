const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");
const leftPad = require("left-pad");

const { simpleDOMListParser, removeEscapesFromString } = require("../utils");

const MAIN_URL = "http://dziennikurzedowy.mpit.gov.pl/";
const SOURCE_NAME = "Dziennik Urzędowy Ministra Przedsiębiorczości i Technologii";

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
        const result = await simpleDOMListParser(browser, MAIN_URL + currentYear, ITEM_SELECTOR, node => ({
          title: removeEscapesFromString(node.find("td:nth-child(2)").text()),
          url:
            MAIN_URL +
            node
              .find("td:nth-child(3) a")
              .first()
              .attr("href"),
          date: node
            .find("td:nth-child(4)")
            .text()
            .trim()
            .split(".")
            .map(n => (n.length < 2 ? leftPad(n, 2, "0") : n))
            .reverse()
            .join("-"),
          sourceName: SOURCE_NAME
        }));

        emitter.emit("entity", result);

        return result;
      },
      async (err, results) => {
        await browser.close();
        if (err) {
          return reject(err);
        }
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
