const { action, observable } = require("mobx");
const queryString = require("query-string");

const Auth = require("./services/auth");

class Store {
  constructor() {
    this.auth = new Auth();
  }

  @observable fetching = false;
  @observable documents = [];
  @observable subscriptions = [];
  @observable sourceNames = [];

  @action
  fetchSubscriptions() {
    const token = this.auth.getToken();

    if (!this.auth.isAuthenticated()) {
      return;
    }

    fetch("/api/subscriptions", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(subscriptions => {
        console.log(subscriptions);
        this.subscriptions = subscriptions;
      });
  }

  @action
  addSubscription(search) {
    const token = this.auth.getToken();
    this.fetching = true;
    fetch("/api/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ search: search })
    }).then(() => {
      this.fetchSubscriptions();
      this.fetching = false;
    });
  }

  deleteSubsciption(searchPhrase) {
    const token = this.auth.getToken();
    this.fetching = true;
    if (searchPhrase) {
      fetch("/api/subscriptions", {
        method: "delete",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ search: searchPhrase })
      }).then(res => {
        this.fetching = false;
        if (res.ok) {
          this.subscriptions = this.subscriptions.filter(s => s.searchPhrase !== searchPhrase);
        }
      });
    }
  }

  @action
  fetchSourceNames() {
    fetch("/api/source-names")
      .then(res => res.json())
      .then(sourceNames => {
        this.sourceNames = sourceNames;
      });
  }

  @action
  fetchDocuments(query) {
    const url =
      Object.entries(query).length > 0 ? `/api/documents/?${queryString.stringify(query)}` : "/api/documents/";

    this.fetching = true;

    fetch(url)
      .then(res => res.json())
      .then(documents => {
        this.documents = documents;
        this.fetching = false;
      });
  }
}

module.exports = Store;
