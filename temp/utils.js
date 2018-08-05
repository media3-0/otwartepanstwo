const cheerio = require("cheerio");

const simpleDOMListParser = async (browser, url, path, parse, missIndex) => {
  const page = await browser.newPage();
  await page.goto(url);

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
  await page.goto(url);

  const content = await page.content();
  const $ = cheerio.load(content);

  const result = parse($(path));

  await page.close();

  return result;
};

module.exports = { simpleDOMListParser, simpleDOMGet };
