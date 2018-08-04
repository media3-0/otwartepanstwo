const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

const MAIN_URL = "http://ppiop.rcl.gov.pl/?r=skorowidz/index";
const SOURCE_NAME = "ppiop.rcl.gov.pl";

const crawl = async () => {
  const browserOpts = {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL, { waitUntil: "networkidle0" });
  // await page.waitForNavigation();
  console.log("!");
  const content = await page.content();
  const $ = cheerio.load(content);
  // $(".expandable-hitarea").click()
  // await page.waitForSelector("");

  // await Promise.all([$(".expandable-hitarea").click(), page.waitForNavigation(["networkidle2"])]);

  console.log($(".expandable-hitarea").length);

  await page.click(".expandable-hitarea");
  await page.waitForFunction("document.body.className !== 'loading'");
  // await Promise.all([page.waitForFunction("document.body.className !== 'loading'"), ]);

  console.log($(".expandable-hitarea").length);

  await Promise.all([
    await page.click(".expandable-hitarea"),
    page.waitForFunction("document.body.className !== 'loading'")
  ]);
  console.log($(".expandable-hitarea").length);

  await page.click(".expandable-hitarea");
  await page.waitForFunction("document.body.className !== 'loading'");
  console.log($(".expandable-hitarea").length);

  // const expendAll = () => {
  // };
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
