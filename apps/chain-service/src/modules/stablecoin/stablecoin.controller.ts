import { Controller, Post, Body, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StablecoinService } from './stablecoin.service';
import { CreateSubscriptionDto, CreateRedemptionDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { ProcessSubscriptionDto } from './dto/process-subscription.dto';
import { AuthUser } from '@/common/decorators/auth-user.decorator';
import { AdminOnly } from '@/common/decorators/auth-roles.decorator';

@ApiTags('Stablecoin')
@ApiBearerAuth('accessToken')
@Controller('stablecoin')
export class StablecoinController {
    constructor(private readonly stablecoinService: StablecoinService) {}

    @Post('subscription')
    @ApiOperation({ summary: 'Create Subscription Order' })
    createSubscription(@AuthUser('id') userId: string, @Body() dto: CreateSubscriptionDto) {
        return this.stablecoinService.createSubscription(userId, dto);
    }

    @Post('redemption')
    @ApiOperation({ summary: 'Create Redemption Order' })
    createRedemption(@AuthUser('id') userId: string, @Body() dto: CreateRedemptionDto) {
        return this.stablecoinService.createRedemption(userId, dto);
    }

    @Get('orders')
    @ApiOperation({ summary: 'List User Orders' })
    findAll(@AuthUser('id') userId: string) {
        return this.stablecoinService.findAll(userId);
    }

    // Admin Endpoints
    @Get('admin/orders')
    @AdminOnly()
    @ApiOperation({ summary: 'List All Orders with Filters (Admin)' })
    findAllAdmin(@Query() filter: OrderFilterDto) {
        return this.stablecoinService.findAllByFilter(filter);
    }

    @Get('admin/orders/pending')
    @AdminOnly()
    @ApiOperation({ summary: 'List Pending Orders (Admin)' })
    findAllPending() {
        return this.stablecoinService.findAllPending();
    }

    @Patch('admin/orders/:id')
    @AdminOnly()
    @ApiOperation({ summary: 'Update Order Status (Admin)' })
    updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
        return this.stablecoinService.updateOrder(id, dto);
    }

    @Post('admin/orders/:id/process-subscription')
    @AdminOnly()
    @ApiOperation({ summary: 'Process Subscription (Auto Transfer) (Admin)' })
    processSubscriptionAuto(
        @AuthUser('id') adminUserId: string,
        @Param('id') id: string,
        @Body() dto: ProcessSubscriptionDto,
    ) {
        return this.stablecoinService.executeSubscriptionTransfer(id, adminUserId, dto.fromAddress);
    }
}
