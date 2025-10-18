import { ApiProperty } from '@nestjs/swagger';

export class Erc20TransferResponseDto {
    @ApiProperty({ description: 'Transfer identifier', example: '1' })
    id: string;

    @ApiProperty({ description: 'Transaction hash', example: '0xabc123...' })
    txHash: string;

    @ApiProperty({ description: 'Associated block number', example: '1000000' })
    blockNumber: string;

    @ApiProperty({ description: 'Log index in transaction receipt', example: 0 })
    logIndex: number;

    @ApiProperty({ description: 'Token contract address', example: '0xToken...' })
    token: string;

    @ApiProperty({ description: 'Sender address', example: '0x1234...' })
    from: string;

    @ApiProperty({ description: 'Recipient address', example: '0x5678...' })
    to: string;

    @ApiProperty({ description: 'Transfer value (raw units)', example: '1000000000000000000' })
    value: string;
}
