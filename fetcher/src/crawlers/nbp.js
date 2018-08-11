// Generic 2
// BUT THIS DIFFERS - TAKE SELECTORS AS PARAMETER
// MISSING TITLES & UPDATE_DATE
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const fs = require("fs");

const logger = require("../logger");

const MAIN_URL = "https://dzu.nbp.pl/";
const SOURCE_NAME = "nbp";
// TODO: Remmember to append
const APPEND_SUFFIX = "pdf";

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

  const YEARS_SELECTOR = "#year";

  const ITEM_SELECTOR = "#main-content > div > div > abc-act-grid > div > table > tbody > tr";

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
          const watcherForResponse = newPage.waitForResponse(resp => true);

          await newPage.select(YEARS_SELECTOR, toSelect.value);

          await watcherForResponse;

          await sleep(1000);

          content = await newPage.content();
          $ = cheerio.load(content);
        }
        return flatten(
          // THIS DIFFERS
          $(ITEM_SELECTOR)
            .map((i, d) => {
              const title = $(d)
                .find("td.act__item-desc.item-desc-td.item-desc-inline > div > a")
                .text()
                .trim();
              const date = $(d)
                .find("td.acts__publish-date.ng-binding")
                .text()
                .trim();
              const updatedate = $(d)
                .find("#td.acts__publish-date.ng-binding")
                .text()
                .trim();
              const source = "cba";
              const url = $(d)
                .find("td.acts__pdf.text-right > a")
                .attr("href");
              return {
                title,
                date,
                update_date: updatedate,
                source,
                url: `${MAIN_URL}${url}`,
                source: SOURCE_NAME,
                ocr: false
              };
            })
            .get()
        );
      },
      async (err, results) => {
        await browser.close();
        resolve(flatten(results));
      }
    );
  });
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
