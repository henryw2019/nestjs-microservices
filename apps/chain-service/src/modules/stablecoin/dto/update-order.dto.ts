import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@repo/database/chain-service';

export class UpdateOrderDto {
    @ApiProperty({ enum: OrderStatus, description: 'New status of the order' })
    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;

    @ApiProperty({ description: 'Transaction Hash', required: false })
    @IsString()
    @IsOptional()
    txHash?: string;

    @ApiProperty({ description: 'Admin Remark', required: false })
    @IsString()
    @IsOptional()
    remark?: string;
}
