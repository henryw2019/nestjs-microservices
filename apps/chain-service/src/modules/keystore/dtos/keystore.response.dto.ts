import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KeystoreResponseDto {
    @ApiProperty({ description: 'Keystore identifier', example: 'ks_123' })
    id!: string;

    @ApiProperty({ description: 'Owner user id', example: 'user-uuid' })
    userId!: string;

    @ApiProperty({ description: 'Ethereum address (checksum)', example: '0x1234...' })
    address!: string;

    @ApiPropertyOptional({ description: 'Account name for user to identify address', example: 'My Main Wallet' })
    accountName?: string;

    @ApiProperty({ description: 'Creation timestamp', example: new Date().toISOString() })
    createdAt!: Date;
}
