#!/usr/bin/env node

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

let companyAdminToken = '';
let createdAreaId = '';
let createdProdeId = '';
let competitionId = '';
let predictionVariableIds = [];

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

async function loginAsCompanyAdmin() {
    logTest('Login como Admin de Empresa (Acme)');

    const response = await request('POST', '/auth/login', {
        email: 'admin@acme.com',
        password: 'Company123!'
    });

    if (validateResponse(response, 200, 'Login exitoso')) {
        if (response.data.success && response.data.data.accessToken) {
            companyAdminToken = response.data.data.accessToken;
            logSuccess('Token recibido y guardado');
            logData('Usuario', response.data.data.user);
        }
    }
}

async function getCompetitionAndVariables() {
    logTest('Obtener competición y variables de predicción');
    logInfo('Variables de predicción se obtendrán de la BD (seed)');
}

async function testCompanyConfigGet() {
    logTest('Obtener configuración de empresa');

    const response = await request('GET', '/company/config', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (validateResponse(response, 200, 'Obtener configuración')) {
        const configData = response.data.data || response.data;
        if (configData) {
            logData('Configuración de empresa', configData);
        }
    }
}

async function testCompanyConfigUpdate() {
    logTest('Actualizar configuración de empresa (branding)');

    const response = await request('PUT', '/company/config', {
        logoUrl: 'https://acme.com/updated-logo.png',
        primaryColor: '#FF5722',
        secondaryColor: '#2196F3'
    }, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (validateResponse(response, 200, 'Actualizar branding')) {
        logData('Configuración actualizada', response.data);
    }
}

async function testAreasGetAll() {
    logTest('Listar todas las áreas');

    const response = await request('GET', '/company/areas', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (validateResponse(response, 200, 'Listar áreas')) {
        const areas = response.data.data || response.data;
        if (Array.isArray(areas)) {
            logSuccess(`Se encontraron ${areas.length} área(s)`);
            if (areas.length > 0) {
                logData('Primera área', areas[0]);
            }
        }
    }
}

async function testAreasCreate() {
    logTest('Crear nueva área');

    const response = await request('POST', '/company/areas', {
        name: `Desarrollo Test ${Date.now()}`,
        description: 'Área de desarrollo de software'
    }, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (validateResponse(response, 201, 'Crear área')) {
        const areaData = response.data.data || response.data;
        if (areaData && areaData.id) {
            createdAreaId = areaData.id;
            logSuccess(`Área creada con ID: ${createdAreaId}`);
            logData('Área creada', areaData);
        }
    }
}

async function testAreasUpdate() {
    if (!createdAreaId) {
        logError('No hay área creada para actualizar');
        return;
    }

    logTest('Actualizar área');

    const response = await request('PUT', `/company/areas/${createdAreaId}`, {
        name: 'Desarrollo Test ACTUALIZADO',
        description: 'Área actualizada'
    }, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (validateResponse(response, 200, 'Actualizar área')) {
        const areaData = response.data.data || response.data;
        if (areaData) {
            logData('Área actualizada', areaData);
        }
    }
}

async function testAreasDelete() {
    if (!createdAreaId) {
        logError('No hay área creada para eliminar');
        return;
    }

    logTest('Eliminar área (soft delete)');

    const response = await request('DELETE', `/company/areas/${createdAreaId}`, null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (validateResponse(response, 200, 'Eliminar área')) {
        logSuccess('Área eliminada correctamente');
    }
}

async function testEmployeesGetAll() {
    logTest('Listar todos los empleados');

    const response = await request('GET', '/company/employees', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (validateResponse(response, 200, 'Listar empleados')) {
        const employees = response.data.data || response.data;
        if (Array.isArray(employees)) {
            logSuccess(`Se encontraron ${employees.length} empleado(s)`);
        }
    }
}

async function testProdesGetAll() {
    logTest('Listar todos los prodes');

    const response = await request('GET', '/company/prodes', null, {
        'Authorization': `Bearer ${companyAdminToken}`
    });

    if (validateResponse(response, 200, 'Listar prodes')) {
        const prodes = response.data.data || response.data;
        if (Array.isArray(prodes)) {
            logSuccess(`Se encontraron ${prodes.length} prode(s)`);
        }
    }
}

async function testProdesCreate() {
    logTest('Crear nuevo prode (opcional - necesita datos válidos)');
    logInfo('Este test requiere IDs válidos de competición y variables de predicción');
    logInfo('Saltando por ahora - implementar cuando tengas los datos');
}

async function runAllTests() {
    log('', 'reset');
    log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'bright');
    log('║                  FASE 4: MÓDULO COMPANY - TESTS                              ║', 'bright');
    log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'bright');
    log('', 'reset');
    log(`Base URL: ${BASE_URL}`, 'cyan');
    log(`API Base: ${API_BASE}`, 'cyan');
    log('', 'reset');
    log('📝 IMPORTANTE: Este script usa acme.localhost:3000 en la URL', 'yellow');
    log('   Si falla, agrega esta línea a tu archivo hosts:', 'yellow');
    log('   127.0.0.1  acme.localhost', 'cyan');
    log('', 'reset');

    try {
        logSection('PREPARACIÓN');
        await loginAsCompanyAdmin();

        if (!companyAdminToken) {
            logError('No se pudo obtener token de empresa admin. Abortando tests.');
            process.exit(1);
        }

        await getCompetitionAndVariables();

        logSection('1. CONFIGURACIÓN DE EMPRESA');
        await testCompanyConfigGet();
        await testCompanyConfigUpdate();

        logSection('2. GESTIÓN DE ÁREAS');
        await testAreasGetAll();
        await testAreasCreate();
        await testAreasUpdate();
        await testAreasDelete();

        logSection('3. GESTIÓN DE EMPLEADOS');
        await testEmployeesGetAll();

        logSection('4. GESTIÓN DE PRODES');
        await testProdesGetAll();
        await testProdesCreate();

    } catch (error) {
        logError(`Error fatal: ${error.message}`);
        console.error(error);
        process.exit(1);
    }

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