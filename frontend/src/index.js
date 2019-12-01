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
const SearchRegionalResults = require("./search-regional-results");

const { Blog } = require("./blog");
const { BlogPost } = require("./blog-post");
const AdminHome = require("./admin");
const AdminArticleEdit = require("./admin-article");
const DocumentPreview = require("./document-preview");
const Subscriptions = require("./subscriptions");

require("react-table/react-table.css");
require("tachyons");
require("react-datepicker/dist/react-datepicker.css");
require("./styles.css");

const Footer = () => (
  <div className="fl w-100 pa2 mt3 bg-white">
    <footer className="ph3 w-70 center">
      <img src="/assets/footer.png" width="100%" />
    </footer>
  </div>
);

class DefaultLayout extends React.Component {
  render() {
    const { content, noFooter } = this.props;
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
                {!noFooter && <Footer />}
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
    console.log(nextState);
    if (/access_token|id_token|error/.test(nextState.location.hash)) {
      this.auth.handleAuthentication();
    }
  }

  render() {
    return (
      <Provider store={new Store()}>
        <Router history={history}>
          <div>
            <DefaultLayout exact={true} path="/" content={<Blog />} />
            <DefaultLayout exact={true} path="/articles/" content={<Blog />} />
            <DefaultLayout exact={true} path="/articles/:year/:month" content={<Blog />} />
            <DefaultLayout exact={true} path="/article/:id" content={<BlogPost />} />
            <DefaultLayout exact={true} path="/documents/general" content={<SearchResults />} />
            <DefaultLayout exact={true} path="/document/general/:hash" noFooter content={<DocumentPreview />} />
            <DefaultLayout exact={true} path="/documents/regional" content={<SearchRegionalResults />} />
            <DefaultLayout
              exact={true}
              path="/document/regional/:hash"
              noFooter
              content={<DocumentPreview regional />}
            />

            <DefaultLayout exact={true} path="/subscriptions" content={<Subscriptions />} />

            <DefaultLayout exact={true} admin path="/admin/article" content={<AdminArticleEdit />} />
            <DefaultLayout exact={true} admin path="/admin/article/:id" content={<AdminArticleEdit />} />

            <Route
              path="/callback"
              render={props => {
                this.handleAuthentication(props);
                return null;
              }}
            />
            <Route
              path="/admin"
              render={props => {
                const isAuth = this.auth.isAuthenticated();
                const isAdmin = this.auth.isAdmin();
                console.log(isAuth, isAdmin);

                if (isAuth && isAdmin) {
                  return <DefaultLayout exact={true} admin path="/admin" content={<AdminHome />} {...props} />;
                } else {
                  this.auth.login();
                  return null;
                }
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
