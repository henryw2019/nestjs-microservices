import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsEthereumAddress,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

import type { AbiInput } from './create-contract.dto';
import { parseAbi } from './create-contract.dto';

const optionalAbi = (value: unknown): AbiInput | undefined => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    try {
        return parseAbi(value);
    } catch (error) {
        throw new BadRequestException('ABI must be a valid JSON array when provided');
    }
};

export class UpdateContractDto {
    @ApiPropertyOptional({ description: 'Updated friendly name for the contract' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    readonly name?: string;

    @ApiPropertyOptional({ description: 'Updated contract address' })
    @IsOptional()
    @IsString()
    @IsEthereumAddress()
    readonly address?: string;

    @ApiPropertyOptional({ type: [Object], description: 'Replacement ABI definition' })
    @Transform(({ value }) => optionalAbi(value))
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    readonly abi?: AbiInput;

    @ApiPropertyOptional({ description: 'Updated owner identifier' })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    readonly ownerId?: string;
}
