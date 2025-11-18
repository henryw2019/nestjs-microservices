import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, Matches, IsUrl } from 'class-validator';

export class UserUpdateDto {
    @ApiProperty({
        description: 'User email address',
        required: false,
        format: 'email',
    })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({
        description: 'User Identification number',
        required: false,
    })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiProperty({
        description: 'User name',
        required: false,
    })
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiProperty({
        description: 'User last name',
        required: false,
    })
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiProperty({
        description: 'User profile picture URL',
        required: false,
        format: 'uri',
    })
    @IsOptional()
    @IsUrl()
    avatar?: string;
}
