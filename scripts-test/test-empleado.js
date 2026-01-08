#!/usr/bin/env node

/**
 * Script de Testing - Fase 5: Módulo Employee
 * Tests SOLO de funcionalidades de empleados
 */

const BASE_URL = 'http://acme.localhost:3001';
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
let competitionId = '';

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
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`  ${message}`, 'gray');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
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
        passedTests++;
        logSuccess(`${action} - Status ${expectedStatus}`);
        return true;
    } else {
        failedTests++;
        logError(`${action} - Expected ${expectedStatus}, got ${response.status}`);
        if (response.data) {
            logData('Response', response.data);
        }
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

async function setupProdeIfNeeded() {
    logTest('Setup: Verificar o crear Prode para testing');

    // Verificar si ya hay prodes
    const prodesResponse = await request('GET', '/company/prodes', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (prodesResponse.status === 200) {
        const prodes = prodesResponse.data.data || prodesResponse.data;
        if (Array.isArray(prodes) && prodes.length > 0) {
            prodeId = prodes[0].id;
            logSuccess(`Prode ya existe: ${prodes[0].name} (${prodeId})`);
            return;
        }
    }

    // No hay prodes, necesitamos crear uno
    logInfo('No hay prodes - Creando uno para testing...');

    // Primero obtener una competición
    const compsResponse = await request('GET', '/admin/competitions', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (compsResponse.status === 200) {
        const comps = compsResponse.data.data || compsResponse.data;
        if (Array.isArray(comps) && comps.length > 0) {
            competitionId = comps[0].id;
            logSuccess(`Competición encontrada: ${comps[0].name}`);
        }
    }

    if (!competitionId) {
        logWarning('No hay competiciones disponibles');
        logInfo('💡 Ejecuta el seed: npx prisma db seed');
        return;
    }

    // Crear prode
    const createProdeResponse = await request('POST', '/company/prodes', {
        name: 'Prode Test Automático',
        description: 'Prode creado automáticamente para testing de Fase 5',
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
        logSuccess(`✨ Prode creado exitosamente: ${prodeId}`);
        logData('Prode creado', {
            id: prode.id,
            name: prode.name,
            competition: prode.competition?.name
        });
    } else {
        logError('No se pudo crear el prode');
        logData('Error', createProdeResponse.data);
    }
}

// ============================================================================
// LOGIN EMPLEADO
// ============================================================================

async function loginAsEmployee() {
    logTest('Login como Empleado');

    const response = await request('POST', '/auth/login', {
        email: 'john.doe@acme.com',
        password: 'Employee123!'
    });

    if (validateResponse(response, 200, 'Login exitoso')) {
        const responseData = response.data.data || response.data;
        if (responseData.accessToken) {
            employeeToken = responseData.accessToken;
            logSuccess('Token de empleado recibido');
            logData('Usuario', {
                email: responseData.user?.email,
                role: responseData.user?.role,
                nombre: `${responseData.user?.employee?.first_name} ${responseData.user?.employee?.last_name}`
            });
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
                prodeId = prodes[0].id;
                logData('Primer prode disponible', {
                    id: prodes[0].id,
                    name: prodes[0].name,
                    description: prodes[0].description,
                    participantCount: prodes[0]._count?.participants || 0
                });
            } else {
                logWarning('No hay prodes disponibles');
                logInfo('El admin de empresa debe crear un prode primero');
            }
        }
    }
}

async function testProdeDetail() {
    if (!prodeId) {
        logWarning('Saltando test: No hay prode disponible para ver detalle');
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
                competition: prode.competition?.name,
                variableConfigs: prode.prode_variable_configs?.length || 0,
                rankingConfig: prode.prode_ranking_config ? 'Configurado' : 'No configurado'
            });
        }
    }
}

async function testJoinProde() {
    if (!prodeId) {
        logWarning('Saltando test: No hay prode disponible para unirse');
        return;
    }

    logTest('Unirse a un prode');

    const response = await request('POST', `/employee/prodes/${prodeId}/join`, null, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (response.status === 201) {
        passedTests++;
        logSuccess('Se unió exitosamente al prode');
        const result = response.data.data || response.data;
        if (result) {
            logData('Participación', {
                message: result.message,
                prode: result.participant?.prode?.name
            });
        }
    } else if (response.status === 400 && response.data.message?.includes('Already participating')) {
        passedTests++;
        logSuccess('Ya estaba participando en el prode (esperado)');
    } else {
        failedTests++;
        logError(`Unirse a prode - Expected 201, got ${response.status}`);
        logData('Response', response.data);
    }
}

// ============================================================================
// TESTS - PREDICCIONES
// ============================================================================

async function testProdeMatches() {
    if (!prodeId) {
        logWarning('Saltando test: No hay prode para listar partidos');
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
                const match = matches[0];
                matchId = match.id;
                logData('Primer partido', {
                    id: match.id,
                    home: match.home_team?.name || match.team_a?.name,
                    away: match.away_team?.name || match.team_b?.name,
                    date: match.date || match.match_date,
                    myPrediction: match.myPrediction ? 'Sí' : 'No',
                    isLocked: match.isLocked
                });
            } else {
                logWarning('El prode no tiene partidos asociados');
            }
        }
    }
}

async function testCreatePrediction() {
    if (!prodeId || !matchId) {
        logWarning('Saltando test: No hay prode o match para crear predicción');
        return;
    }

    logTest('Crear predicción para un partido');

    const response = await request('POST', '/employee/predictions', {
        prodeId: prodeId,
        matchId: matchId,
        homeScore: 2,
        awayScore: 1
    }, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (validateResponse(response, 201, 'Crear predicción')) {
        const prediction = response.data.data || response.data;
        if (prediction && prediction.id) {
            predictionId = prediction.id;
            logSuccess(`Predicción creada con ID: ${predictionId}`);
            logData('Predicción creada', {
                id: prediction.id,
                predictedGoalsTeamA: prediction.predicted_goals_team_a,
                predictedGoalsTeamB: prediction.predicted_goals_team_b,
                createdAt: prediction.created_at
            });
        }
    }
}

async function testUpdatePrediction() {
    if (!prodeId || !matchId) {
        logWarning('Saltando test: No hay prode o match para actualizar predicción');
        return;
    }

    logTest('Actualizar predicción existente (UPSERT)');

    const response = await request('POST', '/employee/predictions', {
        prodeId: prodeId,
        matchId: matchId,
        homeScore: 3,
        awayScore: 2
    }, {
        'Authorization': `Bearer ${employeeToken}`
    });

    if (response.status === 201 || response.status === 200) {
        passedTests++;
        logSuccess('Predicción actualizada correctamente (UPSERT)');
        const prediction = response.data.data || response.data;
        if (prediction) {
            logData('Predicción actualizada', {
                id: prediction.id,
                predictedGoalsTeamA: prediction.predicted_goals_team_a,
                predictedGoalsTeamB: prediction.predicted_goals_team_b
            });
        }
    } else {
        failedTests++;
        logError(`Actualizar predicción - Expected 200/201, got ${response.status}`);
        logData('Response', response.data);
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
            if (predictions.length > 0) {
                logData('Primera predicción', {
                    id: predictions[0].id,
                    match: `${predictions[0].match?.home_team?.name || predictions[0].match?.team_a?.name} vs ${predictions[0].match?.away_team?.name || predictions[0].match?.team_b?.name}`,
                    predicted: `${predictions[0].predicted_goals_team_a} - ${predictions[0].predicted_goals_team_b}`,
                    createdAt: predictions[0].created_at
                });
            }
        }
    }
}

async function testMyPredictionsFiltered() {
    if (!prodeId) {
        logWarning('Saltando test: No hay prode para filtrar predicciones');
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
        logWarning('Saltando test: No hay predicción para ver detalle');
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
                match: prediction.match ? `${prediction.match.home_team?.name || prediction.match.team_a?.name} vs ${prediction.match.away_team?.name || prediction.match.team_b?.name}` : 'N/A',
                predicted: `${prediction.predicted_goals_team_a} - ${prediction.predicted_goals_team_b}`,
                prode: prediction.prode_match?.prode?.name
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
    log('║                  FASE 5: MÓDULO EMPLOYEE - TESTS                             ║', 'bright');
    log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'bright');
    log('', 'reset');
    log(`Base URL: ${BASE_URL}`, 'cyan');
    log(`API Base: ${API_BASE}`, 'cyan');
    log('', 'reset');

    try {
        // SETUP AUTOMÁTICO
        logSection('SETUP AUTOMÁTICO');

        // Login como admin y crear prode si no existe
        await loginAsCompanyAdmin();

        if (!companyAdminToken) {
            logError('No se pudo obtener token de admin empresa');
            process.exit(1);
        }

        await setupProdeIfNeeded();

        // LOGIN EMPLEADO
        logSection('LOGIN EMPLEADO');
        await loginAsEmployee();

        if (!employeeToken) {
            logError('No se pudo obtener token de empleado. Abortando tests.');
            logInfo('');
            logInfo('💡 Si el empleado no existe, regístralo con:');
            logInfo('   POST /api/auth/register');
            logInfo('   Host: acme.localhost:3001');
            process.exit(1);
        }

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
        log('✅ Fase 5 (Módulo Employee) completada exitosamente', 'green');
        log('', 'reset');
        process.exit(0);
    } else {
        log('⚠️  Algunos tests fallaron. Revisa los detalles arriba.', 'yellow');
        log('', 'reset');
        process.exit(1);
    }
}

runAllTests().catch((error) => {
    console.error('Error crítico:', error);
    process.exit(1);
});