const auth0 = require("auth0-js");

const history = require("./history");

const ADMIN_EMAILS = process.env.ADMIN_EMAILS.split(",");

class Auth {
  constructor() {
    this.auth0 = new auth0.WebAuth({
      domain: process.env.AUTH0_DOMAIN,
      clientID: process.env.AUTH0_CLIENTID,
      redirectUri: process.env.AUTH0_REDIRECT,
      audience: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      responseType: "token id_token",
      scope: "openid email"
    });

    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.handleAuthentication = this.handleAuthentication.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.email = null;
  }

  login() {
    this.auth0.authorize();
  }

  handleAuthentication() {
    this.auth0.parseHash((err, authResult) => {
      console.log(authResult);
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.setSession(authResult);
        history.replace("/");
      } else if (err) {
        history.replace("/");
        console.error(err);
      }
    });
  }

  setSession(authResult) {
    const expiresAt = JSON.stringify(authResult.expiresIn * 1000 + new Date().getTime());
    const email = authResult.idTokenPayload.email;

    localStorage.setItem("access_token", authResult.accessToken);
    localStorage.setItem("id_token", authResult.idToken);
    localStorage.setItem("expires_at", expiresAt);
    localStorage.setItem("email", email);
    localStorage.setItem("isAdmin", ADMIN_EMAILS.includes(email));

    history.replace("/");
  }

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("expires_at");
    localStorage.removeItem("email");

    history.replace("/");
  }

  isAuthenticated() {
    let expiresAt = JSON.parse(localStorage.getItem("expires_at"));
    return new Date().getTime() < expiresAt;
  }

  getToken() {
    return localStorage.getItem("id_token");
  }

  getUser() {
    return { email: localStorage.getItem("email") };
  }

  isAdmin(callback) {
    const email = localStorage.getItem("email");
    return ADMIN_EMAILS.includes(email);
  }
}

module.exports = Auth;
