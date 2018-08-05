const React = require("react");
const ReactDOM = require("react-dom");
const autoBind = require("react-autobind");

require("tachyons");

class App extends React.Component {
  constructor() {
    super();

    autoBind(this);

    this.state = { documents: [], search: "" };
  }

  componentDidMount() {
    this.fetchDocuments();
  }

  fetchDocuments(search) {
    // TODO: this should be query string but I can't figure out nginx for that
    const url = search && search.length > 0 ? `/api/documents/${search}` : "/api/documents/";

    fetch(url)
      .then(res => res.json())
      .then(documents => this.setState({ documents }));
  }

  handleSearch(event) {
    event.preventDefault();

    this.fetchDocuments(this.state.search);
  }

  render() {
    return (
      <div className="w-60 p5 center sans-serif">
        <h1>OtwartePaństwo</h1>

        <form onSubmit={this.handleSearch}>
          <input
            type="text"
            value={this.state.search}
            onChange={event => this.setState({ search: event.target.value })}
          />
          <input type="submit" value="search" />
        </form>

        <ul>
          {this.state.documents.map(doc => {
            return (
              <li key={doc.hash} className="pb3">
                {doc.date} {doc.source_name}: {doc.title}
                <a className="ml1" href={`/files/${doc.hash}.pdf`}>
                  download
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
