import { ApiProperty } from '@nestjs/swagger';

export class EventLogResponseDto {
    @ApiProperty({ description: 'Event identifier', example: '1' })
    id: string;

    @ApiProperty({ description: 'Chain identifier', example: 1 })
    chainId: number;

    @ApiProperty({ description: 'Block number', example: '1000000' })
    blockNumber: string;

    @ApiProperty({ description: 'Block hash', example: '0xblock...' })
    blockHash: string;

    @ApiProperty({ description: 'Transaction hash', example: '0xabc123...' })
    txHash: string;

    @ApiProperty({ description: 'Log index', example: 0 })
    logIndex: number;

    @ApiProperty({ description: 'Contract address', example: '0xContract...' })
    contractAddress: string;

    @ApiProperty({ description: 'Event name', example: 'Transfer' })
    eventName: string;

    @ApiProperty({ description: 'Event signature', example: '0xddf252ad...' })
    eventSignature: string;

    @ApiProperty({ description: 'Indexed parameters', type: 'object', additionalProperties: true })
    indexedArgs: Record<string, unknown> | null;

    @ApiProperty({ description: 'Non-indexed parameters', type: 'object', additionalProperties: true })
    dataArgs: Record<string, unknown> | null;

    @ApiProperty({ description: 'Raw event payload', type: 'object', additionalProperties: true })
    raw: Record<string, unknown> | null;

    @ApiProperty({ description: 'Processed flag', example: true })
    processed: boolean;
}
