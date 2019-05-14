const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten, range } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const BASE_URL = "https://www.bip.ms.gov.pl";
const MAIN_URL = `${BASE_URL}/pl/ministerstwo/dziennik-urzedowy-ministra-sprawiedliwosci/`;
const SOURCE_NAME = "Dziennik Urzędowy Ministerstwa Sprawiedliwości";

const BASE_NEW_URL = "https://www.gov.pl";

const getYearsUrls = async browser => {
  const page = await browser.newPage();
  await page.goto(MAIN_URL);
  const result = await page.evaluate(() => {
    const elements = document
      .querySelector(
        "body > div > div > div > div.pageclass.bip.page > div.outer-container > div > div > div.content > div.main-content.clearfix > div.left > div > div.frame.no-bg.jq-resize > div > div.page-cont.clearfix > div.mapaserwisu > div > ul"
      )
      .querySelectorAll("a");
    return [...elements].map(a => ({ url: a.href, year: parseInt(a.innerText) }));
  });

  await page.close();

  return result;
};

const getAllPdfsUrls = async (browser, url, year) => {
  const page = await browser.newPage();
  await page.goto(url);

  const content = await page.content();
  const $ = cheerio.load(content);

  const pdfs = $(".pliki a")
    .map((i, link) => {
      const url = BASE_URL + $(link).attr("href");
      const title = $(link)
        .text()
        .trim();
      const date = `${year}-01-01`;
      return { url, title, date, sourceName: SOURCE_NAME };
    })
    .get();

  await page.close();

  return new Promise(resolve => {
    resolve(pdfs);
  });
};

const getAllNewPdfsUrls = async (browser, url, year) => {
  return new Promise(async (resolve, reject) => {
    const page = await browser.newPage();
    await page.goto(url);

    const content = await page.content();
    const $ = cheerio.load(content);

    const maxPage = $(
      "#portlet_pl_gov_mc_ism_articlelist_ArticleListPortlet_INSTANCE_3mqpMwRDTp33 > div > div > div > div.main-column > div.common_pager > a:nth-child(4)"
    )
      .text()
      .split(" ")
      .pop();

    const maxPageInt = parseInt(maxPage);

    const links = range(1, maxPageInt + 1).map(num => `${url}?page=${num}`);

    await page.close();

    await async.mapLimit(
      links,
      1,
      async current => {
        const page = await browser.newPage();
        await page.goto(current);

        const content = await page.content();
        const $ = cheerio.load(content);

        const urls = $(".article_link a")
          .map((i, d) => BASE_NEW_URL + $(d).attr("href"))
          .get();

        await page.close();

        return urls;
      },
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(flatten(results));
        }
      }
    );
  });
};

const getAllNewPdfsData = async (browser, list, year) => {
  return new Promise(async (resolve, reject) => {
    async.mapLimit(
      list,
      1,
      async current => {
        const page = await browser.newPage();
        await page.goto(current);

        const content = await page.content();
        const $ = cheerio.load(content);

        const title = $(".lead")
          .text()
          .trim();
        const date = `${year}-01-01`;
        const pdfUrl = BASE_NEW_URL + $("a.file-link").attr("href");

        await page.close();

        const r = { title, date, url: pdfUrl, sourceName: SOURCE_NAME };

        console.log(r);
        return r;
      },
      (err, result) => {
        resolve(flatten(result));
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

  const yearsUrls = await getYearsUrls(browser);
  const oldYears = yearsUrls.slice(1);
  // TODO: This might be smarter as 2020 will come
  const newYears = yearsUrls.slice(0, 1);

  async.mapLimit(
    oldYears,
    1,
    async current => {
      const pdfs = await getAllPdfsUrls(browser, current.url, current.year);

      emitter.emit("entity", pdfs);

      return pdfs;
    },
    () => {
      async.mapLimit(
        newYears,
        1,
        async current => {
          const pdfs = await getAllNewPdfsUrls(browser, current.url, current.year);
          const data = await getAllNewPdfsData(browser, pdfs, current.year);
          emitter.emit("entity", data);
        },
        () => {
          browser.close();
        }
      );
    }
  );
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
