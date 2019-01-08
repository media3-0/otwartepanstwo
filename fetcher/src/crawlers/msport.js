// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const logger = require("../logger");

const MAIN_URL = "http://e-dziennik.msport.gov.pl/";
const SOURCE_NAME = "Elektroniczne Dzienniki Urzędowe Ministra Sportu i Turystyki";

const { formatFromDotToDash } = require("../utils");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

  const YEARS_SELECTOR =
    "body > div > div.container.main-container > div:nth-child(2) > div > div.page-header.clearfix > div.form-inline.form--years > div > select:nth-child(2)";

  const ITEM_SELECTOR =
    "body > div > div.container.main-container > div:nth-child(2) > div > abc-act-grid > div > table > tbody > tr";

  const yearsData = $(YEARS_SELECTOR + " option")
    .map((i, d) => $(d).text())
    .get();

  return new Promise(resolve => {
    async.mapLimit(
      yearsData,
      1,
      async current => {
        logger.debug(`Processing ${current}`);

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
          const watcherForResponse = newPage.waitForResponse(() => true);

          await newPage.select(YEARS_SELECTOR, toSelect.value);

          await watcherForResponse;

          await sleep(5000);

          content = await newPage.content();
          $ = cheerio.load(content);
        }

        const items = flatten(
          $(ITEM_SELECTOR)
            .map((i, d) => {
              const title =
                "zarządzenie " +
                $(d)
                  .find("td.act__item-desc.item-desc-td > a")
                  .text()
                  .trim();
              const date = $(d)
                .find("td.acts__publish-date.ng-binding")
                .text()
                .trim();
              const updatedate = $(d)
                .find("td.acts__date > div > div:nth-child(1) > span")
                .text()
                .trim();
              const url =
                MAIN_URL +
                $(d)
                  .find("td.acts__pdf.text-right > a")
                  .attr("href");

              return {
                title,
                date: formatFromDotToDash(date)
                  .split("-")
                  .reverse()
                  .join("-"),
                updateDate: formatFromDotToDash(updatedate)
                  .split("-")
                  .reverse()
                  .join("-"),
                url,
                sourceName: SOURCE_NAME,
                ocr: false
              };
            })
            .get()
        );

        emitter.emit("entity", items);

        return items;
      },

      async (err, results) => {
        await browser.close();
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
