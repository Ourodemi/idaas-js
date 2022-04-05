/** Official Ourodemi Identity React SDK **/

 const axios = require('axios').default;

 class IDaaSModule{
     apiVersion = 'v1';
     isRefreshing = false;
     accessTokenStatus = false;
 
     deauthHandler = function(){};

     localIdentity = {}

     localIdentityDefaults = {
         refresh_token: undefined,
         refresh_token_expiry: 0,
         access_token: undefined,
         access_token_expiry: 0,
         user: {}
     }
 
     constructor(domain, options = {}){
         const { apiVersion } = options;
         this.apiVersion = apiVersion;

         this.domain = domain;
         this.loadLocalIdentity();       
     }
 
     async isAuthenticated(){
         return new Promise(async (resolve, reject) => {
             // check for a valid refresh token
             if ( !this.refresh_token || 
                 this._timestamp_() > this.refresh_token_expiry ){
                 return resolve(false);
             }
 
             // check for a valid access token
             if ( this.access_token && 
                 this.access_token_expiry > this._timestamp_() ){
                 this.accessTokenStatus = true;
                 return resolve(true); 
             }
 
             // try to obtain a new access token
            this.newAccessToken().then(status => {
                resolve(status);
            });
         });
     }
 
     async auth({ email, username, password }){
         return new Promise((resolve, reject) => {
             axios.post(this.uri('auth'), {
                 email, username, password
             }).then(({data , status}) => {
                if ( status !== 200 && status !== 201 ){
                    return resolve(false);
                }
                 
                let { 
                    refresh_token, access_token, 
                    refresh_token_expiry, access_token_expiry,
                    user
                } = data.data;
                 
                if ( !refresh_token ){
                    return resolve(false);
                }
                 
                user.full_name = this.get_full_name(user); 

                this.updateLocalIdentity({
                    refresh_token, access_token,
                    refresh_token_expiry, access_token_expiry,
                    user
                });
 
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
             if ( !this.captcha_token ){
                 return resolve(false);
             }
 
             axios.get(this.uri('sso'), {
                 headers: {
                     'x-captcha-token': this.captcha_token,
                     'x-captcha-string': captcha
                 },
                 query: { email, phone }
             }).then(({ data, status }) => {
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
             if ( !this.refresh_token ){
                 return resolve(false);
             }
  
             axios.delete(this.uri('auth'), {
                 headers:{
                     'x-refresh-token': this.refresh_token
                 }
             }).then(res => {
                 resolve(true);
             }).catch(err => {
                 resolve(false);
             });

             this.clearLocalIdentity();
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
            if ( this.isRefreshing ){
                var that = this;
                let intervalId = setInterval(() => {
                    if ( !this.isRefreshing ){
                        clearInterval(intervalId);
                        resolve(that.accessTokenStatus)
                    }
                }, 500);
                return;
            }

            if ( !this.refresh_token ){
                this.accessTokenStatus = false;
                this.isRefreshing = false;
                this.cleanup();
                this.deauthHandler(false);
                return resolve(false);
            }

            this.isRefreshing = true;

            axios.get(this.uri('auth'), {headers:{
                'x-refresh-token': this.refresh_token
            }}).then(({data, status}) => {
                let { access_token, access_token_expiry, user } = data.data || {};
                
                if ( !access_token ){
                    this.cleanup();
                    this.accessTokenStatus = false;
                    resolve(false);
                    return this.deauthHandler({ status });
                }

                user.full_name =this.get_full_name(user); 

                this.updateLocalIdentity({
                    access_token,
                    access_token_expiry,
                    user
                })

                this.accessTokenStatus = true;
                this.isRefreshing = false;

                resolve(true);
            }).catch(err => {
            this.isRefreshing = false;
            resolve(false);
            return this.deauthHandler({ status: 500 })
            });
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
         if ( this._timestamp_() > this.refresh_token_expiry ){
             return this.deauthHandler();
         }
 
         if ( this._timestamp_() > this.access_token_expiry ){
             await this.newAccessToken()
         }
 
         handler(this.access_token);
     }
 
     setDeauthHandler(handler){
         this.deauthHandler = handler;
     }
 
     async getUser(){
         if ( !this.isAuthenticated() ){
             return false;
         }
 
         return new Promise(async (resolve, reject) => {
            if ( this.user.user_id ){
                return resolve(this.user);
            }
 
            await axios.get(this.uri('user'), {
                headers:{
                    'x-access-token':this.access_token
                }
            }).then(({data, status}) => {
                let user = data.data;

                if ( status != 200 && status != 201 ){
                    return resolve(false);
                }

                user.full_name = this.get_full_name(user);
                this.updateLocalIdentity({ user });

                resolve(user);
            }).catch(err => {
                resolve(false);
            });
         });
     }
 
     async createRegistrationToken(user, captcha, captcha_token){
         return new Promise(async (resolve, reject) => {
             await axios.post(this.uri('user'), user, {
                 headers: {
                     'x-captcha-token': captcha_token,
                     'x-captcha-string': captcha
                 }
             }).then(({data, status}) => {
                 const { code, data = {} } = data;
                 
                 resolve({
                     code,
                     status,
                     registration_token: data.registration_token
                 });
             }).catch(({response}) => resolve(this.expandResponse(response.data)))
         });
     }

     async verifyRegistration(registration_token, verification_code){
        return new Promise(async (resolve, reject) => {
            await axios.patch(this.uri('user'), {
                registration_token,
                verification_code
            }).then(({data, status}) => {
                let { code, data = {} } = data;

                if ( status == 200 ){
                    let {
                        refresh_token, access_token,
                        refresh_token_expiry, access_token_expiry,
                        user
                    } = data;

                    user.full_name = this.get_full_name(user);
                    this.accessTokenStatus = true;
                    
                    this.updateLocalIdentity({
                        refresh_token, access_token,
                        refresh_token_expiry, access_token_expiry,
                        user
                    });
                }

                resolve({code, status, ...data || {}});
            }).catch(({response}) => resolve(this.expandResponse(response.data)))
        });
     }

     expandResponse(res){
        return {
            status: res.status || 500,
            code: res.code || 'connection_failure',
            ...res.data || {}
        }
     }
 
     _timestamp_(){
         return Math.floor(Date.now() / 1000);
     }
 
     get_full_name(user){
         const { first_name, last_name, middle_name } = user;
         return `${first_name} ${middle_name ? middle_name+' ' : ''}${last_name}`;
     }
 
     uri(e){
         return `https://${this.domain}/${this.apiVersion}/${e}`;
     }
     
     // a local identity should be isolated into another class
     // instead of being expanded globally

     updateLocalIdentity(obj){
        this.localIdentity = {...this.localIdentity, ...obj};
        Object.keys(obj).map(key => this[key] = obj[key]); 
        this.commitLocalIdentity();
     }

     clearLocalIdentity(){
        Object.keys(obj).map(key => this[key] = undefined);
        this.localIdentity = {...this.localIdentityDefaults}; 
        this.commitLocalIdentity();
     }
     
    loadLocalIdentity(){
        try{
            this.localIdentity = JSON.parse(
                this.getLocalStorageItem(':identity:0')
            ) || {...this.localIdentityDefaults};
        }catch(e){
            this.localIdentity = {...this.localIdentityDefaults};
            this.commitLocalIdentity();
        }
    }

    commitLocalIdentity(){
        this.setLocalStorageItem(':identity:0', JSON.stringify(this.localIdentity));
    }

    getLocalStorageItem(key){
        return localStorage.getItem(`${this.domain+key}`);
    }

    setLocalStorageItem(key, value){
        return localStorage.setItem(`${this.domain+key}`, value);
    }

    removeLocalStorageItem(key){
        return localStorage.removeItem(`${this.domain+key}`);
    }
 }
 
 module.exports = IDaaSModule;