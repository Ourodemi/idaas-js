export default class IDaaSModule{
    refreshToken: string;
    accessToken: string;
    captchaToken: string;

    apiVersion: string;
    localStoragePrefix: string;

    deauthHandler(): void;

    isRefreshing: boolean;

    constructor(domain: string): void;

    public async auth(): boolean;
    public async deauth(): void;
    public async isAuthenticated(): Promise;
    public async newAccessToken(force: boolean): boolean;
    public async getUser(): object;
    public async request(handler: function): void;
    
    public async createUser(
        user: object, 
        captcha: string, 
        captchaToken: string
    ): Promise;

    public setDeauthHandler(handler: function): void;

    private _timestamp_(): BigInteger;
    private uri(e): string;
    
    private getLocalStorageItem(key: string): string|boolean;
    private setLocalStorageItem(key: string): boolean;
    private removeLocalStorageItem(key: string): boolean;
}