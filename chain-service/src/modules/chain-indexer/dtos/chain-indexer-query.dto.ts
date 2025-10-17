import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class BlockQueryDto {
    @ApiPropertyOptional({ description: 'Block number', example: 128 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 })
    number?: number;

    @ApiPropertyOptional({ description: 'Block hash', example: '0xabc123...' })
    @IsOptional()
    @IsString()
    hash?: string;
}

export class TransactionQueryDto {
    @ApiPropertyOptional({ description: 'Transaction hash', example: '0xdeadbeef...' })
    @IsOptional()
    @IsString()
    hash?: string;

    @ApiPropertyOptional({ description: 'Sender address', example: '0xaabbcc...' })
    @IsOptional()
    @IsString()
    from?: string;

    @ApiPropertyOptional({ description: 'Recipient address', example: '0xddeeff...' })
    @IsOptional()
    @IsString()
    to?: string;
}

export class Erc20TransferQueryDto {
    @ApiPropertyOptional({ description: 'Transaction hash', example: '0xdeadbeef...' })
    @IsOptional()
    @IsString()
    txHash?: string;

    @ApiPropertyOptional({ description: 'Token contract address', example: '0xToken...' })
    @IsOptional()
    @IsString()
    token?: string;

    @ApiPropertyOptional({ description: 'Sender address', example: '0xfrom...' })
    @IsOptional()
    @IsString()
    from?: string;

    @ApiPropertyOptional({ description: 'Recipient address', example: '0xto...' })
    @IsOptional()
    @IsString()
    to?: string;
}

export class EventLogQueryDto {
    @ApiPropertyOptional({ description: 'Transaction hash', example: '0xdeadbeef...' })
    @IsOptional()
    @IsString()
    txHash?: string;

    @ApiPropertyOptional({ description: 'Contract address', example: '0xcontract...' })
    @IsOptional()
    @IsString()
    contractAddress?: string;
}

export class AddressBalanceQueryDto {
    @ApiPropertyOptional({ description: 'Account address', example: '0xholder...' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ description: 'Token contract address', example: '0xToken...' })
    @IsOptional()
    @IsString()
    tokenAddress?: string;
}

export class TokenMetaQueryDto {
    @ApiProperty({ description: 'Token contract address', example: '0xToken...' })
    @IsString()
    @IsNotEmpty()
    tokenAddress!: string;
}
