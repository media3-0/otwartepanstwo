const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
pdfParser.on('pdfParser_dataReady', pdfData => {
  fs.writeFile('./temp/pdf.json', JSON.stringify(pdfData));
  fs.writeFile('./temp/pdf.txt', pdfParser.getRawTextContent());
});

pdfParser.loadPDF('./temp/dziennik.pdf');
