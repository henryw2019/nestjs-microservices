import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransferService } from './transfer.service';
import { TransferDto } from './dtos/transfer.dto';
import { AuthUser } from '@/common/decorators/auth-user.decorator';
import { MessageKey } from '@/common/decorators/message.decorator';
import { SwaggerResponse } from '@/common/dtos/api-response.dto';
import { TransferResponseDto } from './dtos/transfer.response.dto';
import { BuildTransactionDto } from './dtos/build-transaction.dto';
import { UnsignedTransactionResponseDto } from './dtos/unsigned-transaction-response.dto';
import { SubmitSignedTransactionDto } from './dtos/submit-signed-transaction.dto';

@ApiTags('transfer')
@ApiBearerAuth('accessToken')
@Controller({ version: '1', path: 'transfer' })
export class TransferController {
    constructor(private readonly service: TransferService) {}

    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: 'Send ETH or ERC20 using a managed address belonging to the current user',
    })
    @ApiResponse({
        status: HttpStatus.ACCEPTED,
        description: 'Transfer request accepted',
        type: SwaggerResponse(TransferResponseDto),
    })
    @MessageKey('transfer.submitted', TransferResponseDto)
    async transfer(
        @AuthUser('id') userId: string,
        @Body() dto: TransferDto,
    ): Promise<TransferResponseDto> {
        if (dto.token) {
            return this.service.sendErc20(userId, dto);
        }
        return this.service.sendNative(userId, dto);
    }

    @Post('offline/build')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Build unsigned transaction (ETH/ERC20)',
        description:
            'Generate unsigned transaction object and transaction ID for offline signing. Valid for 30 minutes.',
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Unsigned transaction created',
        type: SwaggerResponse(UnsignedTransactionResponseDto),
    })
    async buildOffline(
        @AuthUser('id') userId: string,
        @Body() dto: BuildTransactionDto,
    ): Promise<UnsignedTransactionResponseDto> {
        return this.service.buildUnsignedTransaction(userId, dto);
    }

    @Post('offline/submit')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Submit signed transaction and broadcast',
        description:
            'Validate signature, consistency, expiration, and replay protection, then broadcast to chain.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Transaction submitted successfully',
    })
    async submitOffline(
        @Body() dto: SubmitSignedTransactionDto,
    ): Promise<{ transactionId: string; txHash: string; status: string }> {
        return this.service.submitSignedTransaction(dto);
    }
}
