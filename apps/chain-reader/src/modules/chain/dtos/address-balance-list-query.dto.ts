import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiBaseQueryDto } from '../../../common/dtos/api-query.dto';

export class AddressBalanceListQueryDto extends ApiBaseQueryDto {
    @ApiPropertyOptional({ description: 'Wallet address', example: '0x1234...' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ description: 'Token contract address. Empty for native balance', example: '0xToken...' })
    @IsOptional()
    @IsString()
    tokenAddress?: string;
}
