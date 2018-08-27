const React = require("react");
const autoBind = require("react-autobind");
const { Link } = require("react-router-dom");
const queryString = require("query-string");
const ReactTable = require("react-table").default;
const DatePicker = require("react-datepicker").default;
const moment = require("moment");
const { observer, inject } = require("mobx-react");

const { removeNullKeys } = require("./utils");
const { DATE_FORMAT } = require("./constants");

const columns = ({ search }) => {
  return [
    {
      Header: "Tytuł",
      accessor: "title",
      width: 500
    },
    {
      Header: "Źródło",
      accessor: "sourceName"
    },
    {
      Header: "Data",
      accessor: "date",
      Cell: props => <span className="number">{props.value}</span>
    },
    {
      Header: "Szczegóły",
      accessor: "hash",
      Cell: props => {
        const url = search ? `/document/${props.value}/?search=${search}` : `document/${props.value}`;
        return <Link to={url}>Wyświetl</Link>;
      }
    }
  ];
};

@inject("store")
@observer
class SearchResults extends React.Component {
  constructor() {
    super();

    autoBind(this);
  }

  componentDidMount() {
    this.fetchDocuments(this.props.location);
    this.props.store.fetchSourceNames();
    this.props.store.fetchSubscriptions();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.location.search !== nextProps.location.search) {
      this.fetchDocuments(nextProps.location);
    }
  }

  fetchDocuments(currentProps) {
    const query = removeNullKeys(queryString.parse(currentProps.search));
    this.props.store.fetchDocuments(query);
  }

  handleSearchSubscribe() {
    const query = removeNullKeys(queryString.parse(this.props.location.search));

    if (query.search) {
      this.props.store.addSubscription(query.search);
    }
  }

  handleDateChange(name) {
    return date => {
      const newDate = date ? date.format(DATE_FORMAT) : null;
      const search = queryString.parse(this.props.location.search);
      const newSearch = removeNullKeys(Object.assign({}, search, { [`date${name}`]: newDate }));
      this.props.history.push(`/?${queryString.stringify(newSearch)}`);
    };
  }

  handleSourceNameChange(sourceName) {
    const search = queryString.parse(this.props.location.search);
    const newSearch = removeNullKeys(Object.assign({}, search, { sourceName }));
    this.props.history.push(`/?${queryString.stringify(newSearch)}`);
  }

  render() {
    const isAuthenticated = this.props.store.auth.isAuthenticated();
    const query = queryString.parse(this.props.location.search);
    const customColumns = columns({ search: query.search });
    const isSubscribedToThisPhrase =
      query.search && this.props.store.subscriptions.some(s => s.searchPhrase === query.search);

    return (
      <div className="app sans-serif">
        <div className="w-80 p5 center">
          <div className="flex justify-between pa3">
            <div className="flex">
              <span className="f5">Data od: </span>
              <DatePicker
                selected={!!query.dateFrom ? moment(query.dateFrom, DATE_FORMAT) : null}
                isClearable={true}
                onChange={this.handleDateChange("From")}
                placeholderText="Kliknij żeby wybrać"
              />
            </div>

            <div className="flex">
              <span className="f5">Data do: </span>
              <DatePicker
                selected={!!query.dateTo ? moment(query.dateTo, DATE_FORMAT) : null}
                isClearable={true}
                onChange={this.handleDateChange("To")}
                placeholderText="Kliknij żeby wybrać"
              />
            </div>

            <div className="flex">
              Źródło:
              <select value={query.sourceName} onChange={ev => this.handleSourceNameChange(ev.target.value)}>
                {this.props.store.sourceNames.map((sourceName, idx) => (
                  <option key={idx} value={sourceName}>
                    {sourceName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex">
              {isAuthenticated && (
                <button
                  className="dropbtn"
                  disabled={isSubscribedToThisPhrase || !query.search}
                  onClick={this.handleSearchSubscribe}
                >
                  Zasubskrybuj to hasło
                </button>
              )}
            </div>
          </div>

          <ReactTable
            data={this.props.store.documents}
            columns={customColumns}
            showPageSizeOptions={false}
            sortable={false}
            multiSort={false}
            resizable={false}
            filterable={false}
            previousText="Wstecz"
            nextText="Dalej"
            loadingText="Wczytuję..."
            noDataText="Brak wyników"
            pageText="Strona"
            ofText="z"
            rowsText="wierszy"
          />
        </div>
      </div>
    );
  }
}

module.exports = SearchResults;
