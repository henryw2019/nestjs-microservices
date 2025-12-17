import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KeyType } from '@repo/database/chain-service';
import { Expose } from 'class-transformer';

export class KeystoreResponseDto {
    @Expose()
    @ApiProperty({ description: 'Keystore identifier', example: 'ks_123' })
    id!: string;

    @Expose()
    @ApiProperty({ description: 'Owner user id', example: 'user-uuid' })
    userId!: string;

    @Expose()
    @ApiProperty({ description: 'Ethereum address (checksum)', example: '0x1234...' })
    address!: string;

    @Expose()
    @ApiPropertyOptional({
        description: 'Account name for user to identify address',
        example: 'My Main Wallet',
    })
    accountName?: string;

    @Expose()
    @ApiPropertyOptional({ description: 'Network', example: 'ethereum' })
    network?: string;

    @Expose()
    @ApiPropertyOptional({ description: 'Chain ID', example: 1 })
    chainId?: number;

    @Expose()
    @ApiProperty({ description: 'Key Type', enum: KeyType, example: KeyType.HOSTED })
    keyType!: KeyType;

    @Expose()
    @ApiProperty({ description: 'Creation timestamp', example: new Date().toISOString() })
    createdAt!: Date;

    @Expose()
    @ApiProperty({ description: 'Last update timestamp', example: new Date().toISOString() })
    updatedAt!: Date;
}
