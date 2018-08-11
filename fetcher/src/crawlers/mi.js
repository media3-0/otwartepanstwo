// Generic 2
const puppeteer = require("puppeteer");
const { EventEmitter } = require("events");

const { simpleDOMListParser } = require("../utils");

const MAIN_URL = "https://dziennikurzedowy.mi.gov.pl/";
const SOURCE_NAME = "Dziennik Urzędowy Ministra Infrastruktury";

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);
  const page = await browser.newPage();
  await page.goto(MAIN_URL + "/du", { waitUntil: "networkidle0" });

  const ITEM_SELECTOR =
    "#g-main > div > div:nth-child(4) > div > div > div > div > div > div > div > div > table > tbody > tr";

  return new Promise(async resolve => {
    const result = await simpleDOMListParser(browser, MAIN_URL, ITEM_SELECTOR, node => ({
      title: node
        .find("td:nth-child(2)")
        .text()
        .trim(),
      date: node
        .find("td:nth-child(4)")
        .text()
        .trim(),
      url: node
        .find("td:nth-child(3) a")
        .first()
        .attr("href"),
      sourceName: SOURCE_NAME,
      ocr: false
    }));

    emitter.emit("entity", result);

    resolve(result);
    await browser.close();
  });
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
