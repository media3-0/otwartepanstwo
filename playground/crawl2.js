const puppeteer = require('puppeteer');

const toArray = list => [...list];

const getYearsUrls = async page => {
  await page.goto('http://www.dziennikustaw.gov.pl/');
  return await page.evaluate(() => {
    const elements = document.querySelector('#dnn_ctr617_ModuleContent > table > tbody').querySelectorAll('a');
    return [...elements].map(a => ({ url: a.href, year: a.innerText }));
  });
};

const getPaginationIds = async page => {
  return await page.evaluate(() => {
    const elements = document.querySelector('#dnn_ctr490_ViewJournal_trActsScope').querySelectorAll('a');
    return [...elements].map(e => `#${e.id}`);
  });
};

const getPdfsFromPage = async (page, id) => {
  await page.click(id);
  // await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#dnn_ctr490_ViewJournal_wholeTable');
  return await page.evaluate(() => {
    const elements = document
      .querySelector('#dnn_ctr490_ViewJournal_gvActs > tbody')
      .querySelectorAll('tr > td:nth-child(3) > a');
    const result = [...elements].map(a => a.href);
    return result;
  });
};

const getAllPdfsUrls = async (browser, page) => {
  const pagination = await getPaginationIds(page);
  const pdfs = pagination.map(async p => {
    const newPage = await browser.newPage();
    await newPage.goto('http://www.dziennikustaw.gov.pl/DU/2018');
    return await getPdfsFromPage(newPage, p);
  });
  return Promise.all(pdfs);
};

const crawl = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const years = await getYearsUrls(page);
  await page.goto(years[0].url);
  const pdf = await getAllPdfsUrls(browser, page);
  console.log('pdf', pdf);
};

crawl();
