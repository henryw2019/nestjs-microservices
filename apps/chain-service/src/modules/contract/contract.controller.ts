import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminOnly } from '@/common/decorators/auth-roles.decorator';
import { ContractResponseDto } from './dtos/contract-response.dto';
import { CreateContractDto } from './dtos/create-contract.dto';
import { UpdateContractDto } from './dtos/update-contract.dto';
import { ExecuteContractFunctionDto } from './dtos/execute-contract-function.dto';
import { ContractExecutionResult, ContractService } from './contract.service';

@ApiTags('contracts')
@AdminOnly()
@Controller({ path: 'contracts', version: '1' })
export class ContractController {
    constructor(private readonly contractService: ContractService) {}

    @Post()
    @ApiOperation({ summary: 'Register a new contract with dynamic ABI support' })
    @ApiResponse({ status: HttpStatus.CREATED, type: ContractResponseDto })
    create(@Body() dto: CreateContractDto): Promise<ContractResponseDto> {
        return this.contractService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all registered contracts' })
    @ApiOkResponse({ type: [ContractResponseDto] })
    findAll(): Promise<ContractResponseDto[]> {
        return this.contractService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Fetch contract metadata, optionally returning the ABI definition' })
    @ApiOkResponse({ type: ContractResponseDto })
    findOne(
        @Param('id') id: string,
        @Query('withAbi') withAbi?: string,
    ): Promise<ContractResponseDto> {
        const includeAbi =
            typeof withAbi === 'string'
                ? ['true', '1', 'yes'].includes(withAbi.toLowerCase())
                : false;
        return this.contractService.findOne(id, includeAbi);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update contract metadata and optionally replace the ABI definition' })
    @ApiOkResponse({ type: ContractResponseDto })
    update(@Param('id') id: string, @Body() dto: UpdateContractDto): Promise<ContractResponseDto> {
        return this.contractService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove a contract and its associated ABI definition' })
    async remove(@Param('id') id: string): Promise<void> {
        await this.contractService.remove(id);
    }

    @Post(':id/execute')
    @ApiOperation({ summary: 'Execute a contract function dynamically using the stored ABI' })
    @ApiOkResponse({ description: 'Result of the contract function execution' })
    execute(
        @Param('id') id: string,
        @Body() dto: ExecuteContractFunctionDto,
    ): Promise<ContractExecutionResult> {
        return this.contractService.execute(id, dto);
    }
}
