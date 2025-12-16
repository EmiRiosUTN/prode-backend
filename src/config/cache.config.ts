import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
    },
    ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : 300, // 5 minutos por defecto
}));
