const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const logger = require("../logger");

const MAIN_URL = "https://dziennikurzedowy.knf.gov.pl/";
const SOURCE_NAME = "Dziennik Urzędowy Komisji Nadzoru Finansowego";

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

          await sleep(1000);

          content = await newPage.content();
          $ = cheerio.load(content);
        }

        const list = flatten(
          $(ITEM_SELECTOR)
            .map((i, d) => {
              const title = $(d)
                .find("td.act__item-desc.item-desc-td.item-desc-inline > div > a")
                .text()
                .trim();
              const date = $(d)
                .find("td.acts__publish-date.ng-binding")
                .text()
                .trim()
                .split(".")
                .reverse()
                .join("-");
              const updateDate = $(d)
                .find("td.acts__publish-date.ng-binding")
                .text()
                .trim()
                .split(".")
                .reverse()
                .join("-");
              const url = $(d)
                .find("td.acts__pdf.text-right > a")
                .attr("href");

              return {
                title,
                date,
                updateDate,
                url: `${MAIN_URL}${url}`,
                sourceName: SOURCE_NAME,
                ocr: false
              };
            })
            .get()
        );

        emitter.emit("entity", list);

        return list;
      },
      async (err, results) => {
        await browser.close();

        if (err) {
          return reject(err);
        }

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
