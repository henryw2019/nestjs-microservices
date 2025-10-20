import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateKeyStoreDto {
    @ApiProperty({ description: 'User id to bind', example: 'user-uuid' })
    @IsString()
    @IsNotEmpty()
    userId!: string;
}
