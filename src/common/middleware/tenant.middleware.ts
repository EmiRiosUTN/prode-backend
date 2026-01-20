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

        // Rutas públicas que NO nececitan BLOQUEAR si no hay tenant, pero pueden usarlo si existe
        const isPublicPath =
            fullPath === '/api' ||
            fullPath === '/api/' ||
            fullPath.startsWith('/api/admin') || // Admin routes likely don't need tenant context or handle it differently
            fullPath === '/api/auth/login' ||
            fullPath === '/' ||
            fullPath.startsWith('/health');

        // Intentar obtener tenant
        let subdomain: string | null = null;
        let tenantFound = false;

        // OPCIÓN 1: Header personalizado
        const tenantSlugHeader = req.headers['x-tenant-slug'] as string;
        if (tenantSlugHeader) {
            subdomain = tenantSlugHeader;
        } else {
            // OPCIÓN 2: Origin Header (para CORS requests donde Host es localhost)
            const origin = req.headers.origin;
            if (origin) {
                try {
                    const url = new URL(origin);
                    subdomain = this.extractSubdomain(url.hostname);
                } catch (e) {
                    console.log(`[TenantMiddleware] Invalid Origin URL: ${origin}`);
                }
            }

            // OPCIÓN 3: Hostname (fallback)
            if (!subdomain) {
                subdomain = this.extractSubdomain(req.hostname);
            }
        }

        if (subdomain) {
            // Special case: admin subdomain
            if (subdomain.toLowerCase() === 'admin') {
                // Create a special tenant object for admin subdomain
                req.tenant = {
                    id: 'admin',
                    name: 'Admin Portal',
                    slug: 'admin',
                };
                tenantFound = true;
                console.log(`[TenantMiddleware] ✓ Admin subdomain detected`);
            } else {
                // Regular company subdomain - search in database
                const company = await this.prisma.company.findFirst({
                    where: {
                        slug: {
                            equals: subdomain,
                            mode: 'insensitive',
                        }
                    },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        is_active: true,
                    },
                });

                if (company && company.is_active) {
                    // Inyectar tenant en el request
                    req.tenant = {
                        id: company.id,
                        name: company.name,
                        slug: company.slug,
                    };
                    tenantFound = true;
                    console.log(`[TenantMiddleware] ✓ Tenant injected: ${company.name} (${company.id})`);
                } else {
                    console.log(`[TenantMiddleware] ✗ Company not found or inactive: ${subdomain}`);
                    if (!isPublicPath) {
                        throw new NotFoundException(`Company with slug "${subdomain}" not found or inactive`);
                    }
                }
            }
        }

        // Validación final
        if (!tenantFound && !isPublicPath) {
            // Si ruta protegida y no hay tenant -> Error
            console.log(`[TenantMiddleware] ✗ No subdomain found for protected route`);
            throw new BadRequestException('Tenant subdomain is required for this route.');
        }

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
        // Si hay 'www.', lo quitamos antes de procesar
        let cleanHostname = hostname;
        if (cleanHostname.startsWith('www.')) {
            cleanHostname = cleanHostname.substring(4);
        }

        const parts = cleanHostname.split('.');
        if (parts.length >= 3) {
            return parts[0];
        }

        return null;
    }
}