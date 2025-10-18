import { ApiProperty } from '@nestjs/swagger';

export class AddressBalanceResponseDto {
    @ApiProperty({ description: 'Balance identifier', example: '1' })
    id: string;

    @ApiProperty({ description: 'Wallet address', example: '0x1234...' })
    address: string;

    @ApiProperty({ description: 'Token address (null for native balance)', example: '0xToken...' })
    tokenAddress?: string | null;

    @ApiProperty({ description: 'Balance in raw units', example: '1000000000000000000' })
    balance: string;

    @ApiProperty({ description: 'Last update timestamp', example: '2024-01-01T00:00:00.000Z' })
    lastUpdatedAt: string;
}
