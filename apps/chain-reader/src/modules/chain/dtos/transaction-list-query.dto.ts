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

    @ApiPropertyOptional({ description: 'Sender address', example: '0x1234...' })
    @IsOptional()
    @IsString()
    from?: string;

    @ApiPropertyOptional({ description: 'Recipient address', example: '0x5678...' })
    @IsOptional()
    @IsString()
    to?: string;

    @ApiPropertyOptional({ description: 'Minimum value in wei', example: '1000000000000000000' })
    @IsOptional()
    @IsString()
    minValue?: string;

    @ApiPropertyOptional({ description: 'Maximum value in wei', example: '5000000000000000000' })
    @IsOptional()
    @IsString()
    maxValue?: string;
}
