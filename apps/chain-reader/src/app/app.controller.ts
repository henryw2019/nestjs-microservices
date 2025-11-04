import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../common/services/database.service';

@Controller()
export class AppController {
    constructor(
        private readonly configService: ConfigService,
        private readonly databaseService: DatabaseService,
    ) {}

    @Get()
    root(): Record<string, string> {
        return {
            status: 'ok',
            service: this.configService.get<string>('app.name', 'Chain Reader Service'),
            environment: this.configService.get<string>('app.env', 'local'),
        };
    }

    @Get('health')
    async health(): Promise<Record<string, unknown>> {
        const db = await this.databaseService.isHealthy();
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: db,
        };
    }
}
