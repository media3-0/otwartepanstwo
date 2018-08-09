const React = require("react");
const ReactDOM = require("react-dom");
const ReactTable = require("react-table").default;
const autoBind = require("react-autobind");

require("react-table/react-table.css");

require("tachyons");
require("./styles.css");

const columns = [
  {
    Header: "Tytuł",
    accessor: "title",
    width: 500
  },
  {
    Header: "Źródło",
    accessor: "source_name"
  },
  {
    Header: "Data",
    accessor: "date",
    Cell: props => <span className="number">{props.value}</span>
  },
  {
    Header: "PDF",
    accessor: "hash",
    Cell: props => (
      <a
        className="link w-100 h-100 flex items-center justify-center items-center justify-center red"
        href={`/files/${props.value}.pdf`}
      >
        <i className="material-icons">attachment</i>
      </a>
    )
  }
];

class App extends React.Component {
  constructor() {
    super();

    autoBind(this);

    this.state = { documents: [], search: "" };
  }

  componentDidMount() {
    this.fetchDocuments();
    console.log(ReactTable);
  }

  fetchDocuments(search) {
    // TODO: this should be query string but I can't figure out nginx for that
    const url = search && search.length > 0 ? `/api/documents/${search}` : "/api/documents/";

    fetch(url)
      .then(res => res.json())
      .then(documents => this.setState({ documents }));
  }

  handleSearch() {
    this.fetchDocuments(this.state.search);
  }

  render() {
    return (
      <div className="app sans-serif">
        <div className="topbar">
          <div className="center w-80 flex justify-between items-center">
            <h2 className="red">OtwartePaństwo</h2>

            <div className="flex">
              <input
                type="text"
                value={this.state.search}
                onChange={event => this.setState({ search: event.target.value })}
                onKeyPress={event => {
                  if (event.key === "Enter") {
                    this.handleSearch();
                  }
                }}
              />
              <button className="br2 bg-red white bn" onClick={this.handleSearch}>
                Szukaj
              </button>
            </div>
          </div>
        </div>
        <div className="content w-60 p5 center">
          <ReactTable
            data={this.state.documents}
            columns={columns}
            showPageSizeOptions={false}
            sortable={false}
            multiSort={false}
            resizable={false}
            filterable={false}
            previousText="Wstecz"
            nextText="Dalej"
            loadingText="Wczytuję..."
            noDataText="Brak wyników"
            pageText="Strona"
            ofText="z"
            rowsText="wierszy"
          />
        </div>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
