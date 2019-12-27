const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const async = require("async");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const MAIN_URL = "http://searchbzp.uzp.gov.pl/Search.aspx";

const crawl = async (emitter, SOURCE_NAME) => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);

  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

  const parseTablePage = async () => {
    const tableRowSelector = ".dxgvDataRow_Aqua";

    const content = await page.content();
    const $ = cheerio.load(content);

    const getValueFromRow = row => num =>
      $(row)
        .find(`td:nth-child(${num})`)
        .text();

    const pureHtmlData = $(tableRowSelector)
      .map((i, row) => {
        const getVal = getValueFromRow(row);
        return {
          type: getVal(2),
          date: getVal(4),
          ordererName: getVal(5),
          ordererLocation: getVal(6),
          ordererRegion: getVal(7),
          orderName: getVal(8),
          refNum: getVal(9),
          htmlId: $(row).attr("id"),
          btnToContentId: $(row)
            .find(".dxbButtonSys")
            .attr("id")
        };
      })
      .get();

    let newPagePromise;

    async.mapLimit(
      pureHtmlData,
      1,
      async item => {
        const { btnToContentId, type, date, ordererName, ordererLocation, ordererRegion, orderName, refNum } = item;
        newPagePromise = new Promise(x => browser.once("targetcreated", target => x(target.page()))); // declare promise

        await page.click("#" + btnToContentId);

        const newPage = await newPagePromise;
        const url = newPage.url();
        await sleep(1000);
        const newContent = await newPage.content();
        const new$ = cheerio.load(newContent);
        const content = new$("body")
          .text()
          .trim()
          .replace(/\s\s+/gm, " ");
        await newPage.close();
        return {
          title: orderName,
          url,
          type,
          date,
          sourceName: SOURCE_NAME,
          ordererName,
          ordererLocation,
          ordererRegion,
          refNum,
          content
        };
      },
      async (err, result) => {
        emitter.emit("entity", result);
        await browser.close();
      }
    );
  };

  parseTablePage();
};

module.exports = crawl;
