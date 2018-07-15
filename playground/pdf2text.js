const extract = require("pdf-text-extract");
const fs = require("fs");

extract("./temp/dziennik3.pdf", { splitPages: false, layout: "raw" }, (err, content) => {
  // console.log(pages);
  fs.writeFileSync("./temp/pdf2text-output.txt", content);
});
