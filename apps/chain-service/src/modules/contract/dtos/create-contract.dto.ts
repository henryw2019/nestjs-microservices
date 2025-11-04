import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsEthereumAddress,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export type AbiInput = Array<Record<string, unknown>>;

export const parseAbi = (value: unknown): AbiInput => {
    if (Array.isArray(value)) {
        return value as AbiInput;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed as AbiInput;
            }
        } catch (error) {
            throw new BadRequestException('ABI must be a valid JSON array');
        }
    }

    throw new BadRequestException('ABI must be provided as an array or JSON string');
};

export class CreateContractDto {
    @ApiProperty({ example: 'Sample ERC20', description: 'Friendly name of the contract' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    readonly name!: string;

    @ApiProperty({ example: '0x0000000000000000000000000000000000000000', description: 'Deployed contract address' })
    @IsString()
    @IsNotEmpty()
    @IsEthereumAddress()
    readonly address!: string;

    @ApiProperty({ type: [Object], description: 'ABI definition for the contract' })
    @Transform(({ value }) => parseAbi(value))
    @IsArray()
    @ArrayNotEmpty()
    readonly abi!: AbiInput;

    @ApiProperty({ required: false, description: 'Optional owner identifier (external system reference)' })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    readonly ownerId?: string;
}
