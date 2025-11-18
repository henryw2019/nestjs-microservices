import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiBaseQueryDto } from '../../../common/dtos/api-query.dto';

export class TransactionListQueryDto extends ApiBaseQueryDto {
    @ApiPropertyOptional({ description: 'Transaction hash', example: '0xabc123...' })
    @IsOptional()
    @IsString()
    hash?: string;

    @ApiPropertyOptional({ description: 'Containing block number', example: '1000000' })
    @IsOptional()
    @IsString()
    blockNumber?: string;

    @ApiPropertyOptional({ description: 'From or To address', example: '0x1234...' })
    @IsOptional()
    @IsString()
    refAddress?: string;
}
