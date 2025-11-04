import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEthereumAddress,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

const coerceParams = (value: unknown): unknown[] => {
    if (value === undefined || value === null || value === '') {
        return [];
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            throw new BadRequestException('Parameters must be provided as an array or JSON string');
        }
    }

    throw new BadRequestException('Parameters must be provided as an array or JSON string');
};

const coerceBigNumberish = (value: unknown): string | undefined => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new BadRequestException('Numeric values must be finite');
        }
        return value.toString();
    }

    if (typeof value === 'string') {
        return value;
    }

    throw new BadRequestException('Value must be provided as a string or number');
};

export class ExecuteContractFunctionDto {
    @ApiProperty({ description: 'Target function name within the ABI', example: 'mint' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    readonly functionName!: string;

    @ApiProperty({ type: [Object], description: 'Arguments to forward to the contract function', required: false })
    @Transform(({ value }) => coerceParams(value))
    @IsArray()
    readonly params: unknown[] = [];

    @ApiPropertyOptional({ description: 'Signer address to execute state-changing functions' })
    @IsOptional()
    @IsEthereumAddress()
    readonly fromAddress?: string;

    @ApiPropertyOptional({ description: 'Optional gas limit override' })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsOptional()
    @IsString()
    readonly gasLimit?: string;

    @ApiPropertyOptional({ description: 'Optional gas price override' })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsOptional()
    @IsString()
    readonly gasPrice?: string;

    @ApiPropertyOptional({ description: 'Optional value to send with the transaction (in wei)' })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsOptional()
    @IsString()
    readonly value?: string;

    @ApiPropertyOptional({ description: 'Optional nonce to force when sending the transaction' })
    @Transform(({ value }) => coerceBigNumberish(value))
    @IsOptional()
    @IsString()
    readonly nonce?: string;

    @ApiPropertyOptional({ description: 'Wait for the transaction receipt before responding', default: false })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    readonly waitForConfirmation?: boolean;

    @ApiPropertyOptional({ description: 'Force read-only execution even for non-view functions', default: false })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    readonly callStatic?: boolean;
}
