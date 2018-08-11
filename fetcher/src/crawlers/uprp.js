const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { flatten } = require("lodash");
const async = require("async");

const MAIN_URL = "https://www.uprp.pl/dzienniki-urzedowe-urzedu-patentowego-rp/Lead06,66,1242,3,index,pl,text/";
const SOURCE_NAME = "Dziennik Urzędowy Urzędu Patentowego Rzeczypospolitej Polskiej";

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

  const links = flatten(
    $("div.eoPG_1 > div > table").map((i, table) =>
      $(table)
        .find("tr")
        .map((i, d) => {
          if (i < 2) {
            return;
          }

          const $d = $(d);

          const title = $d
            .find("td:nth-child(2)")
            .text()
            .trim();

          const url = $d.find("td:nth-child(4) a:first-child").attr("href");

          const date = $d
            .find("td:nth-child(3)")
            .text()
            .trim()
            .split("-")
            .reverse()
            .join("-");

          return {
            title,
            url,
            date,
            source: SOURCE_NAME
          };
        })
        .get()
    )
  ).filter(_ => !!_);

  await browser.close();

  return new Promise(resolve => resolve(links));
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs;
};
