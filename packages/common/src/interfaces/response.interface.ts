// Shared response interfaces that mirror the DTO shapes
export interface IApiBaseResponse {
    statusCode: number;
    timestamp: string;
    message: string | string[];
}

export interface IApiResponse<T = unknown> extends IApiBaseResponse {
    data: T | null;
}

export interface IPaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface IPaginatedData<T = unknown> {
    items: T[];
    meta: IPaginationMeta;
}

export interface IApiPaginatedResponse<T = unknown> extends IApiBaseResponse {
    data: IPaginatedData<T>;
}

export interface IErrorResponse extends IApiBaseResponse {
    path: string;
    method: string;
    error?: string;
    stack?: string;
}
