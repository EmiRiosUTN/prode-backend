import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminGlobalModule } from './modules/admin-global/admin-global.module';
import { CompanyModule } from './modules/company/company.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { EmployeeModule } from './modules/employee/employee.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AuditModule } from './modules/audit/audit.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import cacheConfig from './config/cache.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, cacheConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    AdminGlobalModule,
    CompanyModule,
    EmployeeModule,
    RankingModule,
    JobsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}