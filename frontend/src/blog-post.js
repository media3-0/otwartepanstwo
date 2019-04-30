const React = require("react");
const { observer, inject } = require("mobx-react");
const moment = require("moment");

const { EditorState, convertFromRaw } = require("draft-js");
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

const { BlogArticle, BlogSidebar } = require("./blog");

const ReadOnlyEditor = ({ rawState }) => {
  const storedState = EditorState.createWithContent(convertFromRaw(rawState));
  return (
    <div className="readonly-editor lh-copy measure-wide">
      <Editor editorState={storedState} toolbarHidden readOnly={true} />
    </div>
  );
};

@inject("store")
@observer
class BlogPost extends React.Component {
  componentDidMount() {
    this.props.store.getArticleById({ id: this.props.match.params.id });
  }

  render() {
    const { match, store } = this.props;
    const id = parseInt(match.params.id);
    const article = store.articles.find(article => article.id === id);
    if (!article) {
      return null;
    }

    return (
      <div className="w-70 p5 center">
        <div className="fl w-70 pa2 mt3">
          <BlogArticle id={article.id} title={article.title} date={moment(article.date).format("DD.MM.YYYY")}>
            <ReadOnlyEditor rawState={article.content} />
          </BlogArticle>
        </div>
        <BlogSidebar />
      </div>
    );
  }
}

module.exports = { BlogPost };
