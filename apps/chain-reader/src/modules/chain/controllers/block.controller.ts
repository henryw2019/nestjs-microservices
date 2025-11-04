import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainQueryService } from '../services/chain-query.service';
import { BlockListQueryDto } from '../dtos/block-list-query.dto';
import { BlockResponseDto } from '../dtos/block-response.dto';
import { MessageKey } from '../../../common/decorators/message.decorator';
import { SwaggerPaginatedResponse, SwaggerResponse } from '../../../common/dtos/api-response.dto';
import { PaginatedResult } from '../../../common/interfaces/query-builder.interface';

@ApiTags('blocks')
@Controller({ version: '1', path: 'blocks' })
export class BlockController {
    constructor(private readonly chainQueryService: ChainQueryService) {}

    @Get()
    @MessageKey('block.success.listed')
    @ApiOperation({ summary: 'List blocks with pagination and filters' })
    @ApiResponse({
        status: 200,
        type: SwaggerPaginatedResponse(BlockResponseDto),
        description: 'Blocks retrieved successfully',
    })
    async listBlocks(@Query() query: BlockListQueryDto): Promise<PaginatedResult<BlockResponseDto>> {
        return this.chainQueryService.getBlocks(query);
    }

    @Get(':number')
    @MessageKey('block.success.detail', BlockResponseDto)
    @ApiOperation({ summary: 'Get block by number' })
    @ApiResponse({
        status: 200,
        type: SwaggerResponse(BlockResponseDto),
        description: 'Block retrieved successfully',
    })
    async getBlock(@Param('number') number: string): Promise<BlockResponseDto> {
        const block = await this.chainQueryService.getBlockByNumber(number);
        if (!block) {
            throw new NotFoundException(`Block ${number} not found`);
        }
        return block;
    }
}
