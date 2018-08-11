const async = require("async");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { flatten } = require("lodash");
const logger = require("../logger");
const { EventEmitter } = require("events");

const BASE_URL = "http://ppiop.rcl.gov.pl";
const MAIN_URL = `${BASE_URL}/?r=orzeczenia/index`;
const SOURCE_NAME = "Orzeczenia Trybunału Konstytucyjnego";

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

  const pagesList = $(".yiiPager .page a")
    .map((i, d) => $(d).attr("href"))
    .get();

  return new Promise((resolve, reject) => {
    async.mapLimit(
      pagesList,
      5,
      async url => {
        const newPage = await browser.newPage();
        await newPage.goto(`${BASE_URL}/${url}`, { waitUntil: "networkidle0" });
        await page.waitForSelector(".grid_table");

        const content = await page.content();
        const $ = cheerio.load(content);

        const data = $("tr")
          .map((i, d) => {
            const $d = $(d);

            const dataStr = $d
              .find(".orzeczenie_col01")
              .text()
              .trim();

            const maybeDates = dataStr.match(/(\d{4})-(\d{2})-(\d{2})/g);
            const date = maybeDates && maybeDates.length > 0 ? maybeDates[0] : undefined;

            if (!date) {
              logger.debug(`can't find date for: ${url} (${dataStr})`);
            }

            const urls = $d.find(".orzeczenie_col04 a").map((i, d) => {
              const title = $(d)
                .text()
                .trim();

              const url = $(d).attr("href");

              return {
                title,
                url,
                date,
                sourceName: SOURCE_NAME,
                ocr: false
              };
            });

            return flatten(urls);
          })
          .get();

        await newPage.close();

        emitter.emit("entity", data);

        return data;
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
