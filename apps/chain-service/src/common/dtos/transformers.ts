import { BadRequestException } from '@nestjs/common';

export const coerceBigNumberish = (value: unknown): string | undefined => {
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

    if (typeof value === 'bigint') {
        return value.toString();
    }

    throw new BadRequestException('Value must be a string, number, or bigint');
};
