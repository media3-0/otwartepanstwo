const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { EventEmitter } = require("events");
const leftPad = require("left-pad");

const BASE_URL = "http://www.gdos.gov.pl/";
const MAIN_URL = `${BASE_URL}dziennik-urzedowy-gdos/`;
const SOURCE_NAME = "Dziennik Urzędowy Generalnej Dyrekcji Ochrony Środowiska";

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

  const links = $("tr")
    .map((i, d) => {
      if (i === 0) {
        return;
      }

      const $d = $(d);

      const title = $d
        .find("td:nth-child(2)")
        .text()
        .trim();

      const url = $d.find("td:nth-child(4) a").attr("href");

      const date = $d
        .find("td:nth-child(3)")
        .text()
        .trim()
        .replace(" r.", "")
        .split(".")
        .map(n => leftPad(n, 2, "0"))
        .reverse()
        .join("-");

      return {
        title,
        url: BASE_URL + url,
        date,
        sourceName: SOURCE_NAME
      };
    })
    .get()
    .filter(_ => !!_);

  emitter.emit("entity", links);

  await browser.close();

  return new Promise(resolve => resolve(links));
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
