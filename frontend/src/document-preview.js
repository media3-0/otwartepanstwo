const React = require("react");
const autoBind = require("react-autobind");
const { Document, Page } = require("react-pdf");
const queryString = require("query-string");

const { WrappedSpinner } = require("./loader");

const { buildPdfUrl, formatDate, removeNullKeys } = require("./utils");

class SearchPanel extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);

    this.state = { searchWord: this.props.searchFromUrl, results: [] };
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
  }

  render() {
    const { searchWord } = this.state;
    const { jumpToPage, selectedPage } = this.props;

    const LIST_ITEM_HEIGHT = 50;
    return (
      <div>
        <div className="pa2">
          <input
            type="text"
            className="w-100 h-100 f7 pa3 border--red"
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
                className={`f7 pl2 bb b--near-white flex flex-column justify-center align-center pointer dim ${
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
      pagesContent: null,
      scale: 1,
      pdfContainerRect: null,
      textContentRect: null
    };

    this._mounted = false;
  }

  componentDidMount() {
    this._mounted = true;

    this.updateViewContainers();
    window.addEventListener("resize", this.updateViewContainers);
  }

  componentWillUnmount() {
    this._mounted = false;

    window.removeEventListener("resize", this.updateViewContainers);
  }

  updateViewContainers() {
    if (!this.pdfContainerRef) {
      return;
    }

    const textContent = this.pdfContainerRef.querySelector(".react-pdf__Page__textContent");

    const pdfContainerRect = this.pdfContainerRef.getBoundingClientRect();
    const textContentRect = textContent && textContent.getBoundingClientRect();

    this.setState({
      pdfContainerRect: { width: pdfContainerRect.width, height: pdfContainerRect.height },
      textContentRect: textContent && { width: textContentRect.width, height: textContentRect.height }
    });
  }

  cachePdfData(pdf) {
    if (!this._mounted) {
      return null;
    }

    const promises = Array.from({ length: pdf.numPages }, (v, i) => i + 1).map(pageNumber => pdf.getPage(pageNumber));

    Promise.all(promises).then(values => {
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
    });
  }

  onDocumentSuccess(pdf) {
    this.setState({ numPages: pdf.numPages });
    this.cachePdfData(pdf);
  }

  jumpToPage(num) {
    this.props.handlePageChange(parseInt(num));
  }

  decPage() {
    this.jumpToPage(Math.max(1, this.props.pageNumber - 1));
  }

  incPage() {
    this.jumpToPage(Math.min(this.props.pageNumber + 1, this.state.numPages));
  }

  incScale() {
    this.setState({ scale: this.state.scale * 1.2 });
  }

  decScale() {
    this.setState({ scale: this.state.scale * 0.8 });
  }

  render() {
    const { file, searchFromUrl, handleSearchChange, pageNumber } = this.props;
    const { numPages, pdfContainerRect, textContentRect } = this.state;
    const shouldFixZoom = pdfContainerRect && textContentRect && textContentRect.width > pdfContainerRect.width;

    return (
      <div className="relative">
        <div style={{ position: "absolute", top: 0, left: 0, zIndex: 99 }}>
          <button
            className="bg-animate bg-red white inline-flex hover-bg-dark-red justify-center items-center ba b--near-white tc square-20"
            onClick={this.incScale}
          >
            <i className="material-icons">zoom_in</i>
          </button>
          <button
            className="bg-animate bg-red white inline-flex hover-bg-dark-red justify-center items-center ba b--near-white tc square-20"
            onClick={this.decScale}
          >
            <i className="material-icons">zoom_out</i>
          </button>
        </div>
        <div className="viewer-container flex">
          <div
            className={`w-80 overflow-scroll bg-near-white br b--moon-gray ${shouldFixZoom ? "pdf-zoom-fix" : ""}`}
            ref={r => (this.pdfContainerRef = r)}
          >
            <Document file={file} onLoadSuccess={this.onDocumentSuccess} loading={<WrappedSpinner />}>
              <Page
                pageNumber={pageNumber}
                loading={<WrappedSpinner />}
                renderTextLayer={true}
                scale={this.state.scale}
                onRenderSuccess={this.updateViewContainers}
                customTextRenderer={textItem => {
                  if (searchFromUrl) {
                    return textItem.str
                      .toLowerCase()
                      .split(searchFromUrl)
                      .reduce(
                        (strArray, currentValue, currentIndex) =>
                          currentIndex === 0
                            ? [...strArray, currentValue]
                            : [
                                ...strArray,
                                // eslint-disable-next-line react/no-array-index-key
                                <mark key={currentIndex}>{searchFromUrl}</mark>,
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
          <div className="w-20">
            <SearchPanel
              pagesContent={this.state.pagesContent}
              setSearchHighlight={handleSearchChange}
              jumpToPage={this.jumpToPage}
              selectedPage={pageNumber}
              searchFromUrl={searchFromUrl}
            />
          </div>
        </div>
        <div className="bg-near-white bt b--moon-gray f7 dark-gray w-80 tc flex items-center justify-between">
          <a className="bg-near-white red pdf-btn justify-center items-center inline-flex" onClick={this.decPage}>
            <i className="material-icons">navigate_before</i>
          </a>
          <p>
            {pageNumber} / {numPages}
          </p>
          <a className="bg-near-white red pdf-btn justify-center items-center inline-flex" onClick={this.incPage}>
            <i className="material-icons">navigate_next</i>
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
      info: { title: "", sourceName: "", date: null, lastDownload: null, url: "" }
    };
  }

  componentDidMount() {
    fetch(`/api/documents/?hash=${this.props.match.params.hash}`)
      .then(res => res.json())
      .then(info => {
        this.setState({ info: info.data[0] });
      });
  }

  handleSearchChange(value) {
    const hash = this.props.match.params.hash;
    const search = queryString.parse(this.props.location.search);

    const newSearch = removeNullKeys(Object.assign({}, search, { search: value }));
    this.props.history.push(`/document/${hash}/?${queryString.stringify(newSearch)}`);
  }

  handlePageChange(pageNum) {
    const hash = this.props.match.params.hash;
    const search = queryString.parse(this.props.location.search);

    const newSearch = removeNullKeys(Object.assign({}, search, { pageNum: parseInt(pageNum) }));
    this.props.history.push(`/document/${hash}/?${queryString.stringify(newSearch)}`);
  }

  render() {
    const pdfUrl = buildPdfUrl(this.props.match.params.hash);
    const search = queryString.parse(this.props.location.search);
    const pageNum = search.pageNum ? parseInt(search.pageNum) : 1;
    const searchWord = search.search;
    if (!this.state.info) {
      return null;
    }
    return (
      <div className="w-100 p5 center document-preview">
        <div className="flex">
          <div className="w-20 pa3 br b--moon-gray">
            <h3 className="title">{this.state.info.title}</h3>
            <h5 className="title">Żródło: {this.state.info.sourceName}</h5>
            <h5 className="title">Data Publikacji: {this.state.info.date && formatDate(this.state.info.date)}</h5>
            <h5 className="title">
              Data Ostatniego Pobrania: {this.state.info.date && formatDate(this.state.info.lastDownload)}
            </h5>
            <div>
              <a className="red flex items-center" href={this.state.info.url}>
                <i className="material-icons">attachment</i> Pobierz dziennik ze źródła
              </a>
            </div>
          </div>
          <div className="w-80">
            <PDFViewer
              file={pdfUrl}
              pageNumber={pageNum}
              searchFromUrl={searchWord}
              handleSearchChange={this.handleSearchChange}
              handlePageChange={this.handlePageChange}
            />
          </div>
        </div>
      </div>
    );
  }
}

module.exports = DocumentPreview;
