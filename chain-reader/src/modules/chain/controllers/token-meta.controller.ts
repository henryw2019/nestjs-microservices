import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainQueryService } from '../services/chain-query.service';
import { TokenMetaListQueryDto } from '../dtos/token-meta-list-query.dto';
import { TokenMetaResponseDto } from '../dtos/token-meta-response.dto';
import { MessageKey } from '../../../common/decorators/message.decorator';
import { SwaggerPaginatedResponse, SwaggerResponse } from '../../../common/dtos/api-response.dto';
import { PaginatedResult } from '../../../common/interfaces/query-builder.interface';

@ApiTags('token-meta')
@Controller({ version: '1', path: 'token-meta' })
export class TokenMetaController {
    constructor(private readonly chainQueryService: ChainQueryService) {}

    @Get()
    @MessageKey('tokenMeta.success.listed')
    @ApiOperation({ summary: 'List token metadata entries' })
    @ApiResponse({
        status: 200,
        type: SwaggerPaginatedResponse(TokenMetaResponseDto),
        description: 'Token metadata retrieved successfully',
    })
    async listTokenMeta(
        @Query() query: TokenMetaListQueryDto,
    ): Promise<PaginatedResult<TokenMetaResponseDto>> {
        return this.chainQueryService.getTokenMeta(query);
    }

    @Get(':tokenAddress')
    @MessageKey('tokenMeta.success.detail', TokenMetaResponseDto)
    @ApiOperation({ summary: 'Get token metadata by address' })
    @ApiResponse({
        status: 200,
        type: SwaggerResponse(TokenMetaResponseDto),
        description: 'Token metadata retrieved successfully',
    })
    async getTokenMeta(@Param('tokenAddress') tokenAddress: string): Promise<TokenMetaResponseDto> {
        const token = await this.chainQueryService.getTokenMetaByAddress(tokenAddress);
        if (!token) {
            throw new NotFoundException(`Token metadata for ${tokenAddress} not found`);
        }
        return token;
    }
}
