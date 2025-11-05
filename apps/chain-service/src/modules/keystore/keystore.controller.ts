
import { Body, Controller, Post, Get, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeyStoreService } from './keystore.service';
import { AuthUser } from '@/common/decorators/auth-user.decorator';
import { MessageKey, SwaggerArrayResponse, SwaggerResponse } from '@project/common';
import { KeystoreResponseDto } from './dtos/keystore.response.dto';
import { CreateKeyStoreDto } from './dtos/create-keystore.dto';

@ApiTags('keystore')
@ApiBearerAuth('accessToken')
@Controller({ version: '1', path: 'keystore' })
export class KeyStoreController {
    constructor(private readonly service: KeyStoreService) {}

    @Post()
    @ApiOperation({ summary: 'Generate a new ETH address for current user' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'New managed address created for the current user',
        type: SwaggerResponse(KeystoreResponseDto),
    })
    @MessageKey('keystore.success.created', KeystoreResponseDto)
    async create(
        @AuthUser('id') userId: string,
        @Body() body: CreateKeyStoreDto
    ): Promise<KeystoreResponseDto> {
        return this.service.createForUser(userId, body.accountName);
    }

    @Get('me')
    @ApiOperation({ summary: 'Get keystore info for current user' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Managed addresses for the current user',
        type: SwaggerArrayResponse(KeystoreResponseDto),
    })
    @MessageKey('keystore.success.listed', KeystoreResponseDto)
    async getForCurrentUser(@AuthUser('id') userId: string): Promise<KeystoreResponseDto[]> {
        return this.service.getPublicByUserId(userId);
    }
}
