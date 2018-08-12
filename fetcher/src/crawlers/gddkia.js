const async = require("async");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { EventEmitter } = require("events");
const leftPad = require("left-pad");

const logger = require("../logger");

const BASE_URL = "https://www.gddkia.gov.pl";
const MAIN_URL = `${BASE_URL}/pl/2448/Dziennik-Urzedowy-GDDKiA/`;
const SOURCE_NAME = "Dziennik Urzędowy GDDKiA";

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

  const pages = $('nav > ul > li > ul > li.current > ul > li > a.sf-with-ul:contains("Rok ")').map((i, d) => {
    return $(d).attr("href");
  });

  return new Promise((resolve, reject) => {
    async.mapLimit(
      pages,
      2,
      async page => {
        const url = `${BASE_URL}${page}`;

        logger.debug(`Processing ${url}`);

        const newPage = await browser.newPage();
        await newPage.goto(url, { waitUntil: "networkidle0" });
        const content = await newPage.content();
        const $ = cheerio.load(content);

        const links = $("tr")
          .map((i, d) => {
            if (i === 0) {
              return;
            }

            const $d = $(d);

            const title = $d
              .find("td:nth-child(2)")
              .text()
              .trim();

            const url = $d.find("td:nth-child(4) a").attr("href");

            const date = $d
              .find("td:nth-child(3)")
              .text()
              .trim()
              .split(".")
              .reverse()
              .map(n => leftPad(n, 2, "0"))
              .join("-");

            return {
              title,
              url,
              date,
              sourceName: SOURCE_NAME
            };
          })
          .get()
          .filter(_ => !!_);

        await newPage.close();
        emitter.emit("entity", links);
      },
      async (err, res) => {
        await browser.close();

        if (err) {
          return reject(err);
        }

        resolve(res);
      }
    );
  });
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
