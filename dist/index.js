function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Ourodemi IDaaS React SDK
 * MIT Licensed
 */
const axios = require('axios').default;

class IDaaSModule {
  constructor(domain) {
    _defineProperty(this, "apiVersion", 'v1');

    _defineProperty(this, "isRefreshing", false);

    _defineProperty(this, "accessTokenStatus", false);

    _defineProperty(this, "localStoragePrefix", 'idaas-');

    _defineProperty(this, "deauthHandler", function () {});

    this.domain = domain; // test

    this.refresh_token = this.getLocalStorageItem('refresh-token') || undefined;
    this.refresh_token_expiry = this.getLocalStorageItem('refresh-token-expiry') || 0;
    this.access_token = this.getLocalStorageItem('access-token') || undefined;
    this.access_token_expiry = this.getLocalStorageItem('access-token-expiry') || 0;
  }

  async isAuthenticated() {
    return new Promise(async (resolve, reject) => {
      // check for a valid refresh token
      let i = Math.random() * 100;

      if (!this.refresh_token || this._timestamp_() > this.refresh_token_expiry) {
        return resolve(false);
      } // check for a valid access token


      if (this.access_token && this.access_token_expiry > this._timestamp_()) {
        this.accessTokenStatus = true;
        return resolve(true);
      } // try to obtain a new access token


      if (!(await this.newAccessToken())) {
        return resolve(false);
      }

      resolve(true);
    });
  }

  async auth({
    email,
    username,
    password
  }) {
    return new Promise((resolve, reject) => {
      axios.post(this.uri('auth'), {
        email,
        username,
        password
      }).then(({
        data,
        status
      }) => {
        if (status !== 200) {
          return resolve(false);
        }

        let {
          refresh_token,
          access_token,
          refresh_token_expiry,
          access_token_expiry,
          user
        } = data.data;

        if (!refresh_token) {
          return false;
        }

        user.full_name = this.get_full_name(user);
        this.setLocalStorageItem('refresh-token', refresh_token);
        this.setLocalStorageItem('access-token', access_token);
        this.setLocalStorageItem('refresh-token-expiry', refresh_token_expiry);
        this.setLocalStorageItem('access-token-expiry', access_token_expiry);
        this.setLocalStorageItem('user-data', JSON.stringify(user));
        this.refresh_token = refresh_token;
        this.refresh_token_expiry = refresh_token_expiry;
        this.access_token_expiry = access_token_expiry;
        this.access_token = access_token;
        resolve(true);
      }).catch(err => {
        resolve(false);
      });
    });
  }
  /**
   * O
   * @param {*} captcha 
   * @param {*} param1 
   * @returns 
   */


  async sso(captcha, {
    email,
    phone
  }) {
    return new Promise(async (resolve, reject) => {
      if (!this.captcha_token) {
        return resolve(false);
      }

      axios.get(this.uri('sso'), {
        headers: {
          'x-captcha-token': this.captcha_token,
          'x-captcha-string': captcha
        },
        query: {
          email,
          phone
        }
      }).then(({
        data,
        status
      }) => {
        resolve(status);
      }).catch(err => {
        resolve(false);
      });
    });
  }
  /**
   * Invalidates refresh token so that no more access tokens
   * can be requested with it. Refresh tokens may still remain
   * valid and a webhook can be attached on the IDaaS platform
   * to deal with that.
   * @returns {boolean}
   */


  async deauth() {
    return new Promise(async (resolve, reject) => {
      if (!this.refresh_token) {
        return resolve(false);
      }

      this.cleanup();
      axios.delete(this.uri('auth'), {
        headers: {
          'x-refresh-token': this.refresh_token
        }
      }).then(res => {
        resolve(true);
      }).catch(err => {
        resolve(false);
      });
      this.refresh_token = null;
      this.access_token = null;
    });
  }

  cleanup() {
    this.removeLocalStorageItem('refresh-token');
    this.removeLocalStorageItem('access-token');
    this.removeLocalStorageItem('refresh-token-expiry');
    this.removeLocalStorageItem('access-token-expiry');
    this.removeLocalStorageItem('user-data');
  }
  /**
   * 
   * @param {boolean} force - force a new access token 
   * even if current one is still valid 
   * @returns {boolean} - true | false
   */


  async newAccessToken(force = false) {
    return new Promise(async (resolve, reject) => {
      if (this.isRefreshing) {
        var that = this;
        let intervalId = setInterval(() => {
          if (!this.isRefreshing) {
            clearInterval(intervalId);
            resolve(that.accessTokenStatus);
          }
        }, 500);
        return;
      }

      if (!this.refresh_token) {
        this.accessTokenStatus = false;
        this.isRefreshing = false;
        this.cleanup();
        this.deauthHandler(false);
        return resolve(false);
      }

      this.isRefreshing = true;
      await axios.get(this.uri('auth'), {
        headers: {
          'x-refresh-token': this.refresh_token
        }
      }).then(({
        data,
        status
      }) => {
        let {
          access_token,
          access_token_expiry,
          user
        } = data.data;

        if (!access_token) {
          this.cleanup();
          this.accessTokenStatus = false;
          resolve(false);
          return this.deauthHandler({
            status
          });
        }

        user.full_name = this.get_full_name(user);
        this.access_token = access_token;
        this.access_token_expiry = access_token_expiry;
        this.accessTokenStatus = true;
        this.setLocalStorageItem('access-token', access_token);
        this.setLocalStorageItem('user-data', JSON.stringify(user));
        this.setLocalStorageItem('access-token-expiry', expiry);
        resolve(true);
      }).catch(err => {
        resolve(false);
        return this.deauthHandler({
          status: 500
        });
      });
      this.isRefreshing = false;
    });
  }

  async obtainCaptcha() {
    return new Promise(async (resolve, reject) => {
      await axios.get(this.uri('captcha')).then(({
        data
      }) => {
        resolve(data.data);
      }).catch(err => {
        resolve(err);
      });
    });
  }
  /**
   * 
   * @param {function} handler 
   * @returns 
   */


  async request(handler) {
    if (this._timestamp_() > this.refresh_token_expiry) {
      return this.deauthHandler();
    }

    if (this._timestamp_() > this.access_token_expiry) {
      await this.newAccessToken();
    }

    handler(this.access_token);
  }

  setDeauthHandler(handler) {
    this.deauthHandler = handler;
  }

  async getUser() {
    if (!this.isAuthenticated()) {
      return false;
    }

    return new Promise(async (resolve, reject) => {
      try {
        let user = JSON.parse(this.getLocalStorageItem('user-data') || '{}');

        if (user.user_id) {
          return resolve(user);
        }
      } catch (e) {// move ahead
      }

      await axios.get(this.uri('user'), {
        headers: {
          'x-access-token': this.access_token
        }
      }).then(({
        data,
        status
      }) => {
        let user = data.data;

        if (status != 200) {
          return resolve(false);
        }

        user.full_name = this.get_full_name(user);
        this.setLocalStorageItem('user-data', JSON.stringify(user));
        resolve(user);
      }).catch(err => {
        resolve(false);
      });
    });
  }

  async createRegistrationToken(user, captcha, captcha_token) {
    return new Promise(async (resolve, reject) => {
      await axios.post(this.uri('user'), user, {
        headers: {
          'x-captcha-token': captcha_token,
          'x-captcha-string': captcha
        }
      }).then(({
        data,
        status
      }) => {
        let code = data.code;
        let {
          registration_token
        } = data.data || {};
        resolve({
          code,
          status,
          registration_token
        });
      }).catch(({
        response
      }) => resolve(this.expandResponse(response.data)));
    });
  }

  async verifyRegistration(registration_token, verification_code, login = true) {
    return new Promise(async (resolve, reject) => {
      await axios.patch(this.uri('user'), {
        registration_token,
        verification_code
      }).then(({
        data,
        status
      }) => {
        let code = data.code;

        if (status == 200 && login) {
          let {
            refresh_token,
            access_token,
            refresh_token_expiry,
            access_token_expiry,
            user
          } = data.data || {};
          user.full_name = this.get_full_name(user);
          this.accessTokenStatus = true;
          this.setLocalStorageItem('refresh-token', refresh_token);
          this.setLocalStorageItem('access-token', access_token);
          this.setLocalStorageItem('refresh-token-expiry', refresh_token_expiry);
          this.setLocalStorageItem('access-token-expiry', access_token_expiry);
          this.setLocalStorageItem('user-data', JSON.stringify(user));
        }

        resolve({
          code,
          status,
          ...(data.data || {})
        });
      }).catch(({
        response
      }) => resolve(this.expandResponse(response.data)));
    });
  }

  expandResponse(res) {
    return {
      status: res.status || 500,
      code: res.code || 'connection_failure',
      ...(res.data || {})
    };
  }

  _timestamp_() {
    return Math.floor(Date.now() / 1000);
  }

  get_full_name(user) {
    let {
      first_name,
      last_name,
      middle_name
    } = user;
    return `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`;
  }

  uri(e) {
    return `https://${this.domain}/${this.apiVersion}/${e}`;
  }

  updateLocalObject(obj) {}

  getLocalObject(obj) {}
  /* LOCAL STORAGE WARPPERS FOR PREFIXING */


  getLocalStorageItem(key) {
    return localStorage.getItem(`${this.localStoragePrefix + key}`);
  }

  setLocalStorageItem(key, value) {
    return localStorage.setItem(`${this.localStoragePrefix + key}`, value);
  }

  removeLocalStorageItem(key) {
    return localStorage.removeItem(`${this.localStoragePrefix + key}`);
  }

}

module.exports = IDaaSModule;