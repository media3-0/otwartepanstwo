const React = require("react");
const autoBind = require("react-autobind");
const { Document, Page } = require("react-pdf");
const queryString = require("query-string");

const { buildPdfUrl, formatDate, allIndexOf } = require("./utils");

class SearchPanel extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);

    this.state = { searchWord: this.props.searchFromUrl, results: [] };
    // this.state = {
    //   searchWord: "",
    //   results: [
    //     { pageNum: 1, count: 3 },
    //     { pageNum: 3, count: 3 },
    //     { pageNum: 5, count: 1 },
    //     { pageNum: 7, count: 2 },
    //     { pageNum: 1, count: 3 },
    //     { pageNum: 3, count: 3 },
    //     { pageNum: 5, count: 1 },
    //     { pageNum: 7, count: 2 },
    //     { pageNum: 1, count: 3 },
    //     { pageNum: 3, count: 3 },
    //     { pageNum: 5, count: 1 },
    //     { pageNum: 7, count: 2 },
    //     { pageNum: 1, count: 3 },
    //     { pageNum: 3, count: 3 },
    //     { pageNum: 5, count: 1 },
    //     { pageNum: 7, count: 2 },
    //     { pageNum: 1, count: 3 },
    //     { pageNum: 3, count: 3 },
    //     { pageNum: 5, count: 1 },
    //     { pageNum: 7, count: 2 },
    //     { pageNum: 1, count: 3 },
    //     { pageNum: 3, count: 3 },
    //     { pageNum: 5, count: 1 },
    //     { pageNum: 7, count: 2 },
    //     { pageNum: 1, count: 3 },
    //     { pageNum: 3, count: 3 },
    //     { pageNum: 5, count: 1 },
    //     { pageNum: 7, count: 2 },
    //     { pageNum: 1, count: 3 },
    //     { pageNum: 3, count: 3 },
    //     { pageNum: 5, count: 1 },
    //     { pageNum: 7, count: 2 }
    //   ]
    // };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.pagesContent !== nextProps.pagesContent) {
      this.handleSearch(nextProps);
    }
  }

  setSearch(value) {
    this.setState({ searchWord: value });
  }

  handleSearch(props) {
    const ownProps = props || this.props;
    const { pagesContent } = ownProps;
    const { searchWord } = this.state;

    ownProps.setSearchHighlight(searchWord);

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
    const { jumpToPage, selectedPage } = this.props;

    const LIST_ITEM_HEIGHT = 50;
    return (
      <div className="pa2">
        <div className="mb2">
          <input
            type="text"
            className="w-100 h-100 f7 pa3"
            value={searchWord}
            placeholder="Wpisz wyszukiwaną frazę..."
            onChange={ev => this.setSearch(ev.target.value)}
            onKeyPress={event => {
              if (event.key === "Enter") {
                this.handleSearch();
              }
            }}
          />
        </div>
        <ul className="search-panel__results overflow-scroll">
          {this.state.results.map((result, idx) => {
            const pageNum = parseInt(result.pageNum);
            return (
              <li
                className={`f7 pl2 bt b--light-silver flex flex-column justify-center align-center pointer dim ${
                  pageNum === selectedPage ? "red b" : "black"
                }`}
                style={{ height: LIST_ITEM_HEIGHT }}
                onClick={() => jumpToPage(pageNum)}
                key={idx}
              >
                <div className="color-washed-red">Strona: {pageNum}</div>
                <div>Liczba wystąpień: {result.count}</div>
              </li>
            );
          })}
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

  // render() {
  //   const { file } = this.props;
  //   const { pageNumber, numPages, searchHighlight } = this.state;
  //   return (
  //     <div className="flex">
  //       <div className="w80">
  //         <Document file={file} onLoadSuccess={this.onDocumentSuccess}>
  //           <Page
  //             pageNumber={pageNumber}
  //             customTextRenderer={textItem => {
  //               if (searchHighlight) {
  //                 return textItem.str
  //                   .toLowerCase()
  //                   .split(searchHighlight)
  //                   .reduce(
  //                     (strArray, currentValue, currentIndex) =>
  //                       currentIndex === 0
  //                         ? [...strArray, currentValue]
  //                         : [
  //                             ...strArray,
  //                             // eslint-disable-next-line react/no-array-index-key
  //                             <mark key={currentIndex}>{searchHighlight}</mark>,
  //                             currentValue
  //                           ],
  //                     []
  //                   );
  //               } else {
  //                 return textItem.str;
  //               }
  //             }}
  //           />
  //         </Document>
  //         <div className="bt b--light-silver w-100 tc flex center items-center justify-between">
  //           <a className="link" onClick={this.decPage}>
  //             Poprzednia
  //           </a>
  //           <p>
  //             Strona {pageNumber} z {numPages}
  //           </p>
  //           <a className="link" onClick={this.incPage}>
  //             Następna
  //           </a>
  //         </div>
  //       </div>
  //       <SearchPanel
  //         pagesContent={this.state.pagesContent}
  //         setSearchHighlight={this.setSearchHighlight}
  //         jumpToPage={this.jumpToPage}
  //       />
  //     </div>
  //   );
  // }

  render() {
    const { file, searchFromUrl } = this.props;
    const { pageNumber, numPages, searchHighlight, pagesContent } = this.state;
    const pageHeight = window.innerHeight * 0.85;
    return (
      <div>
        <div className="viewer-container flex">
          <div className="w-70 vh-85 overflow-scrol bg-near-white">
            <Document file={file} onLoadSuccess={this.onDocumentSuccess}>
              <Page
                pageNumber={pageNumber}
                height={pageHeight}
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
          </div>
          <div className="w-30">
            <SearchPanel
              pagesContent={this.state.pagesContent}
              setSearchHighlight={this.setSearchHighlight}
              jumpToPage={this.jumpToPage}
              selectedPage={pageNumber}
              searchFromUrl={searchFromUrl}
            />
          </div>
        </div>
        <div className="bt b--moon-gray f7 dark-gray w-70 tc flex items-center justify-between">
          <a className="link" onClick={this.decPage}>
            Poprzednia
          </a>
          <p>
            {pageNumber} / {numPages}
          </p>
          <a className="link" onClick={this.incPage}>
            Następna
          </a>
        </div>
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
    const searchFromUrl = queryString.parse(this.props.location.search).search || "";
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
        <PDFViewer file={pdfUrl} searchFromUrl={searchFromUrl} />
      </div>
    );
  }
}

module.exports = DocumentPreview;
