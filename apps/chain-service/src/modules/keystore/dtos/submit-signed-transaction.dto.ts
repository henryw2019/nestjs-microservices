import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';

export class SubmitSignedTransactionDto {
    @ApiProperty({ description: 'Unique transaction ID from build step' })
    @IsUUID()
    readonly transactionId!: string;

    @ApiProperty({ description: 'Signed transaction hex string', example: '0x02f8...' })
    @IsString()
    @Matches(/^0x[0-9a-fA-F]+$/, { message: 'signedTx must be a hex string starting with 0x' })
    readonly signedTx!: string;
}
