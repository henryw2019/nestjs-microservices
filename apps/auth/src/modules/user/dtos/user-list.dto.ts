import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiBaseQueryDto } from 'src/common/dtos/api-query.dto';

export class UserListDto extends ApiBaseQueryDto {
    @ApiProperty({
        description: 'Filter users by role',
        enum: Role,
        required: false,
    })
    @IsOptional()
    @IsEnum(Role)
    role?: Role;

    @ApiProperty({
        description: 'Filter users by verification status',
        example: true,
        required: false,
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

    @ApiProperty({
        description: 'Filter users by email domain',
        example: 'gmail.com',
        required: false,
    })
    @IsOptional()
    emailDomain?: string;
}
