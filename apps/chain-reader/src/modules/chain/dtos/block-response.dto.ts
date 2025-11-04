import { ApiProperty } from '@nestjs/swagger';

export class BlockResponseDto {
    @ApiProperty({ description: 'Block number', example: '1000000' })
    number: string;

    @ApiProperty({ description: 'Block hash', example: '0xabc123...' })
    hash: string;

    @ApiProperty({ description: 'Block timestamp (ISO string)', example: '2024-01-01T00:00:00.000Z' })
    timestamp: string;

    @ApiProperty({ description: 'Number of transactions in the block', example: 120 })
    transactionCount: number;

    @ApiProperty({ description: 'Number of ERC20 transfers in the block', example: 15 })
    erc20TransferCount: number;

    @ApiProperty({ description: 'Number of event logs emitted in the block', example: 30 })
    eventLogCount: number;
}
