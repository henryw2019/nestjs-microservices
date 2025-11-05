import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainQueryService } from '../services/chain-query.service';
import { AddressBalanceListQueryDto } from '../dtos/address-balance-list-query.dto';
import { AddressBalanceResponseDto } from '../dtos/address-balance-response.dto';
import { MessageKey, SwaggerPaginatedResponse } from '@project/common';
import { PaginatedResult } from '../../../common/interfaces/query-builder.interface';

@ApiTags('address-balances')
@Controller({ version: '1', path: 'address-balances' })
export class AddressBalanceController {
    constructor(private readonly chainQueryService: ChainQueryService) {}

    @Get()
    @MessageKey('addressBalance.success.listed')
    @ApiOperation({ summary: 'List address balances' })
    @ApiResponse({
        status: 200,
        type: SwaggerPaginatedResponse(AddressBalanceResponseDto),
        description: 'Address balances retrieved successfully',
    })
    async listBalances(
        @Query() query: AddressBalanceListQueryDto,
    ): Promise<PaginatedResult<AddressBalanceResponseDto>> {
        return this.chainQueryService.getAddressBalances(query);
    }
}
