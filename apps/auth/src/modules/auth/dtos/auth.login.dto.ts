import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AuthLoginDto {
    @ApiProperty({
        description: 'User email address',
        example: 'test@example.com',
        format: 'email',
    })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({
        description: 'User password (minimum 8 characters)',
        example: 'password123',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password!: string;
}
