import { Injectable, NestMiddleware, NotFoundException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// Extend Express Request to include tenant
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
        // Extract subdomain from hostname
        const hostname = req.hostname;
        const subdomain = this.extractSubdomain(hostname);

        // Skip tenant resolution for these paths (CORREGIDO: incluye /api)
        const publicPaths = [
            '/api/admin',           // Todos los endpoints de admin global
            '/api/auth/login',      // Login (cualquier usuario)
            '/',                    // Root
            '/health',              // Health check
        ];

        // Check if current path should skip tenant validation
        const shouldSkipTenant = publicPaths.some(path => req.path.startsWith(path));
        
        if (shouldSkipTenant) {
            return next();
        }

        // For other endpoints (like /api/auth/register), tenant is required
        if (!subdomain) {
            throw new BadRequestException('Tenant subdomain is required');
        }

        // Find company by slug (subdomain)
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
            throw new NotFoundException(`Company with slug "${subdomain}" not found`);
        }

        if (!company.is_active) {
            throw new BadRequestException(`Company "${subdomain}" is not active`);
        }

        // Inject tenant into request
        req.tenant = {
            id: company.id,
            name: company.name,
            slug: company.slug,
        };

        next();
    }

    private extractSubdomain(hostname: string): string | null {
        // Handle localhost development
        if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
            // In development, subdomain can be passed as first part before .localhost
            // e.g., acme.localhost -> acme
            const parts = hostname.split('.');
            if (parts.length > 1 && parts[0] !== 'localhost') {
                return parts[0];
            }
            return null;
        }

        // Production: empresa.mundialpro.com -> empresa
        const parts = hostname.split('.');
        if (parts.length >= 3) {
            return parts[0];
        }

        return null;
    }
}