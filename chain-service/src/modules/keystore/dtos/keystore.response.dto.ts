import { ApiProperty } from '@nestjs/swagger';

export class KeystoreResponseDto {
    @ApiProperty({ description: 'Keystore identifier', example: 'ks_123' })
    id!: string;

    @ApiProperty({ description: 'Owner user id', example: 'user-uuid' })
    userId!: string;

    @ApiProperty({ description: 'Ethereum address (checksum)', example: '0x1234...' })
    address!: string;

    @ApiProperty({ description: 'Creation timestamp', example: new Date().toISOString() })
    createdAt!: Date;
}
