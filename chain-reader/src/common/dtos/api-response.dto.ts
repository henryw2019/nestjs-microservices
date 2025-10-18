import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export abstract class ApiBaseResponseDto {
    @ApiProperty({ description: 'HTTP status code', example: 200 })
    statusCode: number;

    @ApiProperty({ description: 'ISO8601 timestamp', example: new Date().toISOString() })
    timestamp: string;

    @ApiProperty({ description: 'Localized response message', example: 'Success' })
    message: string;
}

export abstract class ApiResponseDto<T> extends ApiBaseResponseDto {
    abstract data: T;
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
    @ApiProperty({ description: 'Response payload', isArray: true })
    data: T[];

    @ApiProperty({ type: () => PaginationMetaDto })
    @Type(() => PaginationMetaDto)
    meta: PaginationMetaDto;
}

export function SwaggerResponse<TModel>(model: new () => TModel) {
    class SwaggerResponseType extends ApiResponseDto<TModel> {
        @ApiProperty({ type: () => model })
        @Type(() => model)
        data: TModel;
    }

    Object.defineProperty(SwaggerResponseType, 'name', {
        value: `${model.name}Response`,
    });

    return SwaggerResponseType;
}

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
        @ApiProperty({ type: () => PaginatedResultDto })
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
