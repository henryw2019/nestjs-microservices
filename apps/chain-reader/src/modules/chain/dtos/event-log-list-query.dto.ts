import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { ApiBaseQueryDto } from '../../../common/dtos/api-query.dto';

export class EventLogListQueryDto extends ApiBaseQueryDto {
    @ApiPropertyOptional({ description: 'Chain identifier', example: '1' })
    @IsOptional()
    @IsString()
    chainId?: string;

    @ApiPropertyOptional({ description: 'Block number', example: '1000000' })
    @IsOptional()
    @IsString()
    blockNumber?: string;

    @ApiPropertyOptional({ description: 'Transaction hash', example: '0xabc123...' })
    @IsOptional()
    @IsString()
    txHash?: string;

    @ApiPropertyOptional({ description: 'Contract address', example: '0xContract...' })
    @IsOptional()
    @IsString()
    contractAddress?: string;

    @ApiPropertyOptional({ description: 'Event name', example: 'Transfer' })
    @IsOptional()
    @IsString()
    eventName?: string;

    @ApiPropertyOptional({ description: 'Event signature hash', example: '0xddf252ad...' })
    @IsOptional()
    @IsString()
    eventSignature?: string;

    @ApiPropertyOptional({ description: 'Processed flag', example: 'true' })
    @IsOptional()
    @IsBooleanString()
    processed?: string;
}
