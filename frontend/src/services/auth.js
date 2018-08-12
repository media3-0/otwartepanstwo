const auth0 = require("auth0-js");

const history = require("./history");

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
  }

  login() {
    this.auth0.authorize();
  }

  handleAuthentication() {
    this.auth0.parseHash((err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.setSession(authResult);
        history.replace("/home");
      } else if (err) {
        history.replace("/home");
        console.error(err);
      }
    });
  }

  setSession(authResult) {
    const expiresAt = JSON.stringify(authResult.expiresIn * 1000 + new Date().getTime());

    localStorage.setItem("access_token", authResult.accessToken);
    localStorage.setItem("id_token", authResult.idToken);
    localStorage.setItem("expires_at", expiresAt);

    history.replace("/home");
  }

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("expires_at");

    history.replace("/home");
  }

  isAuthenticated() {
    let expiresAt = JSON.parse(localStorage.getItem("expires_at"));
    return new Date().getTime() < expiresAt;
  }

  getToken() {
    return localStorage.getItem("id_token");
  }
}

module.exports = Auth;
