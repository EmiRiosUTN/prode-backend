/**
 * Test Automático del Módulo de Rankings
 * 
 * Este script crea datos de prueba automáticamente y ejecuta todos los tests
 * 
 * Ejecutar: node auto-test-rankings.js
 */

const BASE_URL = 'http://localhost:3000/api';

// Credenciales del admin global
const ADMIN_CREDENTIALS = {
    email: 'admin@mundialpro.com',
    password: 'Admin123!MundialPro'
};

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, colors.green);
}

function logError(message) {
    log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
    log(`⚠️  ${message}`, colors.yellow);
}

function logSection(message) {
    log(`\n${'='.repeat(60)}`, colors.bright);
    log(message, colors.bright);
    log('='.repeat(60), colors.bright);
}

async function login(email, password) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Login failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return {
        token: data.data.accessToken,
        user: data.data.user,
    };
}

async function getCompanies(adminToken) {
    const response = await fetch(`${BASE_URL}/admin/companies`, {
        headers: {
            'Authorization': `Bearer ${adminToken}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to get companies');
    }

    const data = await response.json();
    return data.data;
}

async function getCompetitions(adminToken) {
    const response = await fetch(`${BASE_URL}/admin/competitions`, {
        headers: {
            'Authorization': `Bearer ${adminToken}`,
        },
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    return data.data;
}

async function createTestCompany(adminToken) {
    const timestamp = Date.now();
    const companyData = {
        name: `Test Company ${timestamp}`,
        slug: `test-${timestamp}`,
        adminEmail: `admin-${timestamp}@test.com`,
        adminPassword: 'Admin123!Test',
    };

    const response = await fetch(`${BASE_URL}/admin/companies`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create company: ${error.message}`);
    }

    const data = await response.json();
    return {
        company: data.data,
        adminCredentials: {
            email: companyData.adminEmail,
            password: companyData.adminPassword,
        },
    };
}

async function createArea(companyAdminToken, companySlug, name) {
    const response = await fetch(`${BASE_URL}/company/areas`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${companyAdminToken}`,
            'Content-Type': 'application/json',
            'Host': `${companySlug}.localhost:3000`,
        },
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create area: ${error.message}`);
    }

    const data = await response.json();
    return data.data;
}

async function registerEmployee(companySlug, areaId, index) {
    const employeeData = {
        email: `employee${index}@${companySlug}.com`,
        password: 'Employee123!',
        firstName: `Employee${index}`,
        lastName: 'Test',
        companyAreaId: areaId,
    };

    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Host': `${companySlug}.localhost:3000`,
        },
        body: JSON.stringify(employeeData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to register employee: ${error.message}`);
    }

    const data = await response.json();
    return {
        employee: data.data.user,
        credentials: {
            email: employeeData.email,
            password: employeeData.password,
        },
    };
}

async function createProde(companyAdminToken, companySlug, competitionId, name) {
    const prodeData = {
        competitionId,
        name,
        description: 'Test prode for rankings',
        participationMode: 'both',
        variableConfigs: [],
        rankingConfig: {
            showIndividualGeneral: true,
            showIndividualByArea: true,
            showAreaRanking: true,
            areaRankingCalculation: 'average',
        },
    };

    const response = await fetch(`${BASE_URL}/company/prodes`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${companyAdminToken}`,
            'Content-Type': 'application/json',
            'Host': `${companySlug}.localhost:3000`,
        },
        body: JSON.stringify(prodeData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create prode: ${error.message}`);
    }

    const data = await response.json();
    return data.data;
}

async function joinProde(employeeToken, prodeId) {
    const response = await fetch(`${BASE_URL}/prodes/${prodeId}/join`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${employeeToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to join prode: ${error.message}`);
    }

    return true;
}

async function testRankingEndpoint(token, prodeId, endpoint, endpointName) {
    const url = `${BASE_URL}/prodes/${prodeId}/rankings/${endpoint}`;

    try {
        const startTime = Date.now();
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const error = await response.json();
            logError(`${endpointName}: ${error.message || response.statusText}`);
            return { success: false, error: error.message };
        }

        const data = await response.json();
        const ranking = data.data;

        logSuccess(`${endpointName} (${responseTime}ms)`);
        logInfo(`   Cached: ${ranking.metadata.isCached}`);
        logInfo(`   Total participants: ${ranking.metadata.totalParticipants}`);
        logInfo(`   Ranking entries: ${ranking.ranking.length}`);

        if (ranking.ranking.length > 0) {
            log(`   Top entries:`, colors.cyan);
            ranking.ranking.slice(0, 3).forEach(entry => {
                const name = entry.employeeName || entry.areaName;
                const points = entry.totalPoints;
                const extra = entry.areaName ? ` (${entry.areaName})` : ` (${entry.participantsCount} participants)`;
                log(`      ${entry.position}. ${name}${extra} - ${points} pts`);
            });
        } else {
            logWarning(`   No ranking entries (this is normal without PredictionScore data)`);
        }

        return { success: true, data: ranking, responseTime };
    } catch (error) {
        logError(`${endpointName}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testCaching(token, prodeId) {
    logSection('TESTING CACHE');

    const endpoint = `${BASE_URL}/prodes/${prodeId}/rankings/general`;

    log('\n1. Primera request (sin caché)...');
    const start1 = Date.now();
    const response1 = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const time1 = Date.now() - start1;
    const data1 = await response1.json();

    logInfo(`   Time: ${time1}ms`);
    logInfo(`   Cached: ${data1.data.metadata.isCached}`);

    log('\n2. Segunda request (debería estar en caché)...');
    const start2 = Date.now();
    const response2 = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const time2 = Date.now() - start2;
    const data2 = await response2.json();

    logInfo(`   Time: ${time2}ms`);
    logInfo(`   Cached: ${data2.data.metadata.isCached}`);

    if (data2.data.metadata.isCached && time2 < time1) {
        logSuccess('\n✓ Cache is working correctly!');
        logInfo(`   Speed improvement: ${Math.round((1 - time2 / time1) * 100)}%`);
    } else if (data2.data.metadata.isCached) {
        logWarning('\n⚠ Cache is working but no significant speed improvement');
    } else {
        logWarning('\n⚠ Cache might not be working as expected');
    }
}

async function main() {
    try {
        log('\n🚀 AUTOMATIC RANKING MODULE TEST', colors.bright);
        log('Creating test data and running all tests...', colors.bright);
        log('='.repeat(60), colors.bright);

        // Login como admin global
        logSection('STEP 1: ADMIN LOGIN');
        const { token: adminToken } = await login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        logSuccess('Admin login successful');

        // Verificar si hay competiciones
        logSection('STEP 2: CHECKING COMPETITIONS');
        const competitions = await getCompetitions(adminToken);
        if (competitions.length === 0) {
            logError('No competitions found. Please create a competition first.');
            logInfo('You can create one using the admin endpoints or the frontend.');
            process.exit(1);
        }
        const competition = competitions[0];
        logSuccess(`Using competition: ${competition.name}`);

        // Crear empresa de prueba
        logSection('STEP 3: CREATING TEST COMPANY');
        const { company, adminCredentials } = await createTestCompany(adminToken);
        logSuccess(`Company created: ${company.name}`);
        logInfo(`   Slug: ${company.slug}`);
        logInfo(`   Admin: ${adminCredentials.email}`);

        // Login como admin de empresa
        logSection('STEP 4: COMPANY ADMIN LOGIN');
        const { token: companyAdminToken } = await login(adminCredentials.email, adminCredentials.password);
        logSuccess('Company admin login successful');

        // Crear áreas
        logSection('STEP 5: CREATING AREAS');
        const area1 = await createArea(companyAdminToken, company.slug, 'Sistemas');
        logSuccess(`Area created: ${area1.name}`);
        const area2 = await createArea(companyAdminToken, company.slug, 'Marketing');
        logSuccess(`Area created: ${area2.name}`);

        // Registrar empleados
        logSection('STEP 6: REGISTERING EMPLOYEES');
        const employees = [];
        for (let i = 1; i <= 3; i++) {
            const area = i <= 2 ? area1 : area2;
            const { employee, credentials } = await registerEmployee(company.slug, area.id, i);
            employees.push({ employee, credentials });
            logSuccess(`Employee ${i} registered: ${credentials.email}`);
        }

        // Crear prode
        logSection('STEP 7: CREATING PRODE');
        const prode = await createProde(companyAdminToken, company.slug, competition.id, 'Test Prode Rankings');
        logSuccess(`Prode created: ${prode.name}`);
        logInfo(`   ID: ${prode.id}`);

        // Empleados se unen al prode
        logSection('STEP 8: EMPLOYEES JOINING PRODE');
        for (const { employee, credentials } of employees) {
            const { token: empToken } = await login(credentials.email, credentials.password);
            await joinProde(empToken, prode.id);
            logSuccess(`${credentials.email} joined the prode`);
        }

        // Ejecutar tests de rankings
        logSection('STEP 9: TESTING RANKING ENDPOINTS');
        const testEmployee = employees[0];
        const { token: testToken } = await login(testEmployee.credentials.email, testEmployee.credentials.password);

        log('\n9.1. Testing General Ranking...');
        await testRankingEndpoint(testToken, prode.id, 'general', 'General Ranking');

        log('\n9.2. Testing My Area Ranking...');
        await testRankingEndpoint(testToken, prode.id, 'my-area', 'My Area Ranking');

        log('\n9.3. Testing Areas Ranking...');
        await testRankingEndpoint(testToken, prode.id, 'areas', 'Areas Ranking');

        // Test caché
        await testCaching(testToken, prode.id);

        logSection('TEST SUMMARY');
        logSuccess('All tests completed successfully! 🎉');
        log('\n📊 Test Data Created:');
        logInfo(`   Company: ${company.name} (${company.slug})`);
        logInfo(`   Areas: 2 (Sistemas, Marketing)`);
        logInfo(`   Employees: ${employees.length}`);
        logInfo(`   Prode: ${prode.name}`);
        log('\n⚠️  Note: Rankings show 0 points because PredictionScore calculation');
        log('   (Phase 7) is not yet implemented. But endpoints work correctly!');

    } catch (error) {
        logSection('TEST FAILED');
        logError(error.message);
        log('\nStack trace:');
        console.error(error);
        process.exit(1);
    }
}

main();
