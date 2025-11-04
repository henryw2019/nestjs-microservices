import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { UserUpdateDto } from './user.update.dto';

export class UserAdminUpdateDto extends UserUpdateDto {
    @ApiProperty({
        description: 'User role in the system',
        enum: Role,
        required: false,
    })
    @IsOptional()
    @IsEnum(Role)
    role?: Role;

    @ApiProperty({
        description: 'Email verification status',
        required: false,
        example: true,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
        }
        if (value === 1 || value === '1') return true;
        if (value === 0 || value === '0') return false;
        return value;
    })
    @IsBoolean()
    isVerified?: boolean;
}
