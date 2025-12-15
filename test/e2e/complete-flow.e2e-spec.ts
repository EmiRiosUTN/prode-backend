import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestHelpers } from '../helpers/test-helpers';
import { TestData } from '../helpers/test-data';

describe('Complete Prode Lifecycle (E2E)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let adminToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Login como admin global
        adminToken = await TestHelpers.loginAs(
            app,
            'admin@mundialpro.com',
            'Admin123!MundialPro',
        );
    });

    afterAll(async () => {
        await TestHelpers.cleanDatabase(prisma);
        await app.close();
    });

    it('should complete full prode lifecycle from creation to rankings', async () => {
        // ============================================
        // FASE 1: SETUP - Admin Global crea estructura base
        // ============================================

        // 1.1 Crear competición
        const competition = await TestHelpers.createCompetition(app, adminToken, {
            name: 'Mundial 2026 Test',
        });
        expect(competition).toHaveProperty('id');
        expect(competition.name).toBe('Mundial 2026 Test');

        // 1.2 Crear equipos
        const teams: any[] = [];
        for (const teamName of ['Argentina', 'Brasil', 'Francia', 'Alemania']) {
            const team = await TestHelpers.createTeam(app, adminToken, competition.id, teamName);
            teams.push(team);
        }
        expect(teams).toHaveLength(4);

        // 1.3 Crear partidos
        const matches: any[] = [];
        // Partido 1: Argentina vs Brasil (en 2 horas)
        const match1 = await TestHelpers.createMatch(app, adminToken, {
            competitionId: competition.id,
            teamAId: teams[0].id,
            teamBId: teams[1].id,
            matchDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            stage: 'Semifinal',
        });
        matches.push(match1);

        // Partido 2: Francia vs Alemania (en 3 horas)
        const match2 = await TestHelpers.createMatch(app, adminToken, {
            competitionId: competition.id,
            teamAId: teams[2].id,
            teamBId: teams[3].id,
            matchDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            stage: 'Semifinal',
        });
        matches.push(match2);

        expect(matches).toHaveLength(2);

        // 1.4 Obtener variables de predicción
        const variablesResponse = await request(app.getHttpServer())
            .get('/api/admin/prediction-variables')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const variables = variablesResponse.body.data;
        expect(variables.length).toBeGreaterThan(0);

        const variableIds = variables.slice(0, 3).map(v => v.id); // Usar primeras 3 variables

        // ============================================
        // FASE 2: EMPRESA - Crear empresa y estructura
        // ============================================

        // 2.1 Crear empresa
        const company = await TestHelpers.createTestCompany(app, adminToken);
        expect(company).toHaveProperty('id');
        expect(company).toHaveProperty('slug');

        // 2.2 Login como admin de empresa
        const companyAdminToken = await TestHelpers.loginAs(
            app,
            company.adminCredentials.email,
            company.adminCredentials.password,
        );

        // 2.3 Crear áreas
        const areaIT = await TestHelpers.createArea(
            app,
            companyAdminToken,
            company.slug,
            'Sistemas',
        );
        const areaMarketing = await TestHelpers.createArea(
            app,
            companyAdminToken,
            company.slug,
            'Marketing',
        );
        expect(areaIT).toHaveProperty('id');
        expect(areaMarketing).toHaveProperty('id');

        // 2.4 Crear prode
        const prode = await TestHelpers.createProde(
            app,
            companyAdminToken,
            company.slug,
            competition.id,
            variableIds,
        );
        expect(prode).toHaveProperty('id');
        expect(prode.name).toBe('Test Prode');

        // ============================================
        // FASE 3: EMPLEADOS - Registro y participación
        // ============================================

        // 3.1 Registrar empleados
        const employees: any[] = [];

        // 3 empleados de IT
        for (let i = 1; i <= 3; i++) {
            const employee = await TestHelpers.registerEmployee(
                app,
                company.slug,
                areaIT.id,
                i,
            );
            employees.push(employee);
        }

        // 2 empleados de Marketing
        for (let i = 4; i <= 5; i++) {
            const employee = await TestHelpers.registerEmployee(
                app,
                company.slug,
                areaMarketing.id,
                i,
            );
            employees.push(employee);
        }

        expect(employees).toHaveLength(5);

        // 3.2 Empleados se unen al prode
        const employeeTokens: string[] = [];
        for (const employee of employees) {
            const token = await TestHelpers.loginAs(
                app,
                employee.credentials.email,
                employee.credentials.password,
            );
            employeeTokens.push(token);

            await request(app.getHttpServer())
                .post(`/api/prodes/${prode.id}/join`)
                .set('Authorization', `Bearer ${token}`)
                .expect(201);
        }

        // ============================================
        // FASE 4: PREDICCIONES - Empleados predicen
        // ============================================

        // 4.1 Empleado 1 predice ambos partidos (predicciones correctas)
        await request(app.getHttpServer())
            .post('/api/predictions')
            .set('Authorization', `Bearer ${employeeTokens[0]}`)
            .send({
                prodeId: prode.id,
                matchId: match1.id,
                predictedGoalsTeamA: 2,
                predictedGoalsTeamB: 1,
                predictedYellowCardsTeamA: 2,
                predictedYellowCardsTeamB: 1,
            })
            .expect(201);

        await request(app.getHttpServer())
            .post('/api/predictions')
            .set('Authorization', `Bearer ${employeeTokens[0]}`)
            .send({
                prodeId: prode.id,
                matchId: match2.id,
                predictedGoalsTeamA: 1,
                predictedGoalsTeamB: 1,
            })
            .expect(201);

        // 4.2 Empleado 2 predice (predicciones parcialmente correctas)
        await request(app.getHttpServer())
            .post('/api/predictions')
            .set('Authorization', `Bearer ${employeeTokens[1]}`)
            .send({
                prodeId: prode.id,
                matchId: match1.id,
                predictedGoalsTeamA: 1,
                predictedGoalsTeamB: 0,
            })
            .expect(201);

        // 4.3 Empleado 3 predice (predicciones incorrectas)
        await request(app.getHttpServer())
            .post('/api/predictions')
            .set('Authorization', `Bearer ${employeeTokens[2]}`)
            .send({
                prodeId: prode.id,
                matchId: match1.id,
                predictedGoalsTeamA: 0,
                predictedGoalsTeamB: 3,
            })
            .expect(201);

        // 4.4 Empleados 4 y 5 también predicen
        for (let i = 3; i < 5; i++) {
            await request(app.getHttpServer())
                .post('/api/predictions')
                .set('Authorization', `Bearer ${employeeTokens[i]}`)
                .send({
                    prodeId: prode.id,
                    matchId: match1.id,
                    predictedGoalsTeamA: 1,
                    predictedGoalsTeamB: 1,
                })
                .expect(201);
        }

        // ============================================
        // FASE 5: RESULTADOS - Admin carga resultados
        // ============================================

        // 5.1 Cargar resultado del partido 1
        await request(app.getHttpServer())
            .put(`/api/admin/matches/${match1.id}/result`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                goalsTeamA: 2,
                goalsTeamB: 1,
                yellowCardsTeamA: 2,
                yellowCardsTeamB: 1,
                redCardsTeamA: 0,
                redCardsTeamB: 0,
            })
            .expect(200);

        // 5.2 Cargar resultado del partido 2
        await request(app.getHttpServer())
            .put(`/api/admin/matches/${match2.id}/result`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                goalsTeamA: 1,
                goalsTeamB: 1,
                yellowCardsTeamA: 1,
                yellowCardsTeamB: 2,
            })
            .expect(200);

        // 5.3 Esperar a que se calculen los puntos (job asíncrono)
        await TestHelpers.sleep(3000);

        // ============================================
        // FASE 6: RANKINGS - Verificar rankings
        // ============================================

        // 6.1 Obtener ranking general
        const rankingResponse = await request(app.getHttpServer())
            .get(`/api/prodes/${prode.id}/rankings/general`)
            .set('Authorization', `Bearer ${employeeTokens[0]}`)
            .expect(200);

        const ranking = rankingResponse.body.data;
        expect(ranking.metadata.totalParticipants).toBe(5);
        expect(ranking.ranking).toHaveLength(5);

        // Verificar que el empleado 1 tiene más puntos (predicciones correctas)
        const employee1Ranking = ranking.ranking.find(
            r => r.employeeName === 'Employee1 Test',
        );
        expect(employee1Ranking).toBeDefined();
        expect(employee1Ranking.totalPoints).toBeGreaterThan(0);

        // Verificar ordenamiento por puntos
        for (let i = 0; i < ranking.ranking.length - 1; i++) {
            expect(ranking.ranking[i].totalPoints).toBeGreaterThanOrEqual(
                ranking.ranking[i + 1].totalPoints,
            );
        }

        // 6.2 Obtener ranking por área
        const areaRankingResponse = await request(app.getHttpServer())
            .get(`/api/prodes/${prode.id}/rankings/my-area`)
            .set('Authorization', `Bearer ${employeeTokens[0]}`)
            .expect(200);

        const areaRanking = areaRankingResponse.body.data;
        expect(areaRanking.ranking).toHaveLength(3); // 3 empleados de IT

        // 6.3 Obtener ranking entre áreas
        const areasRankingResponse = await request(app.getHttpServer())
            .get(`/api/prodes/${prode.id}/rankings/areas`)
            .set('Authorization', `Bearer ${employeeTokens[0]}`)
            .expect(200);

        const areasRanking = areasRankingResponse.body.data;
        expect(areasRanking.ranking).toHaveLength(2); // IT y Marketing

        const itArea = areasRanking.ranking.find(r => r.areaName === 'Sistemas');
        expect(itArea).toBeDefined();
        expect(itArea.participantsCount).toBe(3);

        // 6.4 Verificar caché
        const cachedRankingResponse = await request(app.getHttpServer())
            .get(`/api/prodes/${prode.id}/rankings/general`)
            .set('Authorization', `Bearer ${employeeTokens[0]}`)
            .expect(200);

        expect(cachedRankingResponse.body.data.metadata.isCached).toBe(true);

        // ============================================
        // FASE 7: MULTI-TENANCY - Verificar aislamiento
        // ============================================

        // 7.1 Crear segunda empresa
        const company2 = await TestHelpers.createTestCompany(app, adminToken);
        const company2AdminToken = await TestHelpers.loginAs(
            app,
            company2.adminCredentials.email,
            company2.adminCredentials.password,
        );

        // 7.2 Empleado de empresa 1 NO puede acceder a datos de empresa 2
        await request(app.getHttpServer())
            .get('/api/company/employees')
            .set('Authorization', `Bearer ${employeeTokens[0]}`)
            .set('Host', `${company2.slug}.localhost:3000`)
            .expect(403);

        // 7.3 Admin de empresa 1 NO puede ver prodes de empresa 2
        const company2Area = await TestHelpers.createArea(
            app,
            company2AdminToken,
            company2.slug,
            'Test Area',
        );

        const company2Prode = await TestHelpers.createProde(
            app,
            company2AdminToken,
            company2.slug,
            competition.id,
            variableIds,
        );

        await request(app.getHttpServer())
            .get('/api/company/prodes')
            .set('Authorization', `Bearer ${companyAdminToken}`)
            .set('Host', `${company.slug}.localhost:3000`)
            .expect(200)
            .then(response => {
                const prodes = response.body.data;
                expect(prodes).toHaveLength(1);
                expect(prodes[0].id).toBe(prode.id);
                expect(prodes[0].id).not.toBe(company2Prode.id);
            });

        // ============================================
        // RESUMEN FINAL
        // ============================================
        console.log('\n✅ Complete Prode Lifecycle Test Summary:');
        console.log(`   - Competition created: ${competition.name}`);
        console.log(`   - Teams created: ${teams.length}`);
        console.log(`   - Matches created: ${matches.length}`);
        console.log(`   - Companies created: 2`);
        console.log(`   - Employees registered: ${employees.length}`);
        console.log(`   - Predictions made: 6`);
        console.log(`   - Rankings calculated: ✓`);
        console.log(`   - Multi-tenancy validated: ✓`);
        console.log(`   - Cache working: ✓`);
    }, 60000); // 60 segundos timeout para test completo
});
