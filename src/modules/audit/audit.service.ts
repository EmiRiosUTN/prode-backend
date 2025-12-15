import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogParams {
    userId: string;
    companyId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Registra una acción en el log de auditoría
     */
    async log(params: AuditLogParams): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    user_id: params.userId,
                    company_id: params.companyId || null,
                    action: params.action,
                    entity_type: params.entityType,
                    entity_id: params.entityId,
                    metadata: params.metadata || null,
                },
            });

            this.logger.log(
                `Audit log created: ${params.action} on ${params.entityType} ${params.entityId} by user ${params.userId}`,
            );
        } catch (error) {
            this.logger.error('Failed to create audit log:', error);
            // No lanzar error para no interrumpir el flujo principal
        }
    }

    /**
     * Obtiene logs de auditoría con filtros
     */
    async getLogs(filters: {
        userId?: string;
        companyId?: string;
        action?: string;
        entityType?: string;
        limit?: number;
    }) {
        return this.prisma.auditLog.findMany({
            where: {
                user_id: filters.userId,
                company_id: filters.companyId,
                action: filters.action,
                entity_type: filters.entityType,
            },
            include: {
                user: {
                    select: {
                        email: true,
                        role: true,
                    },
                },
                company: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
            take: filters.limit || 100,
        });
    }
}
