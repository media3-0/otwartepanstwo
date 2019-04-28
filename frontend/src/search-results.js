const React = require("react");
const autoBind = require("react-autobind");
const { withRouter } = require("react-router-dom");
const queryString = require("query-string");
const ReactTable = require("react-table").default;
const DatePicker = require("react-datepicker").default;
const Select = require("react-select").default;
const moment = require("moment");
const { observer, inject } = require("mobx-react");
const mobx = require("mobx");

const { removeNullKeys } = require("./utils");
const { DATE_FORMAT } = require("./constants");

class SelectPicker extends React.Component {
  render() {
    const { options, onChange, selected } = this.props;
    return (
      <div className="select-picker-scroll">
        {options.map(({ value, label }, idx) => (
          <div className="select-item" key={idx} onClick={() => onChange({ value })}>
            {/*<input type="radio" name={value} value={value} checked={isSelected} />*/}
            <div className={`circle-marker ${selected === value ? "fill" : ""}`}>
              <div className="circle-marker-inside" />
            </div>
            {label}
          </div>
        ))}
      </div>
    );
  }
}

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
    }
  ];
};

@withRouter
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
      this.props.history.push(`/documents?${queryString.stringify(newSearch)}`);
    };
  }

  handleSourceNameChange({ value }) {
    const search = queryString.parse(this.props.location.search);
    const newSearch = removeNullKeys(Object.assign({}, search, { sourceName: value }));
    this.props.history.push(`/documents?${queryString.stringify(newSearch)}`);
  }

  render() {
    const isAuthenticated = this.props.store.auth.isAuthenticated();
    const query = queryString.parse(this.props.location.search);
    const customColumns = columns({ search: query.search });
    const isSubscribedToThisPhrase =
      query.search && this.props.store.subscriptions.some(s => s.searchPhrase === query.search);

    // const customStyles = (width = 200, height = 20) => {
    //   return {
    //     container: base =>
    //       Object.assign({}, base, {
    //         display: "inline-block",
    //         width: width
    //       }),
    //     valueContainer: base =>
    //       Object.assign({}, base, {
    //         minHeight: height
    //       }),
    //     placeHolder: base => Object.assign({}, base, { fontSize: 12 })
    //   };
    // };

    // console.log(mobx.toJS(this.props.store.documents));
    return (
      <div className="app sans-serif">
        <div className="w-80 mv3 center flex">
          <div className="w-80">
            <ReactTable
              data={mobx.toJS(this.props.store.documents)}
              columns={customColumns}
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
              getTdProps={(state, rowInfo) => {
                return {
                  onClick: (e, handleOriginal) => {
                    const hash = rowInfo.original.hash;
                    const url = query.search ? `/document/${hash}/?search=${query.search}` : `document/${hash}`;
                    this.props.history.push(url);
                    if (handleOriginal) {
                      handleOriginal();
                    }
                  }
                };
              }}
            />
          </div>

          <div className="w-20 ph3">
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

            <div className="flex">
              <SelectPicker
                options={this.props.store.sourceNames.map(s => ({ value: s, label: s }))}
                onChange={this.handleSourceNameChange}
                selected={query.sourceName}
              />
            </div>

            <div className="flex css-1aya2g8">
              <DatePicker
                selected={!!query.dateFrom ? moment(query.dateFrom, DATE_FORMAT) : null}
                isClearable={true}
                onChange={this.handleDateChange("From")}
                placeholderText="Data od:"
              />
            </div>

            <div className="flex css-1aya2g8">
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
                  disabled={isSubscribedToThisPhrase || !query.search}
                  onClick={this.handleSearchSubscribe}
                >
                  Zasubskrybuj
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = SearchResults;
