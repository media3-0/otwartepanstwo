const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");

const logger = require("./logger");

const { formatFromDotToDash } = require("./utils");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const crawl = async (emitter, MAIN_URL, SOURCE_NAME, MAIN_URL_FIX) => {
  console.log("H");
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL + MAIN_URL_FIX || "", { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  const YEARS_SELECTOR = "#year";

  const ITEM_SELECTOR = "#main-content > div > div > abc-act-grid > div > table > tbody > tr";

  const yearsData = $(YEARS_SELECTOR + " option")
    .map((i, d) => $(d).text())
    .get();

  logger.debug(yearsData);

  return new Promise(resolve => {
    async.mapLimit(
      yearsData, //.slice(0, 1),
      1,
      async current => {
        logger.debug(`Processing ${current}`);

        const newPage = await browser.newPage();
        await newPage.goto(`${MAIN_URL}${MAIN_URL_FIX || ""}`, { waitUntil: "networkidle0" });

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

        const links = $(ITEM_SELECTOR)
          .map((i, d) => {
            return $(d)
              .find("a.subject")
              .attr("href")
              .trim();
          })
          .get();
        console.log("...");
        console.log("LINKS", links);

        // tu dalej
        // async.mapLimit(
      },
      async (err, results) => {
        await browser.close();
        resolve(flatten(results));
      }
    );
  });
};

module.exports = crawl;
