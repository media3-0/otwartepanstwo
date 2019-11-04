const React = require("react");
const autoBind = require("react-autobind");
const { withRouter } = require("react-router-dom");
const queryString = require("query-string");
const ReactTable = require("react-table").default;
const DatePicker = require("react-datepicker").default;
const moment = require("moment");
const { observer, inject } = require("mobx-react");
const mobx = require("mobx");

const { removeNullKeys } = require("./utils");
const { DATE_FORMAT } = require("./constants");
const { SelectPicker } = require("./components/select-picker");

const columns = ({ search }) => {
  return [
    {
      Header: "Tytuł",
      accessor: "title",
      width: 600
    },
    {
      Header: "Data",
      accessor: "date",
      width: 100,
      Cell: props => <div className="tc">{moment(new Date(props.value)).format("DD.MM.YYYY")}</div>
    },
    {
      Header: "Źródło",
      accessor: "sourceName"
    },
    {
      Header: "Skorowidz",
      accessor: "keywords"
    },
    {
      Header: "Publikujący",
      accessor: "publisher"
    }
  ];
};

@withRouter
@inject("store")
@observer
class SearchResults extends React.Component {
  constructor() {
    super();

    this.state = { search: { search: "" }, page: 0 };

    autoBind(this);
  }

  componentDidMount() {
    const search = queryString.parse(this.props.location.search);
    this.setState({ search: Object.assign({}, this.state.search, search) });
    this.fetchDocuments(this.props.location);
    this.props.store.fetchRegionalPublishers();
    this.props.store.fetchRegionalSourceNames();
    this.props.store.fetchRegionalKeywords();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.location.search !== nextProps.location.search) {
      const search = queryString.parse(nextProps.location.search);
      this.setState({ search });
      this.fetchDocuments(nextProps.location);
    }
  }

  fetchDocuments(currentProps) {
    const query = removeNullKeys(queryString.parse(currentProps.search));
    this.props.store.fetchRegionalDocuments(query);
  }

  handleSearchSubscribe() {
    const query = removeNullKeys(queryString.parse(this.props.location.search));

    if (query.search || query.sourceName) {
      this.props.store.addSubscription(query);
    }
  }

  handleDateChange(name) {
    return date => {
      const newDate = date ? date.format(DATE_FORMAT) : null;
      const search = queryString.parse(this.props.location.search);
      const newSearch = removeNullKeys(Object.assign({}, search, { [`date${name}`]: newDate }));
      this.props.history.push(`/documents/regional/?${queryString.stringify(newSearch)}`);
    };
  }

  handleSourceNameChange = ({ value }) => {
    const search = queryString.parse(this.props.location.search);
    const newSearch = removeNullKeys(
      Object.assign({}, search, { sourceName: value === search.sourceName ? null : value })
    );
    this.props.history.push(`/documents/regional/?${queryString.stringify(newSearch)}`);
  };

  handlePublisherChange = ({ value }) => {
    const search = queryString.parse(this.props.location.search);
    const newSearch = removeNullKeys(
      Object.assign({}, search, { publisher: value === search.publisher ? null : value })
    );
    this.props.history.push(`/documents/regional/?${queryString.stringify(newSearch)}`);
  };

  setSearch(ev) {
    const value = ev.target.value;
    this.setState({ search: Object.assign({}, this.state.search, { search: value }) });
  }

  handleSearch() {
    const urlSearch = queryString.parse(this.props.location.search);
    const newSearch = removeNullKeys(Object.assign({}, urlSearch, this.state.search, { page: 1 }));
    this.props.history.push(`/documents/regional/?${queryString.stringify(newSearch)}`);
  }

  fetchData(state) {
    const { id, desc } = state.sorted[0];

    const sortDirection = desc === true ? "DESC" : "ASC";
    const urlSearch = queryString.parse(this.props.location.search);

    // TODO: this can be fixed - I mean id === etc
    const newSearch = removeNullKeys(
      Object.assign({}, urlSearch, this.state.search, {
        page: state.page + 1,
        sortBy: id === "sourceName" ? "source_name" : id,
        sortDirection
      })
    );

    this.props.history.push(`/documents/regional/?${queryString.stringify(newSearch)}`);
  }

  render() {
    const isAuthenticated = this.props.store.auth.isAuthenticated();
    const query = queryString.parse(this.props.location.search);
    const customColumns = columns({ search: query.search });
    const subs = this.props.store.subscriptions;
    const isSubscribedToThisPhrase =
      (query.search || query.sourceName) &&
      subs.some(s => s.searchPhrase === query.search && s.sourceName === query.sourceName);

    return (
      <div className="app sans-serif">
        <div className="w-100 mw9 center flex">
          <div className="w-75 ph3 pv3 ">
            <ReactTable
              data={mobx.toJS(this.props.store.documents)}
              pages={this.props.store.totalPages}
              defaultSorted={[{ id: "date", desc: true }]}
              defaultPageSize={20}
              manual
              columns={customColumns}
              multiSort={false}
              showPageSizeOptions={false}
              resizable={false}
              filterable={false}
              previousText="Wstecz"
              nextText="Dalej"
              loadingText="Wczytuję..."
              noDataText="Brak wyników"
              pageText="Strona"
              ofText="z"
              rowsText="wierszy"
              onFetchData={this.fetchData}
              getTdProps={(state, rowInfo) => {
                return {
                  onClick: (e, handleOriginal) => {
                    const hash = rowInfo.original.hash;
                    const url = query.search
                      ? `/document/regional/${hash}/?search=${query.search}`
                      : `/document/regional/${hash}`;
                    this.props.history.push(url);
                    if (handleOriginal) {
                      handleOriginal();
                    }
                  }
                };
              }}
            />
          </div>

          <div className="w-25 bl b--light-gray">
            <div className="pa3">
              {/*
            <div className="flex">
                <Select
                  styles={customStyles()}
                  options={this.props.store.sourceNames.map(s => ({ value: s, label: s }))}
                  onChange={this.handleSourceNameChange}
                  placeholder="Źródło"
                />
            </div>
            */}

              <input
                className="f6 search-input"
                type="text"
                value={this.state.search.search}
                onChange={this.setSearch}
                placeholder="Wpisz wyszukiwaną frazę..."
                onKeyPress={event => {
                  if (event.key === "Enter") {
                    this.handleSearch();
                  }
                }}
              />
              {/*
              <button className="bg-red white ba b--red dim pointer f7" onClick={this.handleSearch}>
                Szukaj
              </button>
              */}

              <div className="flex">
                <SelectPicker
                  options={this.props.store.sourceNames.map(s => ({ value: s, label: s }))}
                  onChange={this.handleSourceNameChange}
                  selected={query.sourceName}
                />
              </div>

              <div className="flex">
                <SelectPicker
                  options={this.props.store.publishers.map(s => ({ value: s, label: s }))}
                  onChange={this.handlePublisherChange}
                  selected={query.publisher}
                />
              </div>

              <div className="flex date-picker f6">
                <DatePicker
                  selected={!!query.dateFrom ? moment(query.dateFrom, DATE_FORMAT) : null}
                  isClearable={true}
                  onChange={this.handleDateChange("From")}
                  placeholderText="Data od:"
                />
              </div>

              <div className="flex date-picker f6">
                <DatePicker
                  selected={!!query.dateTo ? moment(query.dateTo, DATE_FORMAT) : null}
                  isClearable={true}
                  onChange={this.handleDateChange("To")}
                  placeholderText="Data do:"
                />
              </div>

              <div className="flex">
                {isAuthenticated && (
                  <button
                    className="dropbtn dim pointer"
                    disabled={isSubscribedToThisPhrase || (!query.search && !query.sourceName)}
                    onClick={this.handleSearchSubscribe}
                  >
                    Zasubskrybuj wyszukiwanie
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = SearchResults;
// sorted={[{id: "title", desc: true}]}
