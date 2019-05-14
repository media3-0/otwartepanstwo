const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const logger = require("../logger");

const MAIN_URL = "https://dziennikurzedowy.mos.gov.pl";
const SOURCE_NAME = "Dziennik Urzędowy Ministra Środowiska";

const getYearsUrls = async browser => {
  const page = await browser.newPage();
  await page.goto(MAIN_URL);
  const result = await page.evaluate(() => {
    const elements = document.querySelector("#c16360 > div > div > div").querySelectorAll("a");
    return [...elements].map(a => a.href);
  });
  await page.close();

  return result;
};

const getFullUrlsWithPagination = (browser, list) => {
  return new Promise((resolve, reject) => {
    async.mapLimit(
      list,
      1,
      async currentPeriod => {
        const page = await browser.newPage();
        await page.goto(currentPeriod);

        const content = await page.content();
        const $ = cheerio.load(content);

        const urls = $(".f3-widget-paginator > li")
          .not(".next, .current")
          .map((i, li) => {
            const url = $(li)
              .find("a")
              .map((idx, a) => {
                return `${MAIN_URL}/${$(a).attr("href")}`;
              })
              .get();

            return url;
          })
          .get();

        if (urls.length) {
          return [currentPeriod, ...urls];
        }
        return [currentPeriod];
      },
      async (err, result) => {
        resolve(flatten(result));
      }
    );
  });
};

const getPdfsDetailsLinks = (browser, list) => {
  return new Promise((resolve, reject) => {
    async.mapLimit(
      list,
      1,
      async currentUrl => {
        const page = await browser.newPage();
        await page.goto(currentUrl);

        const content = await page.content();
        const $ = cheerio.load(content);

        const result = $(".menu-block.col-xs-12 a")
          .map((i, a) => {
            const url = $(a).attr("href");
            return `${MAIN_URL}/${url}`;
          })
          .get();

        // console.log("RES", result);

        await page.close();

        return result;
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

const getPdfsUrlsWithMetadata = (browser, list) => {
  return new Promise((resolve, reject) => {
    async.mapLimit(
      list,
      1,
      async url => {
        const page = await browser.newPage();
        await page.goto(url);

        const content = await page.content();
        const $ = cheerio.load(content);

        const title = $("h2")
          .text()
          .trim();
        const date = $("p.bip-icon-paperclip")
          .text()
          .trim()
          .split(" ")[1];
        const pdfUrl =
          MAIN_URL +
          "/" +
          $(".file-link")
            .map((i, d) =>
              $(d)
                .parent()
                .attr("href")
            )
            .get()
            .find(d => d.split(".").pop() === "pdf");

        console.log("PDF_URL", pdfUrl);

        return {
          title,
          date,
          url: pdfUrl,
          sourceName: SOURCE_NAME
        };
      },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(flatten(result));
        }
      }
    );
  });
};

const getAllPdfsUrls = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url);

  const content = await page.content();
  const $ = cheerio.load(content);

  const periodUrls = $(".main-bip-content.csc-wrappedbox_pi2 a")
    .map((i, link) => {
      const url = $(link).attr("href");
      return `${MAIN_URL}/${url}`;
    })
    .get();

  await page.close();

  const allPages = await getFullUrlsWithPagination(browser, periodUrls);

  const allDetailsPages = await getPdfsDetailsLinks(browser, allPages);

  const allPdfsUrls = await getPdfsUrlsWithMetadata(browser, allDetailsPages);

  return new Promise(resolve => {
    resolve(allPdfsUrls);
  });
};

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);

  const yearsUrls = await getYearsUrls(browser);

  const results = await async.mapLimit(
    yearsUrls,
    1,
    async currentUrl => {
      logger.debug(`Processing started ${SOURCE_NAME} - ${currentUrl}`);

      const urls = await getAllPdfsUrls(browser, currentUrl);

      emitter.emit("entity", flatten(urls));

      return urls;
    },
    async (err, results) => {
      await browser.close();
      return results;
    }
  );

  return flatten(results);
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
