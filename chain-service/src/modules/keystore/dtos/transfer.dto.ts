import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class TransferDto {
    @ApiProperty({ description: 'To address', example: '0xabc...' })
    @IsString()
    @IsNotEmpty()
    to!: string;

    @ApiProperty({ description: 'Amount in wei as string', example: '1000000000000000000' })
    @IsString()
    @IsNotEmpty()
    amount!: string;

    @ApiProperty({ description: 'Optional token contract address for ERC20 transfer', example: '0xToken...' })
    @IsOptional()
    @IsString()
    token?: string;

    @ApiProperty({ description: 'Optional gas limit' })
    @IsOptional()
    @IsNumberString()
    gasLimit?: string;
}
