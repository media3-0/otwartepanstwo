const React = require("react");
const ReactDOM = require("react-dom");

require("tachyons");

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
      <div className="w-60 p5 center sans-serif">
        <h1>OtwartePaństwo</h1>

        <ul>
          {this.state.documents.map(doc => {
            return (
              <li key={doc.hash} className="pb3">
                {doc.date} {doc.source_name}: {doc.title}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
