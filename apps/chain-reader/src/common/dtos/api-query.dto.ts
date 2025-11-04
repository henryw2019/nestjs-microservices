import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class ApiBaseQueryDto {
    @ApiProperty({ description: 'Page number starting from 1', required: false, example: 1 })
    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ description: 'Page size', required: false, example: 25, maximum: 100 })
    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Min(1)
    @Max(100)
    limit?: number = 25;

    @ApiProperty({ description: 'Sorting field', required: false, example: 'timestamp' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiProperty({ description: 'Sorting direction', required: false, example: 'desc', enum: ['asc', 'desc'] })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    @ApiProperty({ description: 'Free text search term', required: false })
    @IsOptional()
    @IsString()
    search?: string;
}
