const React = require("react");
const autoBind = require("react-autobind");
const { Document, Page } = require("react-pdf");
const queryString = require("query-string");

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
          <button onClick={this.incScale}>+</button>
          <button onClick={this.decScale}>-</button>
        </div>
        <div className="viewer-container flex">
          <div
            className={`w-80 vh-85 overflow-scroll bg-near-white ${shouldFixZoom ? "pdf-zoom-fix" : ""}`}
            ref={r => (this.pdfContainerRef = r)}
          >
            <Document file={file} onLoadSuccess={this.onDocumentSuccess}>
              <Page
                pageNumber={pageNumber}
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
        <div className="bt b--moon-gray f7 dark-gray w-80 tc flex items-center justify-between">
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
      info: { title: "", sourceName: "", date: null, lastDownload: null }
    };
  }

  componentDidMount() {
    fetch(`/api/documents/?hash=${this.props.match.params.hash}`)
      .then(res => res.json())
      .then(info => this.setState({ info: info[0] }));
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
    return (
      <div className="w-80 p5 center document-preview">
        <h2>{this.state.info.title}</h2>
        <h3>{this.state.info.sourceName}</h3>
        <h5>Data Publikacji: {this.state.info.date && formatDate(this.state.info.date)}</h5>
        <h5>Data Ostatniego Pobrania: {this.state.info.date && formatDate(this.state.info.lastDownload)}</h5>
        <div>
          <a className="red flex items-center" href={pdfUrl}>
            <i className="material-icons">attachment</i> Pobierz dziennik
          </a>
        </div>
        <PDFViewer
          file={pdfUrl}
          pageNumber={pageNum}
          searchFromUrl={searchWord}
          handleSearchChange={this.handleSearchChange}
          handlePageChange={this.handlePageChange}
        />
      </div>
    );
  }
}

module.exports = DocumentPreview;
