// Generic 2
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");
const { EventEmitter } = require("events");

const logger = require("../logger");

const BASE_URL = "http://bip.mkidn.gov.pl";
const MAIN_URL = `${BASE_URL}/pages/dzienniki-urzedowe-mkidn/dziennik-urzedowy-2018.php`;
const SOURCE_NAME = "Ministerstwo Kultury i Dziedzictwa Narodowego";
const APPEND_SUFFIX = "pdf";

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

  const YEARS_SELECTOR = "#col180_bip > div > ul.menu-top > li > a";

  // const ITEM_SELECTOR = "body > app > div > main > div > home > journal-display-list > table > tbody > tr";

  const yearsData = $(YEARS_SELECTOR)
    .map((i, d) => ({
      year: $(d)
        .text()
        .split(" ")[2],
      url: $(d).attr("href")
    }))
    .get();

  return new Promise((resolve, reject) => {
    async.mapLimit(
      yearsData.filter(d => parseInt(d.year) >= 2013),
      1,
      async current => {
        logger.debug(`Processing page of ${current.year}`);

        const newPage = await browser.newPage();
        await newPage.goto(`${BASE_URL}${current.url}`, { waitUntil: "networkidle0" });

        let content = await newPage.content();
        let $ = cheerio.load(content);

        if (parseInt(current.year) >= 2013) {
          const result = $("#col740_bip > div > form > table > tbody > tr")
            .map((i, d) => ({
              sourceName: SOURCE_NAME,
              title: $(d)
                .find("td:nth-child(2) > p")
                .text()
                .trim(),
              date: $(d)
                .find("td:nth-child(3)")
                .text(),
              url: `${BASE_URL}${$(d)
                .find("td:nth-child(4) > a")
                .attr("href")}`
            }))
            .get();
          emitter.emit("entity", result);
          return result;
        }
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

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
