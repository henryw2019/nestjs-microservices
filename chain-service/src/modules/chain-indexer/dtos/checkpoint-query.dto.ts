import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CheckpointQueryDto {
    @ApiPropertyOptional({ description: 'Chain identifier to filter checkpoints by', example: 31337 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    chainId?: number;

    @ApiPropertyOptional({ description: 'Transaction hash related to the checkpoint', example: '0xdeadbeef...' })
    @IsOptional()
    @IsString()
    txHash?: string;

    @ApiPropertyOptional({ description: 'Contract address related to the checkpoint', example: '0xcontract...' })
    @IsOptional()
    @IsString()
    contractAddress?: string;
}
