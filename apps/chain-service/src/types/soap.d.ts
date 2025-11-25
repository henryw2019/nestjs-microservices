declare module 'soap' {
    export interface ISoapMethod {
        (args: any, callback?: (err: any, result: any) => void): any;
    }
    export interface Client {
        [methodName: string]: any;
        setSecurity(security: any): void;
    }
    export function createClientAsync(url: string, options?: any): Promise<Client>;
    export const BasicAuthSecurity: new (username: string, password: string) => any;
}
