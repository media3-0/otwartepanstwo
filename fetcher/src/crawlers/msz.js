const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten, range } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const { simpleDOMListParser, formatFromDotToDash } = require("../utils");

const BASE_URL = "https://www.msz.gov.pl";
const MAIN_URL = `${BASE_URL}/pl/ministerstwo/dziennik_urzedowy/`;
const SOURCE_NAME = "Dziennik Urzędowy Ministra Spraw Zagranicznych";
const getPaginationHref = num => `${MAIN_URL}__rp0x2Content!304312@16575_pageNo/${num}?`;

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

  // const PAGINATION_SELECTOR = "#wyborStron";

  const ITEM_SELECTOR = "#PContentP304312P16575 > div.bodyPortlet > div > div:nth-child(2) > div > table > tbody > tr";

  const maxPagination = parseInt(
    $("#PContentP304312P16575 > div.bodyPortlet > div > div.contentPaginator > a")
      .eq(-2)
      .text()
  );

  const pagination = range(1, maxPagination + 1);

  return new Promise(resolve => {
    async.mapLimit(
      pagination,
      1,
      async pageNumber => {
        const list = await simpleDOMListParser(browser, getPaginationHref(pageNumber), ITEM_SELECTOR, node => ({
          title: node.find("td:nth-child(1) a").text(),
          url: BASE_URL + node.find("td:nth-child(1) a").attr("href"),
          date: formatFromDotToDash(node.find("td:nth-child(2) > p").text()),
          sourceName: SOURCE_NAME
        }));

        emitter.emit("entity", list);

        return list;
      },
      async (err, results) => {
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
