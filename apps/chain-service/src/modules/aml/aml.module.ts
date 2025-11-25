import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import AmlConfig from '../../common/config/aml.config';
import { DatabaseService } from '../../common/services/database.service';
import { AmlSoapClient } from './aml.soap.client';
import { AmlService } from './aml.service';
import { AmlResultPollingService } from './aml.poller';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [ConfigModule.forFeature(AmlConfig), ScheduleModule.forRoot()],
    providers: [AmlSoapClient, AmlService, AmlResultPollingService],
    exports: [AmlService],
})
export class AmlModule {}
