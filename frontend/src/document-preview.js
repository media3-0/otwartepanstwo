const React = require("react");
const autoBind = require("react-autobind");
const { Document, Page } = require("react-pdf");

const { buildPdfUrl } = require("./utils");

class DocumentPreview extends React.Component {
  constructor(props) {
    super(props);

    autoBind(this);

    this.state = {
      numPages: null,
      pageNumber: 1,
      info: { title: "", sourceName: "" }
    };
  }

  componentDidMount() {
    fetch(`/api/documents/?hash=${this.props.match.params.hash}`)
      .then(res => res.json())
      .then(info => this.setState({ info: info[0] }));
  }

  onDocumentSuccess(document) {
    this.setState({ numPages: document.numPages });
  }

  decPage() {
    this.setState({ pageNumber: Math.max(0, this.state.pageNumber - 1) });
  }

  incPage() {
    this.setState({ pageNumber: Math.min(this.state.pageNumber + 1, this.state.numPages) });
  }

  render() {
    console.log(this.state);
    const pdfUrl = buildPdfUrl(this.props.match.params.hash);
    const { pageNumber, numPages } = this.state;
    return (
      <div className="content w-60 p5 center">
        <h2>{this.state.info.title}</h2>
        <h4>{this.state.info.sourceName}</h4>
        <a href={pdfUrl}>Pobierz dziennik</a>
        <Document file={pdfUrl} onLoadSuccess={this.onDocumentSuccess}>
          <Page pageNumber={pageNumber} />
        </Document>
        <p>
          Strona {pageNumber} z {numPages}
        </p>
        <button onClick={this.decPage}>Poprzednia</button>
        <button onClick={this.incPage}>Następna</button>
      </div>
    );
  }
}

module.exports = DocumentPreview;
