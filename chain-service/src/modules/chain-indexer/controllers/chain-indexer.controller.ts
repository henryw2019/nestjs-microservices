import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ChainIndexerService } from '../services/chain-indexer.service';
import {
    AddressBalanceQueryDto,
    BlockQueryDto,
    Erc20TransferQueryDto,
    EventLogQueryDto,
    TokenMetaQueryDto,
    TransactionQueryDto,
} from '../dtos/chain-indexer-query.dto';
import { CheckpointQueryDto } from '../dtos/checkpoint-query.dto';
import { PublicRoute } from '@/common/decorators/public.decorator';

@ApiTags('chain-service')
@PublicRoute()
@Controller({ version: '1', path: 'chain-service' })
export class ChainServiceController {
    constructor(private readonly chainIndexerService: ChainIndexerService) {}

    @Get('blocks')
    @ApiOperation({ summary: 'Retrieve blocks filtered by number or hash' })
    getBlocks(@Query() query: BlockQueryDto) {
        return this.chainIndexerService.getBlocks(query);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Retrieve transactions filtered by hash, from, or to' })
    getTransactions(@Query() query: TransactionQueryDto) {
        return this.chainIndexerService.getTransactions(query);
    }

    @Get('erc20-transfers')
    @ApiOperation({ summary: 'Retrieve ERC-20 transfers filtered by transaction hash, token, from, or to' })
    getErc20Transfers(@Query() query: Erc20TransferQueryDto) {
        return this.chainIndexerService.getErc20Transfers(query);
    }

    @Get('event-logs')
    @ApiOperation({ summary: 'Retrieve event logs filtered by transaction hash or contract address' })
    getEventLogs(@Query() query: EventLogQueryDto) {
        return this.chainIndexerService.getEventLogs(query);
    }

    @Get('address-balances')
    @ApiOperation({ summary: 'Retrieve token balances filtered by holder address or token address' })
    getAddressBalances(@Query() query: AddressBalanceQueryDto) {
        return this.chainIndexerService.getAddressBalances(query);
    }

    @Get('token-meta')
    @ApiOperation({ summary: 'Retrieve token metadata filtered by token address' })
    getTokenMeta(@Query() query: TokenMetaQueryDto) {
        return this.chainIndexerService.getTokenMeta(query);
    }

    @Get('checkpoints')
    @ApiOperation({ summary: 'Retrieve checkpoints filtered by chainId, transaction hash, or contract address' })
    getCheckpoints(@Query() query: CheckpointQueryDto) {
        return this.chainIndexerService.getCheckpoints(query);
    }
}
