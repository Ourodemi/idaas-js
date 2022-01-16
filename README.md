
# @ourodemi/idaas-js

A Javascript library that implements Ourodemi's 
Identity as a Service API. The HTTP API for IDaaS
can be found on our [website here](https://ourodemi.com/docs)


## Features

- Manage Access & Refresh Tokens
- Queue API Requests
- Obtain & Validate Captchas
- Create New User Accounts

**Note**: for React Native, see 
[@ourodemi/idaas-rn](https://www.npmjs.com/package/@ourodemi/idaas-rn)
## Usage/Examples

Wrap your API calls inside the `.request()` function as shown below

```javascript
import IDaaSModule from '@ourodemi/idaas-js';

var AuthModule = new IDaaSModule('myapp-xyz.ourodemi.com');

AuthModule.request(function handler(accessToken){
    // your backend request here
    axios.get('myapi.com/endpoint', {
        headers:{
            'x-access-token': accessToken
        }
    }).then({data, status} => {
        // handle response
    }).catch(err => {
        // handle error
    });
});

```

**Note: You must use the same instance of IDaaS module for all
your requests**


## API Reference

#### Available methods

| Method | Returns     | Description                |
| :-------- | :------- | :------------------------- |
| auth(`{email, username, password}`) | `true\|false` | Attempts to authenticate with the specified credentials |
| deauth() | `true\|false` | Sends a request to invalidate the refresh token and removes it from local storage |
| isAuthenticated() | `true\|false` | Checks if the refresh token is valid |
| setDeauthHandler() | `void` | Sets the deauthHandler() which is invoked when the current session is invalidated |
| getUser() | `object` | Returns current user's profile. See user object below |

#### User Object
```json
{
    "user_id": "cdad02ec-1e45-458b-8f94-c180a6ef95da",
    "username": "talha",
    "name": "Talha",
    "email": "talha@example.com",
    "groups": [
        "standard"
    ]
}
```
## Badges

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs)


## Feedback

If you have any feedback, please reach out to us at developers@ourodemi.com

