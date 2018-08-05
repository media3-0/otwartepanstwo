const React = require("react");
const ReactDOM = require("react-dom");

class App extends React.Component {
  constructor() {
    super();

    this.state = { documents: [] };
  }

  componentDidMount() {
    fetch("/api/documents")
      .then(res => res.json())
      .then(documents => {
        this.setState({ documents });
      });
  }

  render() {
    return (
      <div>
        <h1>OtwartePaństwo</h1>

        <ul>
          {this.state.documents.map(doc => {
            return (
              <li>
                {doc.title} {doc.date} ({doc.source_name})
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
