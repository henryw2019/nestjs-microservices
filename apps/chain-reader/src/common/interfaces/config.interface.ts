export interface IAppConfig {
    env: string;
    name: string;
    versioning: {
        enable: boolean;
        prefix: string;
        version: string;
    };
    http: {
        host: string;
        port: number;
    };
    cors: {
        origin: boolean | string[];
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: string[];
        credentials: boolean;
    };
    sentry?: {
        dsn?: string;
        env: string;
    };
    debug: boolean;
    logLevel: string;
}

export interface IDocConfig {
    name: string;
    description: string;
    version: string;
    prefix: string;
}

export interface ICacheConfig {
    ttlSeconds: number;
    maxItems: number;
}

export interface IRedisConfig {
    url?: string;
    keyPrefix: string;
}
