const React = require("react");
const ReactDOM = require("react-dom");
const ReactTable = require("react-table").default;
const autoBind = require("react-autobind");
const { Route, Router } = require("react-router-dom");

const history = require("./services/history");
const Auth = require("./services/auth");

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
    accessor: "sourceName"
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

class Main extends React.Component {
  constructor() {
    super();

    autoBind(this);

    this.state = {
      subscriptions: [],
      documents: [],
      search: ""
    };
  }

  componentDidMount() {
    this.fetchDocuments();

    if (this.props.auth.isAuthenticated()) {
      this.fetchSubscriptions();
    }
  }

  fetchDocuments(search) {
    const url = search && search.length > 0 ? `/api/documents/?search=${search}` : "/api/documents/";

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

  handleSearch() {
    this.fetchDocuments(this.state.search);
  }

  handleLogin() {
    this.props.auth.login();
  }

  handleLogout() {
    this.props.auth.logout();
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

            <div>
              {isAuthenticated ? (
                <button onClick={this.handleLogout}>logout</button>
              ) : (
                <button onClick={this.handleLogin}>login</button>
              )}
            </div>
          </div>
        </div>

        <div className="content w-60 p5 center">
          <div>
            {this.state.search.length > 0 &&
              isAuthenticated && <button onClick={this.handleSearchSubscribe}>subscribe to this search</button>}
          </div>

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
    return (
      <Router history={history}>
        <div>
          <Route path="/" exact={true} render={props => <Main auth={this.auth} {...props} />} />
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
