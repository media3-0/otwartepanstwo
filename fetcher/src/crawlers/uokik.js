const puppeteer = require("puppeteer");
const { simpleDOMListParser } = require("../utils");
const { EventEmitter } = require("events");

const BASE_URL = "http://www.uokik.gov.pl";
const MAIN_URL = `${BASE_URL}/dzienniki_urzedowe_uokik2.php`;
const SOURCE_NAME = "Dzienniki Urzędowe UOKiK";

const crawl = async emitter => {
  const browserOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  const browser = await puppeteer.launch(browserOpts);

  const ITEM_SELECTOR = "#subpage > div > div > ul > li";

  return new Promise(async resolve => {
    const page = await browser.newPage();
    await page.goto(MAIN_URL, { waitUntil: "networkidle0" });

    const list = await simpleDOMListParser(browser, MAIN_URL, ITEM_SELECTOR, node => ({
      title: node
        .find("a")
        .text()
        .trim(),
      url: BASE_URL + node.find("a").attr("href"),
      sourceName: SOURCE_NAME,
      date: `01-0${node
        .find("a")
        .text()
        .trim()
        .slice(-6)
        .replace("/", "-")}`
        .split("-")
        .reverse()
        .join("-")
    }));

    emitter.emit("entity", list);

    await browser.close();

    resolve(list);
  });
};

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter);
  return emitter;
};
