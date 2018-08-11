const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const { simpleDOMListParser, simpleDOMGet } = require("../utils");

const MAIN_URL = "http://bip.gitd.gov.pl/dziennik-urzedowy-gitd";
const SOURCE_NAME = "Dziennik Urzędowy Głównego Inspektoratu Transportu Drogowego";

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

  const YEARS_SELECTOR = "#lhs_content > ul > li > a";

  const ITEM_SELECTOR = "#lhs_content > table > tbody > tr";

  const yearsData = $(YEARS_SELECTOR)
    .map((i, d) => $(d).attr("href"))
    .get();

  console.log(yearsData);

  return new Promise(async (resolve, reject) => {
    async.mapLimit(
      yearsData,
      1,
      async currentYearUrl => {
        const entity = await simpleDOMListParser(browser, currentYearUrl, ITEM_SELECTOR, node => ({
          title: node.find("td:nth-child(2) a").text(),
          url: node
            .find("td:nth-child(2) a")
            .first()
            .attr("href"),
          date: node.find("td:nth-child(3)").text(),
          sourceName: SOURCE_NAME
        }));

        emitter.emit("entity", entity);

        return entity;
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
