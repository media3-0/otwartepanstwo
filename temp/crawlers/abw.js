const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const async = require("async");

const logger = require("../logger");

const MAIN_URL = "http://www.abw.gov.pl/";
const SOURCE_NAME = "abw";
const NEEDS_OCR_BEFORE = false;

const simpleDOMListParser = async (browser, url, path, parse) => {
  const page = await browser.newPage();
  await page.goto(url);

  const content = await page.content();
  const $ = cheerio.load(content);

  const results = $(path)
    .map((i, link) => parse($(link)))
    .get();

  await page.close();

  return results;
};

const simpleDOMGet = async (browser, url, path, parse) => {
  const page = await browser.newPage();
  await page.goto(url);

  const content = await page.content();
  const $ = cheerio.load(content);

  const result = parse($(path));

  await page.close();

  return result;
};

const crawl = async () => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);

  const years = await simpleDOMListParser(browser, MAIN_URL + "ABW/dziennik", "nav ul li a", data => ({
    url: MAIN_URL + data.attr("href"),
    year: parseInt(data.text())
  }));

  const links = await new Promise((resolve, reject) =>
    async.mapLimit(
      years,
      1,
      async current => {
        return await simpleDOMListParser(
          browser,
          current.url,
          "#table-listing table tbody tr td:nth-child(2) a",
          // This line is because in 2017 there is empty row at the bottom :|
          data => (!!data.text() ? MAIN_URL + data.attr("href") : null)
        );
      },
      async (err, results) => {
        if (err) {
          logger.error(err);
          reject(err);
        }
        resolve(flatten(results));
      }
    )
  );

  return await new Promise((resolve, reject) =>
    async.mapLimit(
      links,
      10,
      async current => {
        logger.debug(`PROCESSING, ${current}`);
        return await simpleDOMGet(browser, current, "#content", node => ({
          title: node.find("#content_roczniki > div:nth-child(2) > ins:nth-child(3)").text(),
          url: MAIN_URL + node.find("#zalaczniki > ul > li:nth-child(1) > a").attr("href"),
          date: node
            .find("#content_roczniki > div:nth-child(1) > ins:nth-child(4) > div.form_text")
            .text()
            .replace(/\./g, "-"),
          sourceName: SOURCE_NAME,
          ocr: false
        }));
      },
      async (err, results) => {
        if (err) {
          logger.error(err);
          reject(err);
        }
        await browser.close();
        logger.debug("FINISHED");
        resolve(flatten(results));
      }
    )
  );
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
