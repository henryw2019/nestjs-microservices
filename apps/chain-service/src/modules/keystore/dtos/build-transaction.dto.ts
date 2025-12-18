import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEthereumAddress, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { coerceBigNumberish } from '../../../common/dtos/transformers';

export class BuildTransactionDto {
    @ApiProperty({ description: 'Sender address', example: '0xA1b2...1234' })
    @IsEthereumAddress()
    @IsNotEmpty()
    readonly from!: string;

    @ApiProperty({
        description: 'Recipient address (or token recipient for ERC20)',
        example: '0x9F8e...AbCd',
    })
    @IsEthereumAddress()
    @IsNotEmpty()
    readonly to!: string;

    @ApiProperty({
        description: 'Amount in wei (ETH) or smallest unit (ERC20)',
        example: '10000000000000000',
    })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsString()
    @IsNotEmpty()
    readonly amount!: string;

    @ApiPropertyOptional({
        description: 'ERC20 token contract address. If present, this is an ERC20 transfer',
        example: '0xDAC17F958D2ee523a2206206994597C13D831ec7',
    })
    @IsOptional()
    @IsEthereumAddress()
    readonly token?: string;

    @ApiPropertyOptional({ description: 'Optional gas limit override', example: '21000' })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsOptional()
    @IsString()
    readonly gasLimit?: string;

    @ApiPropertyOptional({
        description: 'Optional gas price override (Legacy)',
        example: '1000000000',
    })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsOptional()
    @IsString()
    readonly gasPrice?: string;

    @ApiPropertyOptional({
        description: 'Optional max fee per gas (EIP-1559)',
        example: '2000000000',
    })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsOptional()
    @IsString()
    readonly maxFeePerGas?: string;

    @ApiPropertyOptional({
        description: 'Optional max priority fee per gas (EIP-1559)',
        example: '1500000000',
    })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsOptional()
    @IsString()
    readonly maxPriorityFeePerGas?: string;

    @ApiPropertyOptional({ description: 'Chain ID override', example: 31337 })
    @IsOptional()
    readonly chainId?: number;
}
