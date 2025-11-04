import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChainQueryService } from '../services/chain-query.service';
import { EventLogListQueryDto } from '../dtos/event-log-list-query.dto';
import { EventLogResponseDto } from '../dtos/event-log-response.dto';
import { MessageKey } from '../../../common/decorators/message.decorator';
import { SwaggerPaginatedResponse } from '../../../common/dtos/api-response.dto';
import { PaginatedResult } from '../../../common/interfaces/query-builder.interface';

@ApiTags('event-logs')
@Controller({ version: '1', path: 'event-logs' })
export class EventLogController {
    constructor(private readonly chainQueryService: ChainQueryService) {}

    @Get()
    @MessageKey('eventLog.success.listed')
    @ApiOperation({ summary: 'List event logs' })
    @ApiResponse({
        status: 200,
        type: SwaggerPaginatedResponse(EventLogResponseDto),
        description: 'Event logs retrieved successfully',
    })
    async listEventLogs(
        @Query() query: EventLogListQueryDto,
    ): Promise<PaginatedResult<EventLogResponseDto>> {
        return this.chainQueryService.getEventLogs(query);
    }
}
