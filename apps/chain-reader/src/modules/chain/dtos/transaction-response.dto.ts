import { ApiProperty } from '@nestjs/swagger';

export class TransactionResponseDto {
    @ApiProperty({ description: 'Transaction hash', example: '0xabc123...' })
    hash!: string;

    @ApiProperty({ description: 'Block number containing the transaction', example: '1000000' })
    blockNumber!: string;

    @ApiProperty({ description: 'Sender address', example: '0x1234...' })
    from!: string;

    @ApiProperty({ description: 'Recipient address', example: '0x5678...' })
    to?: string | null;

    @ApiProperty({ description: 'Transaction value in wei', example: '1000000000000000000' })
    value!: string;

    @ApiProperty({
        description: 'Gas used (wei) as BigInt string',
        example: '21000',
        required: false,
    })
    gasUsed?: string | null;

    @ApiProperty({
        description: 'Gas fee paid (wei)',
        example: '2100000000000000',
        required: false,
    })
    gasFee?: string | null;

    @ApiProperty({
        description: 'From address balance after transaction (wei)',
        example: '1000000000000000000',
        required: false,
    })
    balanceAfter?: string | null;

    @ApiProperty({ description: 'Transaction nonce', example: 1, required: false })
    nonce?: number | null;

    @ApiProperty({ description: 'Input/data payload', example: '0x', required: false })
    input?: string | null;

    @ApiProperty({
        description: 'Transaction status (1=success,0=failed)',
        example: 1,
        required: false,
    })
    status?: number | null;

    @ApiProperty({
        description: 'Block timestamp as ISO string',
        example: '2025-10-22T12:34:56.000Z',
        required: false,
    })
    timestamp?: string | null;
}
