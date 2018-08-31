const React = require("react");
const ReactDOM = require("react-dom");
const autoBind = require("react-autobind");
const { Route, Router, Link } = require("react-router-dom");
const { Provider, observer, inject } = require("mobx-react");
const Store = require("./store");
const omit = require("lodash.omit");

const history = require("./services/history");
const Auth = require("./services/auth");

const Header = require("./header");
const SearchResults = require("./search-results");

const DocumentPreview = require("./document-preview");
const Subscriptions = require("./subscriptions");

require("react-table/react-table.css");
require("tachyons");
require("react-datepicker/dist/react-datepicker.css");
require("./styles.css");

class DefaultLayout extends React.Component {
  render() {
    const { content } = this.props;
    const cleanProps = omit(this.props, ["store"]);
    return (
      <Route
        {...cleanProps}
        render={matchProps => (
          <div className="app sans-serif">
            <Header {...cleanProps} {...matchProps} />
            <div className="content">
              <div className="w-100 center">
                {React.cloneElement(content, Object.assign({}, matchProps, cleanProps))}
              </div>
            </div>
          </div>
        )}
      />
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
      <Provider store={new Store()}>
        <Router history={history}>
          <div>
            <DefaultLayout exact={true} path="/" content={<SearchResults />} />
            <DefaultLayout exact={true} path="/document/:hash" content={<DocumentPreview />} />
            <DefaultLayout exact={true} path="/subscriptions" content={<Subscriptions />} />
            <Route
              path="/callback"
              render={props => {
                this.handleAuthentication(props);
                return null;
              }}
            />
          </div>
        </Router>
      </Provider>
    );
  }
}

const store = require("./store");

ReactDOM.render(<App />, document.getElementById("app"));
