import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiBaseQueryDto } from '../../../common/dtos/api-query.dto';

export class Erc20TransferListQueryDto extends ApiBaseQueryDto {
    @ApiPropertyOptional({ description: 'Transaction hash', example: '0xabc123...' })
    @IsOptional()
    @IsString()
    txHash?: string;

    @ApiPropertyOptional({ description: 'Token contract address', example: '0xToken...' })
    @IsOptional()
    @IsString()
    token?: string;

    @ApiPropertyOptional({ description: 'Sender address', example: '0x1234...' })
    @IsOptional()
    @IsString()
    from?: string;

    @ApiPropertyOptional({ description: 'Recipient address', example: '0x5678...' })
    @IsOptional()
    @IsString()
    to?: string;

    @ApiPropertyOptional({ description: 'Block number', example: '1000000' })
    @IsOptional()
    @IsString()
    blockNumber?: string;

    @ApiPropertyOptional({ description: 'Minimum transferred amount', example: '1000000000000000000' })
    @IsOptional()
    @IsString()
    minValue?: string;

    @ApiPropertyOptional({ description: 'Maximum transferred amount', example: '5000000000000000000' })
    @IsOptional()
    @IsString()
    maxValue?: string;
}
