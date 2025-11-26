import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
    @ApiProperty({ example: '1000000000000000000', description: 'Amount in raw units (wei)' })
    @IsNumberString()
    @IsNotEmpty()
    amount!: string;

    @ApiProperty({ example: '0x...', description: 'Stablecoin Contract Address' })
    @IsString()
    @IsNotEmpty()
    currencyContractAddress!: string;

    @ApiProperty({ example: '0x...', description: 'User Wallet Address to receive tokens' })
    @IsString()
    @IsNotEmpty()
    receivingAddress!: string;
}

export class CreateRedemptionDto {
    @ApiProperty({ example: '1000000000000000000', description: 'Amount in raw units (wei)' })
    @IsNumberString()
    @IsNotEmpty()
    amount!: string;

    @ApiProperty({ example: '0x...', description: 'Stablecoin Contract Address' })
    @IsString()
    @IsNotEmpty()
    currencyContractAddress!: string;

    @ApiProperty({ example: 'Bank of America', description: 'Bank Name' })
    @IsString()
    @IsNotEmpty()
    bankName!: string;

    @ApiProperty({ example: 'John Doe', description: 'Account Holder Name' })
    @IsString()
    @IsNotEmpty()
    accountName!: string;

    @ApiProperty({ example: '1234567890', description: 'Account Number' })
    @IsString()
    @IsNotEmpty()
    accountNumber!: string;
}
