// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const logger = require("../logger");

const MAIN_URL = "https://e-dziennik.men.gov.pl";
const SOURCE_NAME = "Dziennik Urzędowy Ministra Edukacji Narodowej";

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

  const YEARS_SELECTOR = "#__BVID__11";

  const ITEM_SELECTOR = "#__BVID__13 > tbody > tr";

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

          await sleep(1000);

          content = await newPage.content();
          $ = cheerio.load(content);
        }

        const items = flatten(
          $(ITEM_SELECTOR)
            .map((i, d) => {
              const title = $(d)
                .find("td:nth-child(2)")
                .text();

              const date = $(d)
                .find("td:nth-child(4) > span")
                .text()
                .trim();

              const url = $(d)
                .find("td:nth-child(5) > a")
                .attr("href");

              return {
                title,
                date,
                url: url,
                sourceName: SOURCE_NAME,
                ocr: false
              };
            })
            .get()
        );

        emitter.emit("entity", items);

        return;
      },
      async () => {
        await browser.close();
        resolve();
      }
    );
  });
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
