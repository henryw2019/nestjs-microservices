import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AbiInput } from './create-contract.dto';

export class ContractResponseDto {
    @ApiProperty({ description: 'Unique identifier of the contract' })
    readonly id!: string;

    @ApiProperty({ description: 'Friendly display name of the contract' })
    readonly name!: string;

    @ApiProperty({ description: 'Checksum formatted contract address' })
    readonly address!: string;

    @ApiPropertyOptional({ description: 'Optional owner identifier if tracked externally' })
    readonly ownerId?: string | null;

    @ApiProperty({ description: 'Timestamp indicating when the contract was registered' })
    readonly createdAt!: Date;

    @ApiPropertyOptional({ description: 'ABI definition, returned when explicitly requested', type: [Object] })
    readonly abi?: AbiInput;
}
