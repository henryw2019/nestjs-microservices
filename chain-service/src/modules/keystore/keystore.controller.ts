import { Controller, Post, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeyStoreService } from './keystore.service';
import { AuthUser } from '@/common/decorators/auth-user.decorator';

@ApiTags('keystore')
@ApiBearerAuth('accessToken')
@Controller({ version: '1', path: 'keystore' })
export class KeyStoreController {
    constructor(private readonly service: KeyStoreService) {}

    @Post()
    @ApiOperation({ summary: 'Generate a new ETH address for current user' })
    async create(@AuthUser('id') userId: string) {
        return this.service.createForUser(userId);
    }

    @Get('me')
    @ApiOperation({ summary: 'Get keystore info for current user' })
    async getForCurrentUser(@AuthUser('id') userId: string) {
        return this.service.getPublicByUserId(userId);
    }
}
