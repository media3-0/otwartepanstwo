const React = require("react");
const autoBind = require("react-autobind");
const { Document, Page } = require("react-pdf");

const { buildPdfUrl, formatDate, allIndexOf } = require("./utils");

class SearchPanel extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);

    this.state = { searchWord: "", results: [] };
  }

  setSearch(value) {
    this.setState({ searchWord: value });
  }

  handleSearch() {
    const { pagesContent } = this.props;
    const { searchWord } = this.state;

    this.props.setSearchHighlight(searchWord);

    if (!searchWord) {
      this.setState({ results: [] });
      return;
    }

    const res = Object.keys(pagesContent).reduce((acc, pageNum) => {
      const pageContent = pagesContent[pageNum];
      if (pageContent.includes(searchWord)) {
        const count = (pageContent.match(new RegExp(searchWord, "gi")) || []).length;
        return acc.concat({ pageNum, count });
      }
      return acc;
    }, []);

    this.setState({ results: res });

    // TODO: this is for handling preview
    // // const res = Object.values(this.props.pagesContent.reduce((acc, pageContent
    // const res = Object.keys(pageContent).reduce((acc, pageNum) => {
    //   const pageContent = pagesContent[pageNum];
    //   if (pageContent.includes(searchWord)) {
    //     const indexes = allIndexOf(pageContent, searchWord);
    //     const
    //   }
    // }, []);
  }

  render() {
    const { searchWord } = this.state;
    const { jumpToPage } = this.props;
    return (
      <div className="">
        <input
          type="text"
          value={searchWord}
          onChange={ev => this.setSearch(ev.target.value)}
          onKeyPress={event => {
            if (event.key === "Enter") {
              this.handleSearch();
            }
          }}
        />
        <ul>
          {this.state.results.map((result, idx) => (
            <li onClick={() => jumpToPage(result.pageNum)} key={idx}>
              <div>Strona: {result.pageNum}</div>
              <div>Liczba wystąpień: {result.count}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

class PDFViewer extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);

    this.state = {
      numPages: null,
      pageNumber: 1,
      cachedPageHeights: null,
      pagesContent: null,
      searchHighlight: null
    };

    this._mounted = false;
    this.scale = 1.2;
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  cachePdfData(pdf) {
    const promises = Array.from({ length: pdf.numPages }, (v, i) => i + 1).map(pageNumber => pdf.getPage(pageNumber));

    // Assuming all pages may have different heights. Otherwise we can just
    // load the first page and use its height for determining all the row
    // heights.
    Promise.all(promises).then(values => {
      if (!this._mounted) {
        return null;
      }

      const pageHeights = values.reduce((accPageHeights, page) => {
        accPageHeights[page.pageIndex + 1] = page.pageInfo.view[3] * this.scale;
        return accPageHeights;
      }, {});

      const contentPromises = values.map(page => page.getTextContent());

      Promise.all(contentPromises).then(resolvedPageContentPromises => {
        const pagesContent = resolvedPageContentPromises.reduce((accPageContents, pageContent, idx) => {
          accPageContents[idx + 1] = pageContent.items.reduce(
            (accStr, strValue) => accStr.concat(strValue.str.toLowerCase() + " "),
            ""
          );
          return accPageContents;
        }, {});

        this.setState({ pagesContent });
      });

      this.setState({ cachedPageHeights: pageHeights });
    });
  }

  onDocumentSuccess(pdf) {
    this.setState({ numPages: pdf.numPages });
    this.cachePdfData(pdf);
  }

  decPage() {
    this.setState({ pageNumber: Math.max(1, this.state.pageNumber - 1) });
  }

  incPage() {
    this.setState({ pageNumber: Math.min(this.state.pageNumber + 1, this.state.numPages) });
  }

  jumpToPage(num) {
    this.setState({ pageNumber: parseInt(num) });
  }

  setSearchHighlight(word) {
    this.setState({ searchHighlight: word });
  }

  render() {
    const { file } = this.props;
    const { pageNumber, numPages, searchHighlight } = this.state;
    return (
      <div className="flex">
        <div className="w80">
          <Document file={file} onLoadSuccess={this.onDocumentSuccess}>
            <Page
              pageNumber={pageNumber}
              customTextRenderer={textItem => {
                if (searchHighlight) {
                  return textItem.str
                    .toLowerCase()
                    .split(searchHighlight)
                    .reduce(
                      (strArray, currentValue, currentIndex) =>
                        currentIndex === 0
                          ? [...strArray, currentValue]
                          : [
                              ...strArray,
                              // eslint-disable-next-line react/no-array-index-key
                              <mark key={currentIndex}>{searchHighlight}</mark>,
                              currentValue
                            ],
                      []
                    );
                } else {
                  return textItem.str;
                }
              }}
            />
          </Document>
          <div className="bt b--light-silver w-100 tc flex center items-center justify-between">
            <a className="link" onClick={this.decPage}>
              Poprzednia
            </a>
            <p>
              Strona {pageNumber} z {numPages}
            </p>
            <a className="link" onClick={this.incPage}>
              Następna
            </a>
          </div>
        </div>
        <SearchPanel
          pagesContent={this.state.pagesContent}
          setSearchHighlight={this.setSearchHighlight}
          jumpToPage={this.jumpToPage}
        />
      </div>
    );
  }
}

class DocumentPreview extends React.Component {
  constructor(props) {
    super(props);

    autoBind(this);

    this.state = {
      numPages: null,
      pageNumber: 1,
      info: { title: "", sourceName: "", date: null, lastDownload: null }
    };
  }

  componentDidMount() {
    fetch(`/api/documents/?hash=${this.props.match.params.hash}`)
      .then(res => res.json())
      .then(info => this.setState({ info: info[0] }));
  }

  render() {
    const pdfUrl = buildPdfUrl(this.props.match.params.hash);
    return (
      <div className="content w-80 p5 center document-preview">
        <h2>{this.state.info.title}</h2>
        <h3>{this.state.info.sourceName}</h3>
        <h5>Data Publikacji: {this.state.info.date && formatDate(this.state.info.date)}</h5>
        <h5>Data Ostatniego Pobrania: {this.state.info.date && formatDate(this.state.info.lastDownload)}</h5>
        <div>
          <a className="red flex items-center" href={pdfUrl}>
            <i className="material-icons">attachment</i> Pobierz dziennik
          </a>
        </div>
        <PDFViewer file={pdfUrl} />
      </div>
    );
  }
}

module.exports = DocumentPreview;
