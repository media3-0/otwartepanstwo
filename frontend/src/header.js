const React = require("react");
const autoBind = require("react-autobind");
const { Link } = require("react-router-dom");
const queryString = require("query-string");
const { observer, inject } = require("mobx-react");
const { removeNullKeys } = require("./utils");

const Loader = require("./loader");

@inject("store")
@observer
class Header extends React.Component {
  constructor() {
    super();

    autoBind(this);

    this.state = {
      search: { search: "" }
    };
  }

  componentDidMount() {
    const search = queryString.parse(this.props.location.search);
    this.setState({ search: Object.assign({}, this.state.search, search) });
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.location.search !== nextProps.location.search) {
      const search = queryString.parse(nextProps.location.search);
      this.setState({ search: Object.assign({}, this.state.search, search) });
    }
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
    this.props.store.auth.login();
  }

  handleLogout() {
    this.props.store.auth.logout();
  }

  render() {
    const isAuthenticated = this.props.store.auth.isAuthenticated();
    const { email } = this.props.store.auth.getUser();
    return (
      <div>
        <Loader visible={this.props.store.fetching} />
        <div className="topbar">
          <div className="center w-80 flex justify-between items-center">
            <Link to="/">
              <h2 className="red">OtwartePaństwo</h2>
            </Link>

            <div className="flex">
              <input
                className="f7"
                type="text"
                value={this.state.search.search}
                onChange={this.setSearch}
                placeholder="Wpisz wyszukiwaną frazę..."
                onKeyPress={event => {
                  if (event.key === "Enter") {
                    this.handleSearch();
                  }
                }}
              />
              <button className="bg-red white ba b--red dim f7" onClick={this.handleSearch}>
                Szukaj
              </button>
              <div>
                {isAuthenticated ? (
                  <div className="dropdown">
                    <button className="dropbtn flex justify-center items-center">
                      <i className="material-icons">person</i>
                      {email}
                    </button>
                    <div className="dropdown-content">
                      <Link to="/subscriptions">Subskrypcje</Link>
                      <a onClick={this.handleLogout}>Wyloguj</a>
                    </div>
                  </div>
                ) : (
                  <button className="dropbtn flex justify-center items-center" onClick={this.handleLogin}>
                    Zaloguj
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = Header;
