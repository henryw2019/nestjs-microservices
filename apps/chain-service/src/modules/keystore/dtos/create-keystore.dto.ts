import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { KeyType } from '@repo/database/chain-service';

export class CreateKeyStoreDto {
    @ApiPropertyOptional({
        description: 'Account name for user to identify address',
        example: 'My Main Wallet',
    })
    @IsOptional()
    @IsString()
    accountName?: string;

    @ApiPropertyOptional({
        description: 'Network name',
        example: 'ethereum',
    })
    @IsOptional()
    @IsString()
    network?: string;

    @ApiPropertyOptional({
        description: 'Chain ID',
        example: 1,
    })
    @IsOptional()
    @IsNumber()
    chainId?: number;

    @ApiPropertyOptional({
        description: 'Key type',
        enum: KeyType,
        default: KeyType.HOSTED,
    })
    @IsOptional()
    @IsEnum(KeyType)
    keyType?: KeyType;

    @ApiPropertyOptional({
        description: 'Address (required if not HOSTED)',
        example: '0x123...',
    })
    @IsOptional()
    @IsString()
    address?: string;
}
