const fs = require("fs");
const PDFParser = require("pdf2json");

const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", errData => console.error("ERROR", errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
  console.log(pdfData);
  fs.writeFile("./temp/pdf3.json", JSON.stringify(pdfData));
  fs.writeFile("./temp/pdf3.txt", pdfParser.getRawTextContent());
});

pdfParser.loadPDF("./temp/dziennik3.pdf");
