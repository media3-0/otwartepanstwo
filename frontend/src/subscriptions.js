const React = require("react");
const { Link } = require("react-router-dom");
const mobx = require("mobx");

const { observer, inject } = require("mobx-react");

@inject("store")
@observer
class Subscriptions extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.store.fetchSubscriptions();
  }

  render() {
    console.log(mobx.toJS(this.props.store.subscriptions));
    return (
      <div className="w-80 pt2 center">
        <h3 className="red">Moje Subskrypcje</h3>

        {this.props.store.subscriptions.length === 0 && (
          <div>
            Brak subskrypcji, wyszukaj interesującą Cię frazę i zasubskrybuj, żeby otrzymać powiadomienia mailowe o
            nowych dokumentach.
          </div>
        )}

        {this.props.store.subscriptions.map(obj => {
          return (
            <div className="bg-red white pa3 mv3" key={obj.searchPhrase}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="ttu tracked">Fraza: </div>
                  <div>{obj.searchPhrase === null ? "*" : obj.searchPhrase}</div>
                </div>
                <div>
                  <div className="ttu tracked">Źródło: </div>
                  <div>{obj.documentSource === null ? "*" : obj.documentSource}</div>
                </div>

                <div className="flex">
                  <div
                    className="flex items-center pa1 mh4 pointer"
                    onClick={() => this.props.store.deleteSubsciption(obj.searchPhrase)}
                  >
                    Usuń <i className="material-icons">delete_forever</i>
                  </div>
                  <Link
                    className="white flex justify-center items-center pa1"
                    to={`/?search=${obj.searchPhrase}&dateFrom=${obj.lastNotify.slice(0, 10)}`}
                  >
                    Pokaż Nowe Dokumenty <i className="material-icons">chevron_right</i>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}

module.exports = Subscriptions;
