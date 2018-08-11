const cheerio = require("cheerio");

const parseEnvArray = str => str.split("|");

const simpleDOMListParser = async (browser, url, path, parse, missIndex) => {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  const results = $(path)
    .map((i, link) => {
      if (!!missIndex && i === missIndex) {
        return;
      }
      return parse($(link));
    })
    .get();

  await page.close();

  return results;
};

const simpleDOMGet = async (browser, url, path, parse) => {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });

  const content = await page.content();
  const $ = cheerio.load(content);

  const result = parse($(path));

  await page.close();

  return result;
};

const removeEscapesFromString = str => str.replace(/\\"/g, '"');

const formatFromDotToDash = str => str.replace(/\./g, "-");

module.exports = {
  parseEnvArray,
  simpleDOMListParser,
  simpleDOMGet,
  removeEscapesFromString,
  formatFromDotToDash
};
