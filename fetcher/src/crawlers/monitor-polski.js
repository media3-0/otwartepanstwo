const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const logger = require("../logger");

const MAIN_URL = "http://www.monitorpolski.gov.pl/";
const SOURCE_NAME = "Dziennik Urzędowy Rzeczypospolitej Polskiej";

const getYearsUrls = async browser => {
  const page = await browser.newPage();
  await page.goto(MAIN_URL);
  const result = await page.evaluate(() => {
    const elements = document.querySelector("#dnn_ctr617_ModuleContent > table > tbody").querySelectorAll("a");
    return [...elements].map(a => ({ url: a.href, year: parseInt(a.innerText) }));
  });
  await page.close();

  return result;
};

const getPaginationIds = async page => {
  return await page.evaluate(() => {
    const elements = document.querySelector("#dnn_ctr490_ViewJournal_trActsScope").querySelectorAll("a");
    return [...elements].map(e => `#${e.id}`);
  });
};

const getPdfsFromPage = async (page, id) => {
  await page.click(id);
  await page.waitForSelector("#dnn_ctr490_ViewJournal_wholeTable");
  const content = await page.content();
  const $ = cheerio.load(content);
  let result = [];

  logger.debug(`Processing ${id}`);

  $("#dnn_ctr490_ViewJournal_wholeTable table tbody tr").each((i, element) => {
    if (i !== 0) {
      const tds = $(element).find("td");
      const title = $(tds.get(1))
        .children("a")
        .text()
        .trim();
      const url = $(tds.get(2))
        .children("a")
        .attr("href");
      const date = $(tds.get(3))
        .children("span")
        .text();

      result.push({
        title,
        url: MAIN_URL + url,
        date,
        sourceName: SOURCE_NAME
      });
    }
  });

  return result;
};

const getAllPdfsUrlsFromNewerPage = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url);
  const pagination = await getPaginationIds(page);
  await page.close();
  return new Promise(resolve => {
    async.mapLimit(
      pagination,
      5,
      async currentPage => {
        const newPage = await browser.newPage();
        await newPage.goto(url);
        try {
          const currentResult = await getPdfsFromPage(newPage, currentPage);
          await newPage.close();
          // await sleep(1000);
          return currentResult;
        } catch (error) {
          logger.error(`Error while parsing pagination: ${currentPage}. Error: ${error}`);
          return [];
        }
      },
      (err, results) => {
        if (err) {
          logger.error(err);
        } else {
          resolve(results);
        }
      }
    );
  });
};

const getAllPdfsUrlsFromOlderPage = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector("#dnn_ctr490_ViewJournal_JournalList_gvJournalList");

  const content = await page.content();
  const $ = cheerio.load(content);

  const pageUrls = $("#dnn_ctr490_ViewJournal_JournalList_gvJournalList tr td:nth-child(3) div a")
    .map((i, link) => {
      return $(link).attr("href");
    })
    .get();

  await page.close();

  return new Promise((resolve, reject) => {
    async.mapLimit(
      pageUrls,
      3,
      async current => {
        logger.debug(`Processing ${current}`);

        const newPage = await browser.newPage();
        await newPage.goto(MAIN_URL + current);
        const content = await newPage.content();
        const $ = cheerio.load(content);
        const name = $("#dnn_ctr491_ViewAct_tableWhole h2")
          .text()
          .trim();
        const date = $("#dnn_ctr491_ViewAct_lblPublishDate").text();
        const url = $("#dnn_ctr491_ViewAct_trFile td:nth-child(2) a")
          .first()
          .attr("href");
        await newPage.close();
        return {
          name,
          date,
          url: MAIN_URL + url,
          sourceName: SOURCE_NAME
        };
        // return { a: "b" };
      },
      (err, results) => {
        if (err) {
          logger.error("!", err);
          reject(err);
        }
        resolve(results);
      }
    );
  });
};

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch({});

  const years = await getYearsUrls(browser);
  const filteredYears = years; //.filter(d => d.year === 2011);

  await browser.close();

  const pdfs = async.eachSeries(filteredYears, async current => {
    logger.debug(`Processing started ${SOURCE_NAME} - ${current.year} - ${current.url}`);

    const browser = await puppeteer.launch(browserOpts);
    const result =
      current.year <= 2011
        ? await getAllPdfsUrlsFromOlderPage(browser, current.url)
        : await getAllPdfsUrlsFromNewerPage(browser, current.url);

    await browser.close();

    logger.debug(`Processing finished ${current.year} - ${current.url}`);

    emitter.emit("entity", flatten(result));

    return flatten(list);
  });

  return flatten(pdfs);
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
