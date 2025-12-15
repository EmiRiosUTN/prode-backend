import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import request from 'supertest';

/**
 * Test helpers para E2E tests
 */

export class TestHelpers {
    /**
     * Login y obtener token
     */
    static async loginAs(
        app: INestApplication,
        email: string,
        password: string,
    ): Promise<string> {
        const response = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email, password })
            .expect(200);

        return response.body.data.accessToken;
    }

    /**
     * Crear empresa de prueba
     */
    static async createTestCompany(
        app: INestApplication,
        adminToken: string,
        override?: Partial<{
            name: string;
            slug: string;
            adminEmail: string;
            adminPassword: string;
        }>,
    ) {
        const timestamp = Date.now();
        const companyData = {
            name: override?.name || `Test Company ${timestamp}`,
            slug: override?.slug || `test-${timestamp}`,
            adminEmail: override?.adminEmail || `admin-${timestamp}@test.com`,
            adminPassword: override?.adminPassword || 'Admin123!Test',
        };

        const response = await request(app.getHttpServer())
            .post('/api/admin/companies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(companyData)
            .expect(201);

        return {
            ...response.body.data,
            adminCredentials: {
                email: companyData.adminEmail,
                password: companyData.adminPassword,
            },
        };
    }

    /**
     * Crear área de empresa
     */
    static async createArea(
        app: INestApplication,
        companyAdminToken: string,
        companySlug: string,
        name: string,
    ) {
        const response = await request(app.getHttpServer())
            .post('/api/company/areas')
            .set('Authorization', `Bearer ${companyAdminToken}`)
            .set('Host', `${companySlug}.localhost:3000`)
            .send({ name })
            .expect(201);

        return response.body.data;
    }

    /**
     * Registrar empleado
     */
    static async registerEmployee(
        app: INestApplication,
        companySlug: string,
        areaId: string,
        index: number,
    ) {
        const employeeData = {
            email: `employee${index}@${companySlug}.com`,
            password: 'Employee123!',
            firstName: `Employee${index}`,
            lastName: 'Test',
            companyAreaId: areaId,
        };

        const response = await request(app.getHttpServer())
            .post('/api/auth/register')
            .set('Host', `${companySlug}.localhost:3000`)
            .send(employeeData)
            .expect(201);

        return {
            ...response.body.data.user,
            credentials: {
                email: employeeData.email,
                password: employeeData.password,
            },
        };
    }

    /**
     * Crear competición
     */
    static async createCompetition(
        app: INestApplication,
        adminToken: string,
        data?: Partial<{
            name: string;
            startDate: string;
            endDate: string;
        }>,
    ) {
        const competitionData = {
            name: data?.name || 'Test Competition',
            startDate: data?.startDate || new Date().toISOString(),
            endDate: data?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const response = await request(app.getHttpServer())
            .post('/api/admin/competitions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(competitionData)
            .expect(201);

        return response.body.data;
    }

    /**
     * Crear equipo
     */
    static async createTeam(
        app: INestApplication,
        adminToken: string,
        competitionId: string,
        name: string,
    ) {
        const response = await request(app.getHttpServer())
            .post('/api/admin/teams')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                competitionId,
                name,
                shortName: name.substring(0, 3).toUpperCase(),
                flagUrl: `https://flagcdn.com/w320/${name.toLowerCase()}.png`,
            })
            .expect(201);

        return response.body.data;
    }

    /**
     * Crear partido
     */
    static async createMatch(
        app: INestApplication,
        adminToken: string,
        data: {
            competitionId: string;
            teamAId: string;
            teamBId: string;
            matchDate: string;
            stage?: string;
            location?: string;
        },
    ) {
        const response = await request(app.getHttpServer())
            .post('/api/admin/matches')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                competitionId: data.competitionId,
                teamAId: data.teamAId,
                teamBId: data.teamBId,
                matchDate: data.matchDate,
                stage: data.stage || 'Group Stage',
                location: data.location || 'Test Stadium',
            })
            .expect(201);

        return response.body.data;
    }

    /**
     * Crear prode
     */
    static async createProde(
        app: INestApplication,
        companyAdminToken: string,
        companySlug: string,
        competitionId: string,
        variableIds: string[],
    ) {
        const prodeData = {
            competitionId,
            name: 'Test Prode',
            description: 'Test prode for E2E',
            participationMode: 'both',
            variableConfigs: variableIds.map(id => ({
                variableId: id,
                points: 10,
                isActive: true,
            })),
            rankingConfig: {
                showIndividualGeneral: true,
                showIndividualByArea: true,
                showAreaRanking: true,
                areaRankingCalculation: 'average',
            },
        };

        const response = await request(app.getHttpServer())
            .post('/api/company/prodes')
            .set('Authorization', `Bearer ${companyAdminToken}`)
            .set('Host', `${companySlug}.localhost:3000`)
            .send(prodeData)
            .expect(201);

        return response.body.data;
    }

    /**
     * Limpiar base de datos
     */
    static async cleanDatabase(prisma: PrismaService) {
        // Orden importante para respetar foreign keys
        await prisma.auditLog.deleteMany();
        await prisma.predictionScore.deleteMany();
        await prisma.predictedScorer.deleteMany();
        await prisma.prediction.deleteMany();
        await prisma.prodeParticipant.deleteMany();
        await prisma.prodeVariableConfig.deleteMany();
        await prisma.prodeRankingConfig.deleteMany();
        await prisma.prode.deleteMany();
        await prisma.matchScorer.deleteMany();
        await prisma.matchResult.deleteMany();
        await prisma.match.deleteMany();
        await prisma.team.deleteMany();
        await prisma.competition.deleteMany();
        await prisma.employee.deleteMany();
        await prisma.companyArea.deleteMany();
        await prisma.company.deleteMany();
        await prisma.user.deleteMany({
            where: {
                role: { not: 'admin_global' },
            },
        });
    }

    /**
     * Esperar (para jobs asíncronos)
     */
    static async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
