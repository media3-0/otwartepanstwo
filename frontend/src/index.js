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
    <footer class="ph3 w-70 center">
      <img src="../assets/footer.png" width="100%" />
    </footer>
  </div>
);

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
                <Footer />
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
            <DefaultLayout exact={true} path="/" content={<Blog />} />
            <DefaultLayout exact={true} path="/articles/" content={<Blog />} />
            <DefaultLayout exact={true} path="/articles/:year/:month" content={<Blog />} />
            <DefaultLayout exact={true} path="/article/:id" content={<BlogPost />} />
            <DefaultLayout exact={true} path="/documents" content={<SearchResults />} />
            <DefaultLayout exact={true} path="/document/:hash" content={<DocumentPreview />} />
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
