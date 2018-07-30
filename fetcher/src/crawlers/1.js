const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const flatten = require("lodash.flatten");
const fs = require("fs");

const getYearsUrls = async page => {
  await page.goto("http://www.dziennikustaw.gov.pl/");
  return await page.evaluate(() => {
    const elements = document.querySelector("#dnn_ctr617_ModuleContent > table > tbody").querySelectorAll("a");
    return [...elements].map(a => ({ url: a.href, year: a.innerText }));
  });
};

const getPaginationIds = async page => {
  return await page.evaluate(() => {
    const elements = document.querySelector("#dnn_ctr490_ViewJournal_trActsScope").querySelectorAll("a");
    return [...elements].map(e => `#${e.id}`);
  });
};

const getPdfsFromPage = async (page, id) => {
  await page.click(id);
  await page.waitForSelector("#dnn_ctr490_ViewJournal_wholeTable");
  const content = await page.content();
  const $ = cheerio.load(content);
  let result = [];
  $("#dnn_ctr490_ViewJournal_wholeTable table tbody tr").each((i, element) => {
    if (i !== 0) {
      const tds = $(element).find("td");
      const title = $(tds.get(1))
        .children("a")
        .text()
        .trim();
      const url = $(tds.get(2))
        .children("a")
        .attr("href");
      const date = $(tds.get(3))
        .children("span")
        .text();

      result.push({
        title,
        url,
        date,
        sourceName: "dziennikiustaw"
      });
    }
  });

  return result;
};

const getAllPdfsUrls = async (browser, page) => {
  const pagination = await getPaginationIds(page);
  const pdfs = pagination.map(async p => {
    const newPage = await browser.newPage();
    await newPage.goto("http://www.dziennikustaw.gov.pl/DU/2018");
    return await getPdfsFromPage(newPage, p);
  });
  return Promise.all(pdfs);
};

const crawl = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  const years = await getYearsUrls(page);
  await page.goto(years[0].url);
  const pdf = await getAllPdfsUrls(browser, page);
  browser.close();
  return flatten(pdf);
};

module.exports = async () => {
  const listOfPdfs = await crawl();
  return listOfPdfs.map(item => ({ ...item, url: `http://www.dziennikustaw.gov.pl${item.url}` }));
};
