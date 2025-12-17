import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiBaseQueryDto } from '@/common/dtos/api-query.dto';
import { KeyType } from '@repo/database/chain-service';

export class KeystoreQueryDto extends ApiBaseQueryDto {
    @ApiPropertyOptional({ description: 'Filter by network', example: 'ethereum' })
    @IsOptional()
    @IsString()
    network?: string;

    @ApiPropertyOptional({ description: 'Filter by key type', enum: KeyType })
    @IsOptional()
    @IsEnum(KeyType)
    keyType?: KeyType;
}
