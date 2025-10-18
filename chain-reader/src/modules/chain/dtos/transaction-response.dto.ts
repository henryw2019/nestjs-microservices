import { ApiProperty } from '@nestjs/swagger';

export class TransactionResponseDto {
    @ApiProperty({ description: 'Transaction hash', example: '0xabc123...' })
    hash: string;

    @ApiProperty({ description: 'Block number containing the transaction', example: '1000000' })
    blockNumber: string;

    @ApiProperty({ description: 'Sender address', example: '0x1234...' })
    from: string;

    @ApiProperty({ description: 'Recipient address', example: '0x5678...' })
    to?: string | null;

    @ApiProperty({ description: 'Transaction value in wei', example: '1000000000000000000' })
    value: string;
}
