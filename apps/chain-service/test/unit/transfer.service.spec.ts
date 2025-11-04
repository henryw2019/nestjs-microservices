import { BadRequestException, HttpException, InternalServerErrorException } from '@nestjs/common';
import { TransferService } from '../../src/modules/keystore/transfer.service';
import { KeyStoreService } from '../../src/modules/keystore/keystore.service';

describe('TransferService - error normalization', () => {
    let service: TransferService;

    beforeEach(() => {
        service = new TransferService({} as unknown as KeyStoreService);
    });

    it('maps provider insufficient funds error to BadRequestException with cleaned message', () => {
        const providerError = {
            code: 'INSUFFICIENT_FUNDS',
            message: 'processing response error (reason="insufficient funds", code=INSUFFICIENT_FUNDS)',
        };

        const normalized: HttpException = (service as any).normalizeProviderError(providerError);

        expect(normalized).toBeInstanceOf(BadRequestException);
        expect(normalized.getResponse()).toMatchObject({ message: 'insufficient funds' });
    });

    it('falls back to InternalServerErrorException for unexpected errors', () => {
        const normalized: HttpException = (service as any).normalizeProviderError(new Error('unexpected failure'));

        expect(normalized).toBeInstanceOf(InternalServerErrorException);
        expect(normalized.getResponse()).toMatchObject({ message: 'unexpected failure' });
    });

    it('passes through existing HttpExceptions without wrapping', () => {
        const badRequest = new BadRequestException('invalid payload');

        expect(() => (service as any).handleTransferError(badRequest)).toThrow(badRequest);
    });
});
