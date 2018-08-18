const React = require("react");
const ReactDOM = require("react-dom");
const ReactTable = require("react-table").default;
const autoBind = require("react-autobind");
const { Route, Router, Link } = require("react-router-dom");
const queryString = require("query-string");

const history = require("./services/history");
const Auth = require("./services/auth");

const DocumentPreview = require("./document-preview");

require("react-table/react-table.css");
require("tachyons");
require("./styles.css");

const columns = ({ search }) => {
  console.log("search", search);
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
      Cell: props => (
        <Link to={`/document/${props.value}/?search=${search}`}>Wyświetl</Link>
        // <a
        //   className="link w-100 h-100 flex items-center justify-center items-center justify-center red"
        //   href={buildPdfUrl(props.value)}>
        //   <i className="material-icons">attachment</i>
        // </a>
      )
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
      search: ""
    };
  }

  componentDidMount() {
    console.log("!");
    this.fetchDocuments(this.props.location);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.location.search !== nextProps.location.search) {
      this.fetchDocuments(nextProps.location);
    }
  }

  fetchDocuments(currentProps) {
    const search = queryString.parse(currentProps.search);
    const url = search.query && search.query.length > 0 ? `/api/documents/?search=${search.query}` : "/api/documents/";

    fetch(url)
      .then(res => res.json())
      .then(documents => {
        console.log({ documents });
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

  render() {
    const isAuthenticated = this.props.auth.isAuthenticated();
    const search = queryString.parse(this.props.location.search);
    const customColumns = columns({ search: search.query });
    console.log(customColumns);

    return (
      <div className="app sans-serif">
        <div className="content w-80 p5 center">
          <div>
            {this.state.search.length > 0 &&
              isAuthenticated && <button onClick={this.handleSearchSubscribe}>subscribe to this search</button>}
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

class Header extends React.Component {
  constructor() {
    super();

    autoBind(this);

    this.state = {
      search: ""
    };
  }

  componentDidMount() {
    this.setState({ search: queryString.parse(this.props.location.search).query || "" });
  }

  setSearch(ev) {
    const value = ev.target.value;
    this.setState({ search: value });
  }

  handleSearch() {
    this.props.history.push(`/?query=${this.state.search}`);
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
              value={this.state.search}
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
