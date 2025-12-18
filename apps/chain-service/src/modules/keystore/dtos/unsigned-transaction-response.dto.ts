import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnsignedTransactionDto {
    @ApiProperty({ description: 'Sender address' })
    from!: string;

    @ApiProperty({ description: 'Recipient address (or contract address)' })
    to!: string;

    @ApiProperty({ description: 'Value in wei' })
    value!: string;

    @ApiProperty({ description: 'Transaction data (hex)' })
    data!: string;

    @ApiProperty({ description: 'Nonce' })
    nonce!: number;

    @ApiProperty({ description: 'Gas limit' })
    gasLimit!: string;

    @ApiPropertyOptional({ description: 'Gas price (Legacy)' })
    gasPrice?: string;

    @ApiPropertyOptional({ description: 'Max fee per gas (EIP-1559)' })
    maxFeePerGas?: string;

    @ApiPropertyOptional({ description: 'Max priority fee per gas (EIP-1559)' })
    maxPriorityFeePerGas?: string;

    @ApiProperty({ description: 'Chain ID' })
    chainId!: number;
}

export class ReadableDataDto {
    @ApiProperty({
        description: 'Transaction type',
        enum: ['ETH_TRANSFER', 'ERC20_TRANSFER', 'CONTRACT_CALL'],
    })
    transactionType!: string;

    @ApiProperty({ description: 'Sender address' })
    from!: string;

    @ApiProperty({ description: 'Recipient address' })
    to!: string;

    @ApiProperty({ description: 'Amount with unit' })
    amount!: string;

    @ApiPropertyOptional({ description: 'Token address' })
    token?: string;

    @ApiPropertyOptional({ description: 'Token symbol' })
    symbol?: string;

    @ApiPropertyOptional({ description: 'Token decimals' })
    decimals?: number;

    @ApiProperty({ description: 'Human readable description' })
    description!: string;
}

export class UnsignedTransactionResponseDto {
    @ApiProperty({ description: 'Unique transaction ID' })
    transactionId!: string;

    @ApiProperty({ description: 'Unsigned transaction object', type: UnsignedTransactionDto })
    transaction!: UnsignedTransactionDto;

    @ApiProperty({ description: 'Expiration time' })
    expiresAt!: string;

    @ApiProperty({ description: 'Human readable transaction summary', type: ReadableDataDto })
    readableData!: ReadableDataDto;

    @ApiProperty({ description: 'Complete JSON string for QR code generation' })
    qrCodeData!: string;
}
