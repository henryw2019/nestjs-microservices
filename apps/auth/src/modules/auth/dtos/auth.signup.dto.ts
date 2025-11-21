import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class AuthSignupDto {
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

    @ApiProperty({
        description: 'User first name',
        example: 'John',
        required: false,
    })
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
        required: false,
    })
    @IsString()
    @IsOptional()
    lastName?: string;
}
