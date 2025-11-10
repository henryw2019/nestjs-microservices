import { ApiProperty } from '@nestjs/swagger';

export class TransferResponseDto {
    @ApiProperty({ description: 'Transaction hash', example: '0xabc123' })
    hash!: string;

    @ApiProperty({ description: 'Sender address', example: '0xSender' })
    from!: string;

    @ApiProperty({ description: 'Recipient address', example: '0xRecipient' })
    to!: string;

    @ApiProperty({ description: 'Transfer amount in wei', example: '1000000000000000000' })
    amount!: string;

    @ApiProperty({
        description: 'ERC20 token contract address (if applicable)',
        example: '0xToken',
        required: false,
    })
    token?: string;

    @ApiProperty({ description: 'Transaction nonce', example: 12 })
    nonce!: number;

    @ApiProperty({ description: 'Chain identifier for the broadcast transaction', example: 31337 })
    chainId!: number;

    @ApiProperty({
        description: 'Gas limit used for the transaction',
        example: '21000',
        required: false,
    })
    gasLimit?: string;
}
