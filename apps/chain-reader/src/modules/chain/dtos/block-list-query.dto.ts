import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiBaseQueryDto } from '../../../common/dtos/api-query.dto';

export class BlockListQueryDto extends ApiBaseQueryDto {
    @ApiPropertyOptional({ description: 'Exact block number', example: '1000000' })
    @IsOptional()
    @IsString()
    number?: string;

    @ApiPropertyOptional({ description: 'Minimum block number (inclusive)', example: '900000' })
    @IsOptional()
    @IsString()
    fromNumber?: string;

    @ApiPropertyOptional({ description: 'Maximum block number (inclusive)', example: '1005000' })
    @IsOptional()
    @IsString()
    toNumber?: string;

    @ApiPropertyOptional({ description: 'Block hash', example: '0xabc123...' })
    @IsOptional()
    @IsString()
    hash?: string;

    @ApiPropertyOptional({ description: 'Minimum timestamp (ISO 8601)', example: '2024-01-01T00:00:00Z' })
    @IsOptional()
    @IsString()
    fromTimestamp?: string;

    @ApiPropertyOptional({ description: 'Maximum timestamp (ISO 8601)', example: '2024-01-02T00:00:00Z' })
    @IsOptional()
    @IsString()
    toTimestamp?: string;
}
