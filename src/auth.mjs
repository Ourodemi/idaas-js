/**
 * Ourodemi IDaaS React SDK
 * MIT Licensed
 */

import axios from 'axios';

class IDaaSModule{
    apiVersion = 'v1';
    isRefreshing = false;

    localStoragePrefix = 'idaas-';
    deauthHandlser = function(){};

    constructor(domain){
        this.domain = domain;
        
        this.refreshToken = this.getLocalStorageItem('refresh-token') || undefined;
        this.refreshTokenExpiry = this.getLocalStorageItem('refresh-token-expiry') || 0;

        this.accessToken = this.getLocalStorageItem('access-token') || undefined;
        this.accessTokenExpiry = this.getLocalStorageItem('access-token-expiry') || 0;        
    }

    async isAuthenticated(){
        // check for a valid refresh token
        if ( !this.refreshToken || 
            this._timestamp_() > this.refreshTokenExpiry ){
            return false;
        }

        // check for a valid refresh token
        if ( this.accessToken && 
            this.accessTokenExpiry > this._timestamp_() ){
            return true;   
        }

        // try to obtain a new access token
        if ( !await this.newAccessToken() ){
            return false;
        }

        return true;
    }

    async auth({ email, username, password }){
        return new Promise((resolve, reject) => {
            axios.post(this.uri('auth'), {
                email, username, password
            }).then(({data , status}) => {
                if ( status !== 200 ){
                    return resolve(false);
                }
                
                let { 
                    refreshToken, 
                    accessToken, 
                    refreshTokenExpiry, 
                    accessTokenExpiry,
                    user
                } = data.data;
                
                if ( !refreshToken ){
                    return false;
                }
        
                this.setLocalStorageItem('refresh-token', refreshToken);
                this.setLocalStorageItem('access-token', accessToken);
                this.setLocalStorageItem('refresh-token-expiry', refreshTokenExpiry);
                this.setLocalStorageItem('access-token-expiry', accessTokenExpiry);
                this.setLocalStorageItem('user-data', JSON.stringify(user));

                this.refreshToken = refreshToken;
                this.refreshTokenExpiry = refreshTokenExpiry;
                this.accessTokenExpiry = accessTokenExpiry;
                this.accessToken = accessToken;

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
    async sso(captcha, { email, phone }){
        return new Promise(async (resolve, reject) => {
            if ( !this.captchaToken ){
                return resolve(false);
            }

            axios.get(this.uri('sso'), {
                headers: {
                    'x-captcha-token': this.captchaToken,
                    'x-captcha-code': captcha
                },
                query: { email, phone }
            }).then(({ data, status }) => {
                /**
                 * 404 - invalid email
                 * 401 - invalid captcha attempt
                 * 429 - too many sso requests
                 */
                resolve(status);
            }).catch(err => {
                resolve(false);
            })
        });
    }
    
    /**
     * Invalidates refresh token so that no more access tokens
     * can be requested with it. Refresh tokens may still remain
     * valid and a webhook can be attached on the IDaaS platform
     * to deal with that.
     * @returns {boolean}
     */
    async deauth(){
        return new Promise(async (resolve, reject) => {
            if ( !this.refreshToken ){
                return resolve(false);
            }

            this.removeLocalStorageItem('refresh-token');
            this.removeLocalStorageItem('access-token');
            this.removeLocalStorageItem('refresh-token-expiry');
            this.removeLocalStorageItem('access-token-expiry');
            this.removeLocalStorageItem('user-data');

            axios.delete(this.uri('auth'), {
                headers:{
                    'x-refresh-token': this.refreshToken
                }
            }).then(res => {
                resolve(true);
            }).catch(err => {
                resolve(false);
            });

            this.refreshToken = null;
            this.accessToken = null;
        });
    }
    
    /**
     * 
     * @param {boolean} force - force a new access token 
     * even if current one is still valid 
     * @returns {boolean} - true | false
     */
    async newAccessToken(force = false){
        return new Promise(async (resolve, reject) => {
            if ( !this.refreshToken ){
                this.deauthHandler(false);
                return resolve(false);
            }

            if ( this.isRefreshing ){
                let intervalId = setInterval(() => {
                    if ( !this.isRefreshing ){
                        clearInterval(intervalId);
                        resolve(true);
                    }
                }, 500);
                return;
            }

            if ( this.accessTokenExpiry > this._timestamp_() && !force ){
                return resolve(true);
            }

            this.isRefreshing = true;

            await axios.get(this.uri('auth'), {headers:{
                'x-refresh-token': this.refreshToken
            }}).then(({data, status}) => {
                let { accessToken, expiry, user } = data.data;
                
                if ( !accessToken ){
                    resolve(false);
                    return this.deauthHandler({ status });
                }
        
                this.setLocalStorageItem('access-token', accessToken);
                this.setLocalStorageItem('user-data', JSON.stringify(user));
                this.setLocalStorageItem('access-token-expiry', expiry);

                this.accessToken = accessToken;
                this.accessTokenExpiry = expiry;

                resolve(data.data);
            }).catch(err => {
                resolve(false);
                return this.deauthHandler({ status: 500 })
            })

            this.isRefreshing = false;
        });
    }

    async obtainCaptcha(){
        return new Promise(async (resolve, reject) => {
            await axios.get(this.uri('captcha'))
            .then(({ data }) => {
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
    async request(handler){
        if ( this._timestamp_() > this.refreshTokenExpiry ){
            return this.deauthHandler();
        }

        if ( this._timestamp_() > this.accessTokenExpiry ){
            await this.newAccessToken()
        }

        handler(this.accessToken);
    }

    setDeauthHandler(handler){
        this.deauthHandler = handler;
    }

    async getUser(){
        if ( !this.isAuthenticated() ){
            return false;
        }

        return new Promise(async (resolve, reject) => {
            try{
                let user = JSON.parse(
                    this.getLocalStorageItem('user-data') || '{}'
                );

                if ( user.user_id ){
                    return resolve(user);
                }
            }catch(e){
                // move ahead
            }

            await axios.get(this.uri('user'), {
                headers:{
                    'x-access-token':this.accessToken
                }
            }).then(({data, status}) => {
                if ( status != 200 ){
                    return resolve(false);
                }

                this.setLocalStorageItem('user-data', JSON.stringify(data.data));
                resolve(data.data);
            }).catch(err => {
                resolve(false);
            });
        });
    }

    _timestamp_(){
        return Math.floor(Date.now() / 1000);
    }

    uri(e){
        return `https://${this.domain}/${this.apiVersion}/${e}`
    }
    
    /* LOCAL STORAGE WARPPERS FOR PREFIXING */

    getLocalStorageItem(key){
        return localStorage.getItem(`${this.localStoragePrefix+key}`);
    }

    setLocalStorageItem(key, value){
        return localStorage.setItem(`${this.localStoragePrefix+key}`, value);
    }

    removeLocalStorageItem(key){
        return localStorage.removeItem(`${this.localStoragePrefix+key}`);
    }
}

export default IDaaSModule;