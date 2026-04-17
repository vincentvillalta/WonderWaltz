import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { buildBullRedisConfig } from './common/redis-config.js';
import { SharedInfraModule } from './shared-infra.module.js';
import { AccountDeletionModule } from './account-deletion/account-deletion.module.js';
import { IngestionModule } from './ingestion/ingestion.module.js';
import { RollupModule } from './rollup/rollup.module.js';
import { CrowdIndexModule } from './crowd-index/crowd-index.module.js';
import { PlanGenerationModule } from './plan-generation/plan-generation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    BullModule.forRoot({
      connection: buildBullRedisConfig(),
    }),
    BullModule.registerQueue({ name: 'plan-generation' }),
    BullModule.registerQueue({ name: 'account-purge' }),
    SharedInfraModule,
    AccountDeletionModule,
    IngestionModule,
    RollupModule,
    CrowdIndexModule,
    PlanGenerationModule,
  ],
})
export class WorkerModule {}
