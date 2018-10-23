const React = require("react");
const autoBind = require("react-autobind");
const { observer, inject } = require("mobx-react");
const { toJS } = require("mobx");
const { withStyles } = require("@material-ui/core/styles");
const Button = require("@material-ui/core/Button").default;
const TextField = require("@material-ui/core/TextField").default;

const Paper = require("@material-ui/core/Paper").default;
const List = require("@material-ui/core/List").default;
const ListItem = require("@material-ui/core/ListItem").default;
const ListItemText = require("@material-ui/core/ListItemText").default;

import Checkbox from "@material-ui/core/Checkbox";

const Divider = require("@material-ui/core/Divider").default;

const { EditorState, convertFromRaw, convertToRaw } = require("draft-js");
const { Editor } = require("react-draft-wysiwyg");

require("react-draft-wysiwyg/dist/react-draft-wysiwyg.css");

class SimpleList extends React.Component {
  state = {
    checked: []
  };

  handleToggle = value => () => {};

  render() {
    const { title, values, checked, handleChangeOnList } = this.props;

    return (
      <Paper style={{ width: 360, maxHeight: 360, overflow: "scroll", margin: "10px 0", margin: 5 }}>
        <h5 style={{ padding: 10, margin: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
          {title}
        </h5>
        <Divider />
        <List>
          {values.map(value => (
            <ListItem key={value.id} role={undefined} dense button onClick={() => handleChangeOnList(value.id)}>
              <Checkbox checked={checked.indexOf(value.id) !== -1} tabIndex={-1} disableRipple />
              <ListItemText primary={value.name} />
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  }
}

const styles = theme => ({
  root: {
    width: "100%",
    marginTop: theme.spacing.unit * 3,
    overflowX: "auto"
  }
});

class ArticleEdit extends React.Component {
  constructor(props) {
    super(props);
    this.state = { title: "", editorState: null };
    autoBind(this);
  }

  componentDidMount() {
    const { article } = this.props;
    this.setState({
      title: article.title,
      editorState: article.editorState
    });
  }

  onEditorStateChange(editorState) {
    this.setState({
      editorState
    });
  }

  handleChange(name) {
    return event => this.setState({ [name]: event.target.value });
  }

  handleChangeOnList(listName) {
    return value => {
      const checked = this.state[listName];
      const currentIndex = checked.indexOf(value);
      const newChecked = [...checked];

      if (currentIndex === -1) {
        newChecked.push(value);
      } else {
        newChecked.splice(currentIndex, 1);
      }

      this.setState({
        [listName]: newChecked
      });
    };
  }

  onSaveClick() {
    const { onSave } = this.props;
    const { title, editorState } = this.state;
    onSave({ title, content: convertToRaw(editorState.getCurrentContent()) });
  }

  uploadImageCallBack(file) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("asset", file);

      fetch("/api/upload", {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: formData
      })
        .then(resp => resp.json())
        .then(json => resolve({ data: { link: json.filePath } }));
    });
  }

  render() {
    const { classes } = this.props;
    return (
      <div>
        <Button variant="contained" color="primary" onClick={this.onSaveClick}>
          Zapisz
        </Button>
        <br />
        <Paper style={{ margin: "10px 0", padding: 10 }}>
          <TextField
            id="standard-name"
            label="Tytuł"
            className={classes.textField}
            value={this.state.title}
            onChange={this.handleChange("title")}
            margin="normal"
          />
        </Paper>
        {this.state.editorState && (
          <Paper style={{ margin: "10px 0", padding: 10 }}>
            <Editor
              editorState={this.state.editorState}
              toolbarClassName="toolbarClassName"
              wrapperClassName="wrapperClassName"
              editorClassName="editorClassName"
              onEditorStateChange={this.onEditorStateChange}
              toolbar={{
                image: {
                  uploadCallback: this.uploadImageCallBack,
                  alt: { present: true, mandatory: false },
                  previewImage: true
                }
              }}
            />
          </Paper>
        )}
      </div>
    );
  }
}

const StyledArticleEdit = withStyles(styles)(ArticleEdit);

@inject("store")
@observer
class ArticleEditWrapper extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }

  onSaveNew(data) {
    this.props.store.addNewArticle(data);
  }

  onUpdate(data) {
    const { match, store } = this.props;
    const id = match.params.id;
    store.updateArticle(id, data);
  }

  render() {
    const { store, match } = this.props;
    const id = parseInt(match.params.id);
    const article = store.articles.find(a => a.id === id);
    if (id && !article) {
      return null;
    }

    const articleContent = article
      ? {
          title: article.title,
          editorState: EditorState.createWithContent(convertFromRaw(article.content))
        }
      : {
          title: "",
          editorState: EditorState.createEmpty()
        };

    return (
      <div className="w-70 p5 center">
        <StyledArticleEdit article={articleContent} onSave={article ? this.onUpdate : this.onSaveNew} />
      </div>
    );
  }
}

module.exports = ArticleEditWrapper;
