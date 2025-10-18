export interface IApiResponse<T> {
    statusCode: number;
    timestamp: string;
    message: string;
    data: T | null;
}

export interface IErrorResponse {
    statusCode: number;
    timestamp: string;
    message: string;
    path: string;
    method: string;
}
