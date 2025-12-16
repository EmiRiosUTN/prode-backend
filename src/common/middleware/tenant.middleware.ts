import { Injectable, NestMiddleware, NotFoundException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

declare global {
    namespace Express {
        interface Request {
            tenant?: {
                id: string;
                name: string;
                slug: string;
            };
        }
    }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        // Obtener la ruta completa (sin query string)
        const fullPath = req.originalUrl.split('?')[0];

        console.log(`[TenantMiddleware] ${req.method} ${fullPath}`);

        // Rutas públicas que NO necesitan tenant
        const isPublicPath =
            fullPath === '/api' ||
            fullPath === '/api/' ||
            fullPath.startsWith('/api/admin') ||
            fullPath === '/api/auth/login' ||
            fullPath === '/' ||
            fullPath.startsWith('/health');

        if (isPublicPath) {
            console.log(`[TenantMiddleware] ✓ Ruta pública - skipping tenant`);
            return next();
        }

        // TODAS LAS DEMÁS RUTAS REQUIEREN TENANT
        let subdomain: string | null = null;

        // DEBUG: Log all headers
        console.log('[TenantMiddleware] All headers:', JSON.stringify(req.headers, null, 2));

        // OPCIÓN 1: Intentar obtener tenant de header personalizado (para desarrollo frontend)
        const tenantSlugHeader = req.headers['x-tenant-slug'] as string;
        if (tenantSlugHeader) {
            subdomain = tenantSlugHeader;
            console.log(`[TenantMiddleware] Tenant from X-Tenant-Slug header: ${subdomain}`);
        } else {
            // OPCIÓN 2: Extraer subdomain del hostname (método original)
            const hostname = req.hostname;
            subdomain = this.extractSubdomain(hostname);
            console.log(`[TenantMiddleware] hostname: ${hostname} | subdomain: ${subdomain}`);
        }

        if (!subdomain) {
            console.log(`[TenantMiddleware] ✗ No subdomain found`);
            throw new BadRequestException('Tenant subdomain is required. Use format: acme.localhost:3001 or set X-Tenant-Slug header');
        }

        // Buscar empresa por slug
        const company = await this.prisma.company.findUnique({
            where: { slug: subdomain },
            select: {
                id: true,
                name: true,
                slug: true,
                is_active: true,
            },
        });

        if (!company) {
            console.log(`[TenantMiddleware] ✗ Company not found: ${subdomain}`);
            throw new NotFoundException(`Company with slug "${subdomain}" not found`);
        }

        if (!company.is_active) {
            console.log(`[TenantMiddleware] ✗ Company not active: ${subdomain}`);
            throw new BadRequestException(`Company "${subdomain}" is not active`);
        }

        // Inyectar tenant en el request
        req.tenant = {
            id: company.id,
            name: company.name,
            slug: company.slug,
        };

        console.log(`[TenantMiddleware] ✓ Tenant injected: ${company.name} (${company.id})`);

        next();
    }

    private extractSubdomain(hostname: string): string | null {
        // localhost puro sin subdomain
        if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
            return null;
        }

        // subdomain.localhost (desarrollo)
        if (hostname.endsWith('.localhost')) {
            const parts = hostname.split('.');
            if (parts.length >= 2) {
                return parts[0]; // "acme" de "acme.localhost"
            }
            return null;
        }

        // Producción: empresa.mundialpro.com
        const parts = hostname.split('.');
        if (parts.length >= 3) {
            return parts[0];
        }

        return null;
    }
}