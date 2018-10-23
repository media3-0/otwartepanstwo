const { action, observable } = require("mobx");
const queryString = require("query-string");
const moment = require("moment");

const history = require("./services/history");
const Auth = require("./services/auth");
const API_URL = "/api";
const DEFAULT_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json"
};

const getFetch = path =>
  fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: DEFAULT_HEADERS
  }).then(resp => resp.json());

const getSpecificFetch = (path, id) =>
  fetch(`${API_URL}${path}/${id}`, {
    method: "GET",
    headers: DEFAULT_HEADERS
  }).then(resp => resp.json());

const addNewFetch = (path, body, token) =>
  fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: Object.assign(DEFAULT_HEADERS, { Authorization: `Bearer ${token}` }),
    body: JSON.stringify(body)
  }).then(resp => resp.json());

const updateFetch = (path, id, body, token) =>
  fetch(`${API_URL}${path}/${id}`, {
    method: "PUT",
    headers: Object.assign(DEFAULT_HEADERS, { Authorization: `Bearer ${token}` }),
    body: JSON.stringify(body)
  }).then(resp => resp.json());

const deleteFetch = (path, id, token) =>
  fetch(`${API_URL}${path}/${id}`, {
    method: "DELETE",
    headers: Object.assign(DEFAULT_HEADERS, { Authorization: `Bearer ${token}` })
  }).then(resp => resp.json());

class Store {
  constructor() {
    this.auth = new Auth();
  }

  @observable fetching = false;
  @observable documents = [];
  @observable subscriptions = [];
  @observable sourceNames = [];

  @observable articles = [];

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

  @action
  getAllArticles() {
    getFetch("/articles").then(articles => {
      this.articles = articles;
    });
  }

  @action
  getArticleById({ id }) {
    if (this.articles.some(article => article.id === id)) {
      return;
    }
    getSpecificFetch("/articles", id).then(article => {
      this.articles = this.articles.concat(article);
    });
  }

  @action
  addNewArticle(data) {
    addNewFetch(
      "/articles",
      Object.assign({}, data, { date: moment().format("YYYY-MM-DD") }),
      this.auth.getToken()
    ).then(json => {
      this.articles = this.articles.concat([Object.assign({ id: json.id }, data)]);
      history.push(`/admin/article/${json.id}`);
    });
  }

  @action
  updateArticle(id, data) {
    updateFetch("/articles", id, data, this.auth.getToken()).then(({ id }) => {
      this.articles = this.articles.map(article => {
        if (article.id === id) {
          return Object.assign(article, data);
        }
        return article;
      });
    });
  }

  deleteArticle({ id }) {
    deleteFetch("/articles", id, this.auth.getToken()).then(() => {
      this.articles = this.articles.filter(article => article.id !== id);
    });
  }
}

module.exports = Store;
