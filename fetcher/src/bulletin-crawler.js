const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");

const logger = require("./logger");

const { formatFromDotToDashReverse } = require("./utils");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const crawl = async (emitter, MAIN_URL, SOURCE_NAME) => {
  console.log("BANG");
  const browserOpts = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--ignore-certificate-errors",
      "--enable-features=NetworkService"
    ],
    ignoreHTTPSErrors: true,
    dumpio: true,
    ignoreHTTPErrors: true
  };

  const browser = await puppeteer.launch(browserOpts);

  // browser.on("targetcreated", function() {
  //   console.log("New Tab Created", browser.pages());
  // });

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

    console.log(pureHtmlData);

    // const newPagePromise = new Promise(x => {
    //   return browser.once("targetcreated", async target => {
    //     // const url = target.url();
    //     // console.log("URL", url);
    //     const np = await target.page();
    //     // await np.close();

    //     // console.log("Z", z);
    //     return x(np);
    //   })
    // });

    const newPagePromise = new Promise(x => browser.once("targetcreated", target => x(target.page()))); // declare promise

    async.mapLimit(
      pureHtmlData,
      1,
      async (item, cb) => {
        // console.log("#" + item.btnToContentId);
        console.log(item.btnToContentId);
        // const link = await page.$("#" + item.btnToContentId);
        // await link.click();
        await page.click("#" + item.btnToContentId);

        const newPage = await newPagePromise;
        // const newPage = await browser.newPage();
        // await newPage.goto(url, { waitUntil: "networkidle0" });

        // // await newPage.close();
        // const newContent = await newPage.content();
        // // console.log(newContent);
        // // const new$ = cheerio.load(newContent);
        // newPage.close();
        await newPage.close();
        browser.pages().then(d => console.log(d.length));
        return;
        // console.log(">>>>");
        // console.log(url);
        // console.log(new$("#ctl00_ContentPlaceHolder1_lblNumerOgloszenia").text());
        // console.log(">>>>");
      },
      result => {
        console.log("finished", result);
      }
    );
  };

  parseTablePage();

  // const content = await page.content();
  // const $ = cheerio.load(content);

  // // console.log($("body").text());

  // console.log(">>>>>>>>>>");

  // page.click("a.dxp-button.dxp-bi");
  // console.log("WAIT FOR NABV");
  // await sleep(15000);
  // console.log("done");

  // const content2 = await page.content();

  // const $2 = cheerio.load(content2);

  // console.log("<<<<<<<<<<");

  // console.log($2("body").text());

  // page.click("#ctl00_ContentPlaceHolder1_ASPxGridView1_DXCBtn0");

  return new Promise(() => {});

  // const YEARS_SELECTOR = "#year";

  // const ITEM_SELECTOR = "#main-content > div > div > abc-act-grid > div > table > tbody > tr";

  // const yearsData = $(YEARS_SELECTOR + " option")
  //   .map((i, d) => $(d).text())
  //   .get();

  // logger.debug(yearsData);

  // return new Promise(resolve => {
  //   async.mapLimit(
  //     yearsData, //.slice(0, 1),
  //     1,
  //     async current => {
  //       logger.debug(`Processing ${current}`);

  //       const newPage = await browser.newPage();
  //       await newPage.goto(`${MAIN_URL}${MAIN_URL_FIX || ""}`, { waitUntil: "networkidle0" });

  //       let content = await newPage.content();
  //       let $ = cheerio.load(content);

  //       const toSelect = $(YEARS_SELECTOR + " option")
  //         .map((i, d) => ({ label: $(d).text(), value: $(d).val() }))
  //         .get()
  //         .find(d => d.label === current);

  //       const currentlySelected = $(YEARS_SELECTOR).val();

  //       if (currentlySelected !== toSelect.value) {
  //         const watcherForResponse = newPage.waitForResponse(() => true);

  //         await newPage.select(YEARS_SELECTOR, toSelect.value);

  //         await watcherForResponse;

  //         await sleep(1000);

  //         content = await newPage.content();
  //         $ = cheerio.load(content);
  //       }

  //       const links = $(ITEM_SELECTOR)
  //         .map((i, d) => {
  //           return (
  //             MAIN_URL +
  //             $(d)
  //               .find("a.subject")
  //               .attr("href")
  //               .trim()
  //           );
  //         })
  //         .get();

  //       async.mapLimit(
  //         links,
  //         1,
  //         async link => {
  //           const docPage = await browser.newPage();
  //           await docPage.goto(link, { waitUntil: "networkidle0" });

  //           const docContent = await docPage.content();
  //           const doc$ = cheerio.load(docContent);

  //           const title = doc$(".lead.act__item-desc")
  //             .text()
  //             .trim();

  //           const publisher = doc$("#positionSidePanel > div:nth-child(2) > dl > dd")
  //             .text()
  //             .trim();

  //           const keywords = doc$(
  //             "#main-content > div > div:nth-child(3) > div.row > div.col-md-9 > div.anim-opacity > div > a"
  //           )
  //             .map((i, d) =>
  //               doc$(d)
  //                 .text()
  //                 .replace(/\s*\(.*?\)\s*/g, "")
  //                 .trim()
  //                 .toLowerCase()
  //             )
  //             .get();

  //           const url =
  //             MAIN_URL +
  //             doc$(
  //               "#main-content > div > div:nth-child(3) > div.row > div.col-md-9 > abc-act-attachments-list > div > div:nth-child(2) > div.nav-btns.nav-btns--primary > a:nth-child(1)"
  //             ).attr("href");

  //           const date = formatFromDotToDashReverse(
  //             doc$("#positionSidePanel > div:nth-child(1) > ul > li:nth-child(4) > span").text()
  //           );

  //           const entity = { title, publisher, keywords, url, date, sourceName: SOURCE_NAME, ocr: false };

  //           emitter.emit("entity", [entity]);

  //           await docPage.close();
  //         },
  //         async (err, results) => {}
  //       );

  //     },
  //     async (err, results) => {
  //       await browser.close();
  //       resolve(flatten(results));
  //     }
  //   );
  // });
};

module.exports = crawl;
