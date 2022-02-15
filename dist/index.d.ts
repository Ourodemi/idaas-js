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
    public async getUser(): {
        user_id: string,
        username: string,
        full_name: string,
        first_name: string,
        middle_name: string,
        last_name: string,
        email: string,
        groups: string
    };
    public async request(handler: function): void;
    
    /**
     * Creates a new user
     * @param user 
     * @param captcha 
     * @param captchaToken 
     */
    public async createUser(
        user: {
            first_name: string,
            middle_name: string,
            last_name: string,
            display_name: string,
            date_of_birth: string,
            email: string,
            password: string,
            username: string
        },
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