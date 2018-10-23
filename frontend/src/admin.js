const React = require("react");
const autoBind = require("react-autobind");
const { observer, inject } = require("mobx-react");
const { Link, withRouter } = require("react-router-dom");

const TableList = require("./list-table");

const Button = require("@material-ui/core/Button").default;

@withRouter
@inject("store")
@observer
class AdminHome extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }

  componentDidMount() {
    this.props.store.getAllArticles();
  }

  goToArticle(id) {
    return () => {
      const { history } = this.props;
      history.push({ pathname: `/admin/article/${id}` });
    };
  }

  handleDeleteClick = id => {
    this.props.store.deleteArticle({ id });
  };

  render() {
    const { store } = this.props;
    return (
      <div className="w-70 p5 center">
        <Link to="/admin/article">
          <Button variant="contained" color="primary">
            Nowy artykuł
          </Button>
        </Link>
        <TableList
          cells={[
            { name: "Identyfikator", key: "id" },
            { name: "Tytuł", key: "title" },
            { name: "Data utworzenia", key: "date" }
          ]}
          data={store.articles}
          onRowClick={this.goToArticle}
          onDeleteClick={this.handleDeleteClick}
        />
      </div>
    );
  }
}

module.exports = AdminHome;
