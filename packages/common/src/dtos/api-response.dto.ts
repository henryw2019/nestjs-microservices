import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Base API response shape shared by HTTP services
export abstract class ApiBaseResponseDto {
    @ApiProperty({ description: 'HTTP status code', example: 200 })
    statusCode: number;

    @ApiProperty({ description: 'Response timestamp in ISO8601 format', example: new Date().toISOString() })
    timestamp: string;

    @ApiProperty({ description: 'Localized response message', example: 'Success' })
    message: string | string[];
}

// Generic response wrapper with strongly typed payloads
export abstract class ApiResponseDto<T> extends ApiBaseResponseDto {
    abstract data: T | null;
}

export class SwaggerGenericResponse extends ApiBaseResponseDto {}

// Builds a Swagger response type for a single resource payload
export function SwaggerResponse<TModel>(model: new () => TModel) {
    class SwaggerResponseType extends ApiResponseDto<TModel> {
        @ApiProperty({ type: () => model, description: 'Response data' })
        @Type(() => model)
        data: TModel;
    }

    Object.defineProperty(SwaggerResponseType, 'name', {
        value: `${model.name}Response`,
    });

    return SwaggerResponseType;
}

// Builds a Swagger response type for array payloads
export function SwaggerArrayResponse<TModel>(model: new () => TModel) {
    class SwaggerResponseType extends ApiResponseDto<TModel[]> {
        @ApiProperty({ type: () => model, isArray: true, description: 'Array response data' })
        @Type(() => model)
        data: TModel[];
    }

    Object.defineProperty(SwaggerResponseType, 'name', {
        value: `${model.name}ArrayResponse`,
    });

    return SwaggerResponseType;
}

export class PaginationMetaDto {
    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 10 })
    limit: number;

    @ApiProperty({ example: 100 })
    total: number;

    @ApiProperty({ example: 10 })
    totalPages: number;

    @ApiProperty({ example: true })
    hasNextPage: boolean;

    @ApiProperty({ example: false })
    hasPreviousPage: boolean;
}

export class PaginatedApiResponseDto<T> extends ApiBaseResponseDto {
    @ApiProperty({ description: 'Array of items in the current page' })
    data: T[];

    @ApiProperty({ type: () => PaginationMetaDto })
    @Type(() => PaginationMetaDto)
    meta: PaginationMetaDto;
}

export interface PaginatedData<T> {
    items: T[];
    meta: PaginationMetaDto;
}

// Builds a Swagger response type for paginated payloads
export function SwaggerPaginatedResponse<TModel>(model: new () => TModel) {
    class PaginatedResultDto {
        @ApiProperty({ isArray: true, type: () => model })
        @Type(() => model)
        items: TModel[];

        @ApiProperty({ type: () => PaginationMetaDto })
        @Type(() => PaginationMetaDto)
        meta: PaginationMetaDto;
    }

    class SwaggerResponseType extends ApiResponseDto<PaginatedResultDto> {
        @ApiProperty({ type: () => PaginatedResultDto, description: 'Paginated response payload' })
        @Type(() => PaginatedResultDto)
        data: PaginatedResultDto;
    }

    Object.defineProperty(PaginatedResultDto, 'name', {
        value: `${model.name}PaginatedResult`,
    });

    Object.defineProperty(SwaggerResponseType, 'name', {
        value: `${model.name}PaginatedResponse`,
    });

    return SwaggerResponseType;
}
