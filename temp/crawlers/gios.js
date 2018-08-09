const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const async = require("async");

const BASE_URL = "http://edziennik.gios.gov.pl/";
const MAIN_URL = `${BASE_URL}actbyyearmonth.html`;
const SOURCE_NAME = "Dziennik Urzędowy Głównego Inspektoratu Ochrony Środowiska";

const crawlUrl = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  await page.close();

  return $(".linkPdf").attr("href");
};

const crawlYear = async (browser, link) => {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/${link}`, { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  const links = $("#actsTable tr")
    .map((i, d) => {
      if (i === 0) {
        return;
      }

      const $d = $(d);

      const title = $d
        .find("td:nth-child(2)")
        .text()
        .trim();

      const detailUrl = `${BASE_URL}/${$d.find("td:nth-child(2) a").attr("href")}`;

      const date = $d
        .find("td:nth-child(5)")
        .text()
        .trim();

      return {
        title,
        detailUrl,
        date,
        source: SOURCE_NAME
      };
    })
    .get();

  await page.close();

  return new Promise((resolve, reject) =>
    async.mapLimit(
      links,
      3,
      async data => {
        const url = await crawlUrl(browser, data.detailUrl);

        delete data.detailUrl;

        return {
          ...data,
          url
        };
      },
      (err, res) => {
        if (err) {
          return reject(err);
        }

        resolve(res);
      }
    )
  );
};

const crawl = async () => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });
  await page.waitForSelector(".yearMenuDiv");

  const content = await page.content();
  const $ = cheerio.load(content);

  const yearLinks = $(".yearMenuItem a")
    .map((i, d) => $(d).attr("href"))
    .get();

  return new Promise((resolve, reject) =>
    async.mapLimit(
      yearLinks,
      3,
      async yearLink => {
        const urls = await crawlYear(browser, yearLink);
        return urls;
      },
      async (err, urls) => {
        await browser.close();
        if (err) {
          return reject(err);
        }
        resolve(flatten(urls));
      }
    )
  );
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
