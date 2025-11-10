import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransferService } from './transfer.service';
import { TransferDto } from './dtos/transfer.dto';
import { AuthUser } from '@/common/decorators/auth-user.decorator';
import { MessageKey } from '@/common/decorators/message.decorator';
import { SwaggerResponse } from '@/common/dtos/api-response.dto';
import { TransferResponseDto } from './dtos/transfer.response.dto';

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
}
