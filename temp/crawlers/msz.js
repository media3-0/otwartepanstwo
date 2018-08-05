const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const async = require("async");
const range = require("lodash.range");

const logger = require("../logger");
const { simpleDOMListParser, simpleDOMGet, formatFromDotToDash } = require("../utils");

const BASE_URL = "https://www.msz.gov.pl";
const MAIN_URL = `${BASE_URL}/pl/ministerstwo/dziennik_urzedowy/`;
const SOURCE_NAME = "msp";
const getPaginationHref = num => `${MAIN_URL}__rp0x2Content!304312@16575_pageNo/${num}?`;

const crawl = async () => {
  const browserOpts = {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  // const PAGINATION_SELECTOR = "#wyborStron";

  const PAGE_SELECTOR = "#content > section > div.subRight > table > tbody > tr > td:nth-child(2) > a";

  const ITEM_SELECTOR = "#content > section > div.subRight > article";

  const maxPagination = parseInt(
    $("#PContentP304312P16575 > div.bodyPortlet > div > div.contentPaginator > a")
      .eq(-2)
      .text()
  );

  const pagination = range(1, maxPagination + 1);

  console.log(pagination);

  // const pages = await new Promise((resolve, reject) => {
  //   async.mapLimit(
  //     pagination,
  //     1,
  //     async pageNumber => {
  //       const list = await simpleDOMListParser(
  //         browser,
  //         `${MAIN_URL}?page=${pageNumber}`,
  //         PAGE_SELECTOR,
  //         node => BASE_URL + node.attr("href")
  //       );
  //       return list;
  //     },
  //     async (err, results) => {
  //       if (err) {
  //         console.log(err);
  //       }
  //       resolve(flatten(results));
  //     }
  //   );
  // });
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
