// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const async = require("async");
const fs = require("fs");

const logger = require("../logger");

const MAIN_URL = "http://dziennikmz.mz.gov.pl/";
const SOURCE_NAME = "mz";

const { formatFromDotToDash } = require("../utils");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const crawl = async () => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  const YEARS_SELECTOR =
    "body > div > div.container.main-container > div:nth-child(2) > div > div.page-header.clearfix > div.form-inline.form--years > div > select:nth-child(2)";

  const ITEM_SELECTOR =
    "body > div > div.container.main-container > div:nth-child(2) > div > abc-act-grid > div > table > tbody > tr";

  const yearsData = $(YEARS_SELECTOR + " option")
    .map((i, d) => $(d).text())
    .get();

  return new Promise((resolve, reject) => {
    async.mapLimit(
      yearsData,
      1,
      async current => {
        logger.debug(`Processing page of ${current}`);

        const newPage = await browser.newPage();
        await newPage.goto(MAIN_URL, { waitUntil: "networkidle0" });

        let content = await newPage.content();
        let $ = cheerio.load(content);

        const toSelect = $(YEARS_SELECTOR + " option")
          .map((i, d) => ({ label: $(d).text(), value: $(d).val() }))
          .get()
          .find(d => d.label === current);

        const currentlySelected = $(YEARS_SELECTOR).val();

        if (currentlySelected !== toSelect.value) {
          const watcherForResponse = newPage.waitForResponse(resp => {
            return true;
          });

          await newPage.select(YEARS_SELECTOR, toSelect.value);

          await watcherForResponse;

          await sleep(1000);

          content = await newPage.content();
          $ = cheerio.load(content);
        }
        return flatten(
          $(ITEM_SELECTOR)
            .map((i, d) => {
              const title =
                "zarządzenie " +
                $(d)
                  .find("td.act__item-desc.item-desc-td > a")
                  .text()
                  .trim();
              const date = formatFromDotToDash(
                $(d)
                  .find("td.acts__publish-date.ng-binding")
                  .text()
                  .trim()
              );
              const updatedate = formatFromDotToDash(
                $(d)
                  .find("td.acts__date > div > div:nth-child(1) > span")
                  .text()
                  .trim()
              );
              const source = "cba";
              const url =
                MAIN_URL +
                $(d)
                  .find("td.acts__pdf.text-right > a")
                  .attr("href");
              return { title, date, update_date: updatedate, source, url, source: SOURCE_NAME, ocr: false };
            })
            .get()
        );
      },
      async (err, results) => {
        await browser.close();
        if (err) {
          console.log("err", err);
        }
        resolve(flatten(results));
      }
    );
  });
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
