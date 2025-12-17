import { Body, Controller, Post, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeyStoreService } from './keystore.service';
import { AuthUser } from '@/common/decorators/auth-user.decorator';
import { AdminOnly } from '@/common/decorators/auth-roles.decorator';
import { MessageKey } from '@/common/decorators/message.decorator';
import {
    SwaggerArrayResponse,
    SwaggerPaginatedResponse,
    SwaggerResponse,
} from '@/common/dtos/api-response.dto';
import { KeystoreResponseDto } from './dtos/keystore.response.dto';
import { CreateKeyStoreDto } from './dtos/create-keystore.dto';
import { KeystoreQueryDto } from './dtos/keystore.query.dto';
import { PaginatedResult } from '@/common/interfaces/query-builder.interface';

@ApiTags('keystore')
@ApiBearerAuth('accessToken')
@Controller({ version: '1', path: 'keystore' })
export class KeyStoreController {
    constructor(private readonly service: KeyStoreService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new keystore entry (wallet)' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'New managed address created for the current user',
        type: SwaggerResponse(KeystoreResponseDto),
    })
    @MessageKey('keystore.success.created', KeystoreResponseDto)
    async create(
        @AuthUser('id') userId: string,
        @Body() body: CreateKeyStoreDto,
    ): Promise<KeystoreResponseDto> {
        return this.service.createForUser(userId, body);
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
        return this.service.getPublicByUserId(userId) as unknown as KeystoreResponseDto[];
    }

    @Get('all')
    @AdminOnly()
    @ApiOperation({ summary: 'Get all keystores (Admin only)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'All managed addresses',
        type: SwaggerPaginatedResponse(KeystoreResponseDto),
    })
    @MessageKey('keystore.success.listed', KeystoreResponseDto)
    async getAll(@Query() query: KeystoreQueryDto): Promise<PaginatedResult<KeystoreResponseDto>> {
        return this.service.findAll(query);
    }
}
