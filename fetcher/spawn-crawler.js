const crawlerPath = process.argv[2];

const crawler = require(crawlerPath);

(async () => {
  const data = await crawler();
  const filteredData = data.filter(
    item =>
      !!item.url &&
      !!item.date &&
      item.url
        .split("/")
        .slice(-1)[0]
        .split(".")
        .slice(-1)[0] === "pdf"
  );

  if (process.send) {
    process.send(filteredData);
  }
})();
