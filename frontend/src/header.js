const React = require("react");
const autoBind = require("react-autobind");
const { Link } = require("react-router-dom");
const queryString = require("query-string");
const { observer, inject } = require("mobx-react");
const { removeNullKeys } = require("./utils");

const { Loader } = require("./loader");

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
          <div className="center w-100 pa3 flex justify-between items-center">
            <div className="flex">
              <Link to="/" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img width="200" src="/assets/logo.png" />
              </Link>
              <div className="flex ml3 items-center">
                <a className="mr2 f6" href="/documents/general">
                  Dokumenty
                </a>
                <a className="mr2 f6" href="/documents/regional">
                  Regionalne
                </a>
                <a className="mr2 f6" href="/documents/bulletin">
                  Biuletyn zamówień
                </a>
                <a className="mr2 f6" href="http://sady.otwartepanstwo.pl">
                  Sądy
                </a>
                {/* <a className="mr2 f6" href="/"> */}
                {/*   Blog */}
                {/* </a> */}
                <a className="mr2 f6" href="/public-api/docs/">
                  API
                </a>
              </div>
            </div>

            <div className="flex">
              <div>
                {isAuthenticated ? (
                  <div className="dropdown">
                    <button className="dropbtn flex justify-center items-center dim pointer">
                      <i className="material-icons">person</i>
                      {email}
                    </button>
                    <div className="dropdown-content">
                      <Link to="/subscriptions">Subskrypcje</Link>
                      <a onClick={this.handleLogout}>Wyloguj</a>
                    </div>
                  </div>
                ) : (
                  <button className="dropbtn flex justify-center items-center dim pointer" onClick={this.handleLogin}>
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
