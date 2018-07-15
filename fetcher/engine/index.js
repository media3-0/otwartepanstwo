// const crawler = require("./crawlers/1");
const fs = require("fs");
const crypto = require("crypto");
const async = require("async");
const http = require("http");

const pdfExtractor = require("pdf-text-extract");

(async () => {
  const readOneFile = (path, callback) => {
    pdfExtractor(path, { splitPages: false, layout: "raw" }, (err, content) => {
      if (err) {
        console.log("error from PDF PARSER", err);
      } else {
        callback(content);
      }
      // const pdfParser = new PDFParser(null, 1);
      // pdfParser.on("pdfParser_dataReady", pdfData => {
      //   console.log(pdfData.formImage.Pages.length);
      //   const text = pdfParser.getRawTextContent();
      //   callback(text);
      // });
      // pdfParser.loadPDF(path);
    });
  };

  const data = JSON.parse(fs.readFileSync("./data2.json", "utf8")).filter(
    item =>
      !!item.url &&
      !!item.date &&
      item.url
        .split("/")
        .slice(-1)[0]
        .split(".")
        .slice(-1)[0] === "pdf"
  );

  const result = data.map(item => {
    return {
      ...item,
      hash: crypto
        .createHash("md5")
        .update(item.url)
        .digest("hex")
    };
  });

  async.mapLimit(
    result,
    10,
    (current, next) => {
      const url = "http://www.dziennikustaw.gov.pl" + current.url;
      const file = fs.createWriteStream(`./files/${current.hash}.pdf`);
      console.log(`>> PROCESSING ${url} / ${current.hash}.pdf`);

      http.get(url, response => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(() =>
            readOneFile(`./files/${current.hash}.pdf`, parsedText => {
              next(null, {
                ...current,
                content: parsedText
              });
            })
          );
        });
      });
    },

    (err, results) => {
      if (err) {
        console.error("err", err);
      } else {
        console.log("written!");
        fs.writeFileSync("./raport.json", JSON.stringify(results));
      }
    }
  );
})();
