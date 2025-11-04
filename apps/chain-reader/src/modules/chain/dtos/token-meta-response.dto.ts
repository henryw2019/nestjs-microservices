import { ApiProperty } from '@nestjs/swagger';

export class TokenMetaResponseDto {
    @ApiProperty({ description: 'Token contract address', example: '0xToken...' })
    tokenAddress: string;

    @ApiProperty({ description: 'Token name', example: 'USD Coin', nullable: true })
    name?: string | null;

    @ApiProperty({ description: 'Token symbol', example: 'USDC', nullable: true })
    symbol?: string | null;

    @ApiProperty({ description: 'Token decimals', example: 6, nullable: true })
    decimals?: number | null;

    @ApiProperty({ description: 'Total supply in raw units', example: '1000000000000', nullable: true })
    totalSupply?: string | null;

    @ApiProperty({ description: 'Last update timestamp', example: '2024-01-01T00:00:00.000Z' })
    lastUpdatedAt: string;
}
