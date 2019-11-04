const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");

const logger = require("./logger");

const { formatFromDotToDashReverse } = require("./utils");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const crawl = async (emitter, MAIN_URL, SOURCE_NAME, MAIN_URL_FIX) => {
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
            return (
              MAIN_URL +
              $(d)
                .find("a.subject")
                .attr("href")
                .trim()
            );
          })
          .get();
        console.log("LINKS", links);

        async.mapLimit(
          links,
          1,
          async link => {
            console.log("LINK", link);
            const docPage = await browser.newPage();
            await docPage.goto(link, { waitUntil: "networkidle0" });
            console.log("!!!!");

            const docContent = await docPage.content();
            const doc$ = cheerio.load(docContent);

            const title = doc$(".lead.act__item-desc")
              .text()
              .trim();

            const publisher = doc$("#positionSidePanel > div:nth-child(2) > dl > dd")
              .text()
              .trim();

            const keywords = doc$(
              "#main-content > div > div:nth-child(3) > div.row > div.col-md-9 > div.anim-opacity > div > a"
            )
              .map((i, d) =>
                doc$(d)
                  .text()
                  .replace(/\s*\(.*?\)\s*/g, "")
                  .trim()
                  .toLowerCase()
              )
              .get();

            const url =
              MAIN_URL +
              doc$(
                "#main-content > div > div:nth-child(3) > div.row > div.col-md-9 > abc-act-attachments-list > div > div:nth-child(2) > div.nav-btns.nav-btns--primary > a:nth-child(1)"
              ).attr("href");

            const date = formatFromDotToDashReverse(
              doc$("#positionSidePanel > div:nth-child(1) > ul > li:nth-child(4) > span").text()
            );

            const entity = { title, publisher, keywords, url, date, sourceName: SOURCE_NAME, ocr: false };

            console.log(entity);

            emitter.emit("entity", [entity]);

            await docPage.close();
          },
          async (err, results) => {}
        );

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
