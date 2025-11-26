import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, OrderType } from '@repo/database/chain-service';

export class OrderFilterDto {
    @ApiProperty({ required: false, description: 'Filter by User ID' })
    @IsString()
    @IsOptional()
    userId?: string;

    @ApiProperty({ enum: OrderType, required: false, description: 'Filter by Order Type' })
    @IsEnum(OrderType)
    @IsOptional()
    type?: OrderType;

    @ApiProperty({ enum: OrderStatus, required: false, description: 'Filter by Order Status' })
    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;

    @ApiProperty({ required: false, description: 'Start Date (ISO String)' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiProperty({ required: false, description: 'End Date (ISO String)' })
    @IsDateString()
    @IsOptional()
    endDate?: string;
}
