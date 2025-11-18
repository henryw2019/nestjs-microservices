import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateKeyStoreDto {
    @ApiPropertyOptional({
        description: 'Account name for user to identify address',
        example: 'My Main Wallet',
    })
    @IsOptional()
    @IsString()
    accountName?: string;
}
