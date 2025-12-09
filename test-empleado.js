#!/usr/bin/env node

/**
 * Script de Testing Completo - Fase 5: Módulo Employee
 * Incluye setup automático de empleado si no existe
 */

const BASE_URL = 'http://acme.localhost:3000';
const API_BASE = `${BASE_URL}/api`;

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

let employeeToken = '';
let companyAdminToken = '';
let prodeId = '';
let matchId = '';
let predictionId = '';
let areaId = '';

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(`  ${title}`, 'cyan');
    console.log('='.repeat(80) + '\n');
}

function logTest(name) {
    totalTests++;
    log(`\n[TEST ${totalTests}] ${name}`, 'blue');
    log('-'.repeat(80), 'gray');
}

function logSuccess(message) {
    passedTests++;
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    failedTests++;
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`  ${message}`, 'gray');
}

function logData(label, data) {
    log(`  ${label}:`, 'yellow');
    console.log(JSON.stringify(data, null, 2).split('\n').map(line => `    ${line}`).join('\n'));
}

async function request(method, endpoint, body = null, headers = {}) {
    const url = `${API_BASE}${endpoint}`;

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    logInfo(`${method} ${endpoint}`);

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        return {
            status: response.status,
            ok: response.ok,
            data: data
        };
    } catch (error) {
        logError(`Request failed: ${error.message}`);
        return {
            status: 0,
            ok: false,
            data: { message: error.message }
        };
    }
}

function validateResponse(response, expectedStatus, action) {
    if (response.status === expectedStatus) {
        logSuccess(`${action} - Status ${expectedStatus}`);
        return true;
    } else {
        logError(`${action} - Expected ${expectedStatus}, got ${response.status}`);
        log('  Response:', 'gray');
        console.log(JSON.stringify(response.data, null, 2).split('\n').map(line => `    ${line}`).join('\n'));
        return false;
    }
}

// ============================================================================
// SETUP AUTOMÁTICO
// ============================================================================

async function loginAsCompanyAdmin() {
    logTest('Setup: Login como Admin de Empresa');

    const response = await request('POST', '/auth/login', {
        email: 'admin@acme.com',
        password: 'Company123!'
    });

    if (validateResponse(response, 200, 'Login admin exitoso')) {
        const responseData = response.data.data || response.data;
        if (responseData.accessToken) {
            companyAdminToken = responseData.accessToken;
            logSuccess('Token de admin recibido');
        }
    }
}

async function getOrCreateArea() {
    logTest('Setup: Obtener o crear área de Sistemas');

    // Intentar obtener áreas existentes
    const areasResponse = await request('GET', '/company/areas', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (areasResponse.status === 200) {
        const areas = areasResponse.data.data || areasResponse.data;
        if (Array.isArray(areas) && areas.length > 0) {
            // Buscar área de Sistemas
            const sistemasArea = areas.find(a => a.name === 'Sistemas');
            if (sistemasArea) {
                areaId = sistemasArea.id;
                logSuccess(`Área de Sistemas encontrada: ${areaId}`);
                return;
            }
            // Si no hay Sistemas, usar la primera disponible
            areaId = areas[0].id;
            logSuccess(`Usando área: ${areas[0].name} (${areaId})`);
            return;
        }
    }

    // Si no hay áreas, crear una
    const createAreaResponse = await request('POST', '/company/areas', {
        name: 'Sistemas',
        description: 'Área de Sistemas'
    }, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (createAreaResponse.status === 201) {
        const area = createAreaResponse.data.data || createAreaResponse.data;
        areaId = area.id;
        logSuccess(`Área de Sistemas creada: ${areaId}`);
    } else {
        logError('No se pudo crear área de Sistemas');
    }
}

async function registerOrLoginEmployee() {
    logTest('Setup: Registrar o hacer login como empleado');

    // Intentar login primero
    const loginResponse = await request('POST', '/auth/login', {
        email: 'john.doe@acme.com',
        password: 'Employee123!'
    });

    if (loginResponse.status === 200) {
        const responseData = loginResponse.data.data || loginResponse.data;
        if (responseData.accessToken) {
            employeeToken = responseData.accessToken;
            logSuccess('Empleado ya existe - Login exitoso');
            return;
        }
    }

    // Si no existe, registrar
    if (!areaId) {
        logError('No hay área disponible para registrar empleado');
        return;
    }

    logInfo('Empleado no existe - Registrando...');

    const registerResponse = await request('POST', '/auth/register', {
        email: 'john.doe@acme.com',
        password: 'Employee123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+54 11 1234-5678',
        companyAreaId: areaId
    });

    if (registerResponse.status === 201) {
        const responseData = registerResponse.data.data || registerResponse.data;
        if (responseData.accessToken) {
            employeeToken = responseData.accessToken;
            logSuccess('Empleado registrado exitosamente');
            logData('Nuevo empleado', {
                email: 'john.doe@acme.com',
                nombre: 'John Doe',
                area: responseData.user?.employee?.company_area?.name
            });
        }
    } else {
        logError('No se pudo registrar empleado');
    }
}

async function setupProdeAndMatch() {
    logTest('Setup: Obtener Prode y Match para testing');

    // Obtener competición
    const competitionsResponse = await request('GET', '/admin/competitions', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    let competitionId = null;
    if (competitionsResponse.status === 200) {
        const competitions = competitionsResponse.data.data || competitionsResponse.data;
        if (Array.isArray(competitions) && competitions.length > 0) {
            competitionId = competitions[0].id;
            logSuccess(`Competición encontrada: ${competitionId}`);
        }
    }

    // Obtener o crear prode
    const prodesResponse = await request('GET', '/company/prodes', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (prodesResponse.status === 200) {
        const prodes = prodesResponse.data.data || prodesResponse.data;
        if (Array.isArray(prodes) && prodes.length > 0) {
            prodeId = prodes[0].id;
            logSuccess(`Prode encontrado: ${prodeId}`);
        } else if (competitionId) {
            // Crear un prode si no existe
            logInfo('No hay prodes - Creando uno...');
            const createProdeResponse = await request('POST', '/company/prodes', {
                name: 'Prode Test Copa América',
                description: 'Prode de prueba para testing',
                competitionId: competitionId,
                participationMode: 'general',
                variableConfigs: [],
                rankingConfig: {
                    showIndividualGeneral: true,
                    showIndividualByArea: false,
                    showAreaRanking: false,
                    areaRankingCalculation: 'sum'
                }
            }, {
                'Authorization': `Bearer ${companyAdminToken}`
            });

            if (createProdeResponse.status === 201) {
                const prode = createProdeResponse.data.data || createProdeResponse.data;
                prodeId = prode.id;
                logSuccess(`Prode creado: ${prodeId}`);
            }
        }
    }

    // Obtener partidos
    const matchesResponse = await request('GET', '/admin/matches', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (matchesResponse.status === 200) {
        const matches = matchesResponse.data.data || matchesResponse.data;
        if (Array.isArray(matches) && matches.length > 0) {
            // Buscar un partido futuro
            const futureMatch = matches.find(m => new Date(m.date) > new Date());
            if (futureMatch) {
                matchId = futureMatch.id;
                logSuccess(`Match futuro encontrado: ${matchId}`);
            } else {
                matchId = matches[0].id;
                logInfo('Usando primer match disponible');
            }
        }
    }
}

// ============================================================================
// TESTS - PRODES DEL EMPLEADO
// ============================================================================

async function testMyProdes() {
    logTest('Listar mis prodes (donde participo)');

    const response = await request('GET', '/employee/prodes', null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 200, 'Listar mis prodes')) {
        const prodes = response.data.data || response.data;
        if (Array.isArray(prodes)) {
            logSuccess(`Se encontraron ${prodes.length} prode(s) donde participo`);
            if (prodes.length > 0) {
                logData('Primer prode', {
                    id: prodes[0].id,
                    name: prodes[0].name,
                    competition: prodes[0].competition?.name
                });
            }
        }
    }
}

async function testAvailableProdes() {
    logTest('Listar prodes disponibles para unirme');

    const response = await request('GET', '/employee/prodes/available', null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 200, 'Listar prodes disponibles')) {
        const prodes = response.data.data || response.data;
        if (Array.isArray(prodes)) {
            logSuccess(`Se encontraron ${prodes.length} prode(s) disponible(s)`);
            if (prodes.length > 0) {
                logData('Primer prode disponible', {
                    id: prodes[0].id,
                    name: prodes[0].name
                });
            }
        }
    }
}

async function testProdeDetail() {
    if (!prodeId) {
        logError('No hay prode ID para testear detalle');
        return;
    }

    logTest('Ver detalle de un prode');

    const response = await request('GET', `/employee/prodes/${prodeId}`, null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 200, 'Ver detalle de prode')) {
        const prode = response.data.data || response.data;
        if (prode) {
            logData('Detalle del prode', {
                id: prode.id,
                name: prode.name,
                isParticipating: prode.isParticipating,
                competition: prode.competition?.name
            });
        }
    }
}

async function testJoinProde() {
    if (!prodeId) {
        logError('No hay prode ID para testear unirse');
        return;
    }

    logTest('Unirse a un prode');

    const response = await request('POST', `/employee/prodes/${prodeId}/join`, null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (response.status === 201) {
        logSuccess('Se unió exitosamente al prode');
    } else if (response.status === 400 && response.data.message?.includes('Already participating')) {
        logSuccess('Ya estaba participando en el prode (esperado)');
    } else {
        validateResponse(response, 201, 'Unirse a prode');
    }
}

// ============================================================================
// TESTS - PREDICCIONES
// ============================================================================

async function testProdeMatches() {
    if (!prodeId) {
        logError('No hay prode ID para listar partidos');
        return;
    }

    logTest('Listar partidos de un prode');

    const response = await request('GET', `/employee/prodes/${prodeId}/matches`, null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 200, 'Listar partidos del prode')) {
        const matches = response.data.data || response.data;
        if (Array.isArray(matches)) {
            logSuccess(`Se encontraron ${matches.length} partido(s) en el prode`);
            if (matches.length > 0) {
                logData('Primer partido', {
                    id: matches[0].id,
                    home: matches[0].home_team?.name,
                    away: matches[0].away_team?.name,
                    date: matches[0].date
                });
                if (!matchId) {
                    matchId = matches[0].id;
                }
            }
        }
    }
}

async function testCreatePrediction() {
    if (!prodeId || !matchId) {
        logError('No hay prode ID o match ID para crear predicción');
        return;
    }

    logTest('Crear predicción para un partido');

    const response = await request('POST', '/employee/predictions', {
        prodeId: prodeId,
        matchId: matchId,
        predictedGoalsTeamA: 2,
        predictedGoalsTeamB: 1
    }, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 201, 'Crear predicción')) {
        const prediction = response.data.data || response.data;
        if (prediction && prediction.id) {
            predictionId = prediction.id;
            logSuccess(`Predicción creada con ID: ${predictionId}`);
        }
    }
}

async function testUpdatePrediction() {
    if (!prodeId || !matchId) {
        logError('No hay prode ID o match ID para actualizar predicción');
        return;
    }

    logTest('Actualizar predicción existente (UPSERT)');

    const response = await request('POST', '/employee/predictions', {
        prodeId: prodeId,
        matchId: matchId,
        predictedGoalsTeamA: 3,
        predictedGoalsTeamB: 2
    }, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (response.status === 201 || response.status === 200) {
        logSuccess('Predicción actualizada correctamente');
    } else {
        validateResponse(response, 200, 'Actualizar predicción');
    }
}

async function testMyPredictions() {
    logTest('Listar mis predicciones');

    const response = await request('GET', '/employee/predictions/my', null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 200, 'Listar mis predicciones')) {
        const predictions = response.data.data || response.data;
        if (Array.isArray(predictions)) {
            logSuccess(`Se encontraron ${predictions.length} predicción(es)`);
        }
    }
}

async function testMyPredictionsFiltered() {
    if (!prodeId) {
        logError('No hay prode ID para filtrar predicciones');
        return;
    }

    logTest('Listar mis predicciones filtradas por prode');

    const response = await request('GET', `/employee/predictions/my?prodeId=${prodeId}`, null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 200, 'Listar predicciones filtradas')) {
        const predictions = response.data.data || response.data;
        if (Array.isArray(predictions)) {
            logSuccess(`Se encontraron ${predictions.length} predicción(es) para el prode`);
        }
    }
}

async function testPredictionDetail() {
    if (!predictionId) {
        logError('No hay prediction ID para ver detalle');
        return;
    }

    logTest('Ver detalle de una predicción');

    const response = await request('GET', `/employee/predictions/${predictionId}`, null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 200, 'Ver detalle de predicción')) {
        const prediction = response.data.data || response.data;
        if (prediction) {
            logData('Detalle de predicción', {
                id: prediction.id,
                match: `${prediction.match?.home_team?.name} vs ${prediction.match?.away_team?.name}`,
                predicted: `${prediction.predicted_goals_team_a} - ${prediction.predicted_goals_team_b}`
            });
        }
    }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function runAllTests() {
    log('', 'reset');
    log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'bright');
    log('║            FASE 5: MÓDULO EMPLOYEE - TESTS COMPLETOS                         ║', 'bright');
    log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'bright');
    log('', 'reset');
    log(`Base URL: ${BASE_URL}`, 'cyan');
    log(`API Base: ${API_BASE}`, 'cyan');
    log('', 'reset');
    log('📝 Este script incluye setup automático de empleado', 'yellow');
    log('', 'reset');

    try {
        // SETUP AUTOMÁTICO
        logSection('SETUP AUTOMÁTICO');
        await loginAsCompanyAdmin();

        if (!companyAdminToken) {
            logError('No se pudo obtener token de admin. Abortando.');
            process.exit(1);
        }

        await getOrCreateArea();
        await registerOrLoginEmployee();

        if (!employeeToken) {
            logError('No se pudo obtener token de empleado. Abortando.');
            process.exit(1);
        }

        await setupProdeAndMatch();

        // PRODES DEL EMPLEADO
        logSection('1. PRODES DEL EMPLEADO');
        await testMyProdes();
        await testAvailableProdes();
        await testProdeDetail();
        await testJoinProde();

        // PREDICCIONES
        logSection('2. PREDICCIONES');
        await testProdeMatches();
        await testCreatePrediction();
        await testUpdatePrediction();
        await testMyPredictions();
        await testMyPredictionsFiltered();
        await testPredictionDetail();

    } catch (error) {
        logError(`Error fatal: ${error.message}`);
        console.error(error);
        process.exit(1);
    }

    // RESUMEN
    log('', 'reset');
    log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'bright');
    log('║                            RESUMEN DE TESTS                                   ║', 'bright');
    log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'bright');
    log('', 'reset');
    log(`Total de tests ejecutados: ${totalTests}`, 'cyan');
    log(`✓ Tests exitosos: ${passedTests}`, 'green');
    log(`✗ Tests fallidos: ${failedTests}`, 'red');
    const percentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    log(`Porcentaje de éxito: ${percentage}%`, 'yellow');
    log('', 'reset');

    if (failedTests === 0) {
        log('🎉 ¡TODOS LOS TESTS PASARON! 🎉', 'green');
        log('', 'reset');
        log('📋 Credenciales creadas:', 'cyan');
        log('   Email: john.doe@acme.com', 'gray');
        log('   Password: Employee123!', 'gray');
        log('', 'reset');
        process.exit(0);
    } else {
        log('⚠️  Algunos tests fallaron. Revisa los detalles arriba.', 'yellow');
        process.exit(1);
    }
}

runAllTests().catch((error) => {
    console.error('Error crítico:', error);
    process.exit(1);
});