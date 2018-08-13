const async = require("async");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { flatten } = require("lodash");
const { EventEmitter } = require("events");
const logger = require("../logger");

const BASE_URL = "https://eur-lex.europa.eu";
const SOURCE_NAME = "Dziennik Urzędowy Unii Europejskiej";

const makeUrl = (year = "2018") => `${BASE_URL}/oj/${year}/direct-access.html?locale=pl`;

const IS_DEV = false;
const MAIN_URL = makeUrl();

const crawlLink = async (browser, link) => {
  const newPage = await browser.newPage();
  await newPage.goto(`${BASE_URL}/${link}`, { waitUntil: "networkidle0" });
  await newPage.waitForSelector(".languageBar");

  const content = await newPage.content();
  const $ = cheerio.load(content);

  const pdfLinks = $(".languageBar tr.odd a")
    .map((i, d) => $(d).attr("href"))
    .get();

  await newPage.close();

  const title = $("#translatedTitle")
    .text()
    .trim();

  const plLink = pdfLinks.find(href => href.includes("/PL/TXT/PDF/"));

  return {
    url: `${BASE_URL}/${plLink}`.replace("./../../../", ""),
    title,
    sourceName: SOURCE_NAME,
    ocr: false
  };
};

const crawlTable = async (browser, $, emitter) => {
  const list = $("tbody tr")
    .map((i, d) => {
      const $d = $(d);

      const domDate = $d
        .find("td:first-child")
        .text()
        .trim()
        .split("/");

      const date = `${domDate[2]}-${domDate[1]}-${domDate[0]}`;

      const links = $d
        .find("a")
        .map((i, a) => $(a).attr("href"))
        .get();

      return { date, links };
    })
    .get();

  const flatList = flatten(
    list.reduce((memo, d) => {
      return [
        ...memo,
        d.links.map(link => ({
          date: d.date,
          link
        }))
      ];
    }, [])
  );

  return new Promise(resolve =>
    async.mapLimit(
      IS_DEV ? flatList.slice(0, 2) : flatList,
      3,
      async ({ date, link }) => {
        const linkData = await crawlLink(browser, link);

        emitter.emit("entity", [{ date, ...linkData }]);

        return;
      },
      () => {
        resolve();
      }
    )
  );
};

const crawlPagination = async (url, browser, emitter) => {
  const basePage = await browser.newPage();
  await basePage.goto(url, { waitUntil: "networkidle0" });
  await basePage.waitForSelector(".pagination");

  const content = await basePage.content();
  const $ = cheerio.load(content);

  const lastPage = $(".pagination a img")
    .map((i, img) => ({
      src: $(img).attr("src"),
      alt: $(img).attr("alt")
    }))
    .get()
    .find(({ src }) => src.endsWith("last.png")).alt;

  const pagesCount = Array.from({ length: parseInt(lastPage) }).map((_, i) => i + 1);

  return new Promise((resolve, reject) => {
    async.mapLimit(
      IS_DEV ? pagesCount.slice(0, 2) : pagesCount,
      3,
      async pageIdx => {
        const pageUrl = `${url}&page=${pageIdx}`;

        logger.debug(`Opening: ${pageUrl}`);

        const newPage = await browser.newPage();
        await newPage.goto(pageUrl, { waitUntil: "networkidle0" });
        await newPage.waitForSelector("tbody");

        const content = await newPage.content();
        const $ = cheerio.load(content);

        await crawlTable(browser, $, emitter);

        await newPage.close();

        return;
      },
      async err => {
        await basePage.close(url);

        if (err) {
          return reject(err);
        }

        resolve();
      }
    );
  });
};

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

  await page.waitForSelector(".pagination");

  const content = await page.content();
  const $ = cheerio.load(content);

  const years = $("#yearOJSelect option")
    .map((i, d) => $(d).val())
    .get();

  return new Promise(resolve =>
    async.mapLimit(
      years,
      1,
      async year => {
        const url = makeUrl(year);

        logger.debug(`Opening: ${url}`);

        await crawlPagination(url, browser, emitter);

        return;
      },
      async () => {
        await browser.close();
        resolve();
      }
    )
  );
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
