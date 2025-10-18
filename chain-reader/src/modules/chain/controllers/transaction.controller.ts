import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainQueryService } from '../services/chain-query.service';
import { TransactionListQueryDto } from '../dtos/transaction-list-query.dto';
import { TransactionResponseDto } from '../dtos/transaction-response.dto';
import { MessageKey } from '../../../common/decorators/message.decorator';
import { SwaggerPaginatedResponse, SwaggerResponse } from '../../../common/dtos/api-response.dto';
import { PaginatedResult } from '../../../common/interfaces/query-builder.interface';

@ApiTags('transactions')
@Controller({ version: '1', path: 'transactions' })
export class TransactionController {
    constructor(private readonly chainQueryService: ChainQueryService) {}

    @Get()
    @MessageKey('transaction.success.listed')
    @ApiOperation({ summary: 'List transactions with filters' })
    @ApiResponse({
        status: 200,
        type: SwaggerPaginatedResponse(TransactionResponseDto),
        description: 'Transactions retrieved successfully',
    })
    async listTransactions(
        @Query() query: TransactionListQueryDto,
    ): Promise<PaginatedResult<TransactionResponseDto>> {
        return this.chainQueryService.getTransactions(query);
    }

    @Get(':hash')
    @MessageKey('transaction.success.detail', TransactionResponseDto)
    @ApiOperation({ summary: 'Get transaction by hash' })
    @ApiResponse({
        status: 200,
        type: SwaggerResponse(TransactionResponseDto),
        description: 'Transaction retrieved successfully',
    })
    async getTransaction(@Param('hash') hash: string): Promise<TransactionResponseDto> {
        const tx = await this.chainQueryService.getTransactionByHash(hash);
        if (!tx) {
            throw new NotFoundException(`Transaction ${hash} not found`);
        }
        return tx;
    }
}
