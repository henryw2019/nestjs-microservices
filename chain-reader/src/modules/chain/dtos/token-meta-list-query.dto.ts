import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiBaseQueryDto } from '../../../common/dtos/api-query.dto';

export class TokenMetaListQueryDto extends ApiBaseQueryDto {
    @ApiPropertyOptional({ description: 'Token contract address', example: '0xToken...' })
    @IsOptional()
    @IsString()
    tokenAddress?: string;

    @ApiPropertyOptional({ description: 'Token symbol (case insensitive)', example: 'USDC' })
    @IsOptional()
    @IsString()
    symbol?: string;

    @ApiPropertyOptional({ description: 'Token name (case insensitive)', example: 'USD Coin' })
    @IsOptional()
    @IsString()
    name?: string;
}
