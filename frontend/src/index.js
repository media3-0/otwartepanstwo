const React = require("react");
const ReactDOM = require("react-dom");
const ReactTable = require("react-table").default;
const DatePicker = require("react-datepicker").default;
const moment = require("moment");
const autoBind = require("react-autobind");
const { Route, Router, Link } = require("react-router-dom");
const queryString = require("query-string");

const history = require("./services/history");
const Auth = require("./services/auth");

const { removeNullKeys } = require("./utils");

const DocumentPreview = require("./document-preview");

const DATE_FORMAT = "YYYY/MM/DD";

require("react-table/react-table.css");
require("tachyons");
require("./styles.css");
require("react-datepicker/dist/react-datepicker.css");

const columns = ({ search }) => {
  return [
    {
      Header: "Tytuł",
      accessor: "title",
      width: 500
    },
    {
      Header: "Źródło",
      accessor: "sourceName"
    },
    {
      Header: "Data",
      accessor: "date",
      Cell: props => <span className="number">{props.value}</span>
    },
    {
      Header: "Szczegóły",
      accessor: "hash",
      Cell: props => {
        const url = search ? `/document/${props.value}/?search=${search}` : `document/${props.value}`;
        return <Link to={url}>Wyświetl</Link>;
      }
    }
  ];
};

class SearchResults extends React.Component {
  constructor() {
    super();

    autoBind(this);

    this.state = {
      // subscriptions: [],
      documents: [],
      sourceNames: []
    };
  }

  componentDidMount() {
    this.fetchDocuments(this.props.location);
    this.fetchSourceNames();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.location.search !== nextProps.location.search) {
      this.fetchDocuments(nextProps.location);
    }
  }

  fetchSourceNames() {
    fetch("/api/source-names")
      .then(res => res.json())
      .then(sourceNames => this.setState({ sourceNames }));
  }

  fetchDocuments(currentProps) {
    const search = removeNullKeys(queryString.parse(currentProps.search));
    const url = Object.keys(search).length > 0 ? `/api/documents/?${queryString.stringify(search)}` : "/api/documents/";

    fetch(url)
      .then(res => res.json())
      .then(documents => {
        this.setState({ documents });
      });
  }

  fetchSubscriptions() {
    const token = this.props.auth.getToken();

    fetch("/api/subscriptions", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(subscriptions => {
        console.log({ subscriptions });
        this.setState({ subscriptions });
      });
  }

  handleSearchSubscribe() {
    const token = this.props.auth.getToken();

    fetch("/api/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ search: this.state.search })
    })
      .then(res => res.json())
      .then(res => console.log(res));
  }

  handleDateChange(name) {
    return date => {
      const newDate = date ? date.format(DATE_FORMAT) : null;
      const search = queryString.parse(this.props.location.search);
      const newSearch = removeNullKeys(Object.assign({}, search, { [`date${name}`]: newDate }));
      this.props.history.push(`/?${queryString.stringify(newSearch)}`);
    };
  }

  handleSourceNameChange(sourceName) {
    const search = queryString.parse(this.props.location.search);
    const newSearch = removeNullKeys(Object.assign({}, search, { sourceName }));
    this.props.history.push(`/?${queryString.stringify(newSearch)}`);
  }

  render() {
    const isAuthenticated = this.props.auth.isAuthenticated();
    const search = queryString.parse(this.props.location.search);
    const customColumns = columns({ search: search.search });
    console.log(this.state);

    return (
      <div className="app sans-serif">
        <div className="content w-80 p5 center">
          <div className="flex justify-between pa3">
            <div className="flex">
              Od:
              <DatePicker
                selected={!!search.dateFrom ? moment(search.dateFrom, DATE_FORMAT) : null}
                isClearable={true}
                onChange={this.handleDateChange("From")}
              />
            </div>

            <div className="flex">
              Do:
              <DatePicker
                selected={!!search.dateTo ? moment(search.dateTo, DATE_FORMAT) : null}
                isClearable={true}
                onChange={this.handleDateChange("To")}
              />
            </div>

            <div className="flex">
              Źródło:
              <select value={search.sourceName} onChange={ev => this.handleSourceNameChange(ev.target.value)}>
                {this.state.sourceNames.map((sourceName, idx) => (
                  <option key={idx} value={sourceName}>
                    {sourceName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ReactTable
            data={this.state.documents}
            columns={customColumns}
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

// <div>
//   {this.state.search.length > 0 &&
//     isAuthenticated && <button onClick={this.handleSearchSubscribe}>subscribe to this search</button>}
// </div>

class Header extends React.Component {
  constructor() {
    super();

    autoBind(this);

    this.state = {
      search: { search: null }
    };
  }

  componentDidMount() {
    const search = queryString.parse(this.props.location.search);
    this.setState({ search: Object.assign({}, this.state.search, search) }, () => console.log(this.state));
    // this.setState({ search: queryString.parse(this.props.location.search).query || "" });
  }

  setSearch(ev) {
    const value = ev.target.value;
    this.setState({ search: Object.assign({}, this.state.search, { search: value }) });
  }

  handleSearch() {
    const urlSearch = queryString.parse(this.props.location.search);
    const newSearch = removeNullKeys(Object.assign({}, urlSearch, this.state.search));
    this.props.history.push(`/?${queryString.stringify(newSearch)}`);
  }

  handleLogin() {
    this.props.auth.login();
  }

  handleLogout() {
    this.props.auth.logout();
  }

  render() {
    const { isAuthenticated } = this.props;
    return (
      <div className="topbar">
        <div className="center w-80 flex justify-between items-center">
          <Link to="/">
            <h2 className="red">OtwartePaństwo</h2>
          </Link>

          <div className="flex">
            <input
              type="text"
              value={this.state.search.search}
              onChange={this.setSearch}
              onKeyPress={event => {
                if (event.key === "Enter") {
                  this.handleSearch();
                }
              }}
            />
            <button className="br2 bg-red white bn" onClick={this.handleSearch}>
              Szukaj
            </button>
            <div>
              {isAuthenticated ? (
                <button onClick={this.handleLogout}>logout</button>
              ) : (
                <button onClick={this.handleLogin}>login</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const DefaultLayout = props => {
  const { content } = props;
  return (
    <Route
      {...props}
      render={matchProps => (
        <div className="app sans-serif">
          <Header {...props} {...matchProps} />
          <div className="w-100">{React.cloneElement(content, Object.assign({}, matchProps))}</div>
        </div>
      )}
    />
  );
};

// <Route path="/" exact={true} render={props => <SearchResults auth={this.auth} {...props} />} />

class App extends React.Component {
  constructor() {
    super();

    autoBind(this);

    this.auth = new Auth();
  }

  handleAuthentication(nextState) {
    if (/access_token|id_token|error/.test(nextState.location.hash)) {
      this.auth.handleAuthentication();
    }
  }

  render() {
    const commonProps = { auth: this.auth };
    return (
      <Router history={history}>
        <div>
          <DefaultLayout exact={true} path="/" content={<SearchResults {...commonProps} />} />
          <DefaultLayout exact={true} path="/document/:hash" content={<DocumentPreview />} />
          <Route path="/home" exact={true} render={() => <div>home</div>} />
          <Route
            path="/callback"
            render={props => {
              this.handleAuthentication(props);
              return <div>callback...</div>;
            }}
          />
        </div>
      </Router>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
