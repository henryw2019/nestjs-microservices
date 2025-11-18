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

    @ApiPropertyOptional({ description: 'From or To address', example: '0x1234...' })
    @IsOptional()
    @IsString()
    refAddress?: string;

}
