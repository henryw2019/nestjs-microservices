import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainQueryService } from '../services/chain-query.service';
import { Erc20TransferListQueryDto } from '../dtos/erc20-transfer-list-query.dto';
import { Erc20TransferResponseDto } from '../dtos/erc20-transfer-response.dto';
import { MessageKey } from '../../../common/decorators/message.decorator';
import { SwaggerPaginatedResponse } from '../../../common/dtos/api-response.dto';
import { PaginatedResult } from '../../../common/interfaces/query-builder.interface';

@ApiTags('erc20-transfers')
@Controller({ version: '1', path: 'erc20-transfers' })
export class Erc20TransferController {
    constructor(private readonly chainQueryService: ChainQueryService) {}

    @Get()
    @MessageKey('erc20Transfer.success.listed')
    @ApiOperation({ summary: 'List ERC20 transfers' })
    @ApiResponse({
        status: 200,
        type: SwaggerPaginatedResponse(Erc20TransferResponseDto),
        description: 'ERC20 transfers retrieved successfully',
    })
    async listTransfers(
        @Query() query: Erc20TransferListQueryDto,
    ): Promise<PaginatedResult<Erc20TransferResponseDto>> {
        return this.chainQueryService.getErc20Transfers(query);
    }
}
