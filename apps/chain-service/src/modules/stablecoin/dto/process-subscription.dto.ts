import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessSubscriptionDto {
    @ApiProperty({ description: 'The admin wallet address to send tokens from' })
    @IsString()
    @IsNotEmpty()
    fromAddress!: string;
}
