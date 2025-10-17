import { Controller, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransferService } from './transfer.service';
import { TransferDto } from './dtos/transfer.dto';
import { AuthUser } from '@/common/decorators/auth-user.decorator';

@ApiTags('transfer')
@ApiBearerAuth('accessToken')
@Controller({ version: '1', path: 'transfer' })
export class TransferController {
    constructor(private readonly service: TransferService) {}

    @Post()
    @ApiOperation({ summary: 'Send ETH or ERC20 using current user wallet (token optional)' })
    async transfer(@AuthUser('id') userId: string, @Body() dto: TransferDto) {
        if (dto.token) {
            return this.service.sendErc20(userId, dto);
        }
        return this.service.sendNative(userId, dto);
    }
}
