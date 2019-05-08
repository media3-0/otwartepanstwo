const React = require("react");
const { Link, withRouter } = require("react-router-dom");
const { observer, inject } = require("mobx-react");
const moment = require("moment");

const { getUniqueMonths } = require("./utils");

const TextExcerpt = ({ rawState }) => rawState.blocks[0].text;
const BlogHeader = () => (
  <div className="blog-header">
    <h1 className="f3 ttu tracked lh-title">
      <Link className="red" to="/">
        Kto rządzi
      </Link>
    </h1>
  </div>
);

@inject("store")
@observer
class BlogSidebar extends React.Component {
  render() {
    const { articles, entities } = this.props.store;
    const dates = articles.map(article => article.date);
    return (
      <div className="fl w-30 pa3 pt0 mt3 bl b--light-gray">
        <div className="pa3">
          <h5 className="f5 red mt0 mb0 pb0">Archiwum</h5>
          <ul className="list pl0 pv1 mv0">
            {Object.entries(getUniqueMonths(dates)).map(([year, months], yearIdx) =>
              months.map(({ name, num }) => (
                <li key={`${yearIdx}-${num}`} className="f6 pv1 ttc">
                  <Link to={`/articles/${year}/${num}`} className="near-black">
                    {name} {year}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    );
  }
}

const BlogArticle = ({ id, title, date, children, readMore = false }) => (
  <div className="pb2 mb4">
    <Link to={`/article/${id}`}>
      <h2 className="f3 dark-gray pb1 mt0 mb0">{title}</h2>
    </Link>
    <span className="f7 silver">{date}</span>
    {children}
  </div>
);

@withRouter
@inject("store")
@observer
class Blog extends React.Component {
  componentDidMount() {
    this.props.store.getAllArticles();
  }

  render() {
    const { store, match } = this.props;

    const articles =
      match.params.year && match.params.month
        ? store.articles.filter(({ date }) => {
            const d = moment(date);
            const testDate = `${match.params.year}-${match.params.month.length === 1 ? "0" : ""}${match.params.month}`;
            return d.isSame(testDate, "year") && d.isSame(testDate, "month");
          })
        : store.articles;

    return (
      <div className="w-70 p5 center">
        <div className="fl w-70 pa2 mt3">
          {articles.map(({ id, title, date, content }) => (
            <BlogArticle key={id} id={id} title={title} date={moment(date).format("DD.MM.YYYY")}>
              <p className="f5 lh-copy dark-gray lh-copy measure-wide">
                <TextExcerpt rawState={content} />
              </p>
              <Link to={`/article/${id}`} className="f6 link dim ph3 pv2 mb2 dib white bg-red">
                Czytaj Dalej...
              </Link>
            </BlogArticle>
          ))}
        </div>
        <BlogSidebar />
      </div>
    );
  }
}

module.exports = {
  Blog,
  BlogHeader,
  BlogSidebar,
  BlogArticle
};
