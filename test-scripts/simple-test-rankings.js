/**
 * Test Simple del Módulo de Rankings
 * 
 * Este script prueba los endpoints de rankings con datos existentes
 * No requiere crear datos de prueba
 * 
 * Ejecutar: node simple-test-rankings.js
 */

const BASE_URL = 'http://localhost:3000/api';

// INSTRUCCIONES:
// 1. Actualiza estos valores con datos reales de tu base de datos
// 2. Ejecuta: node simple-test-rankings.js

const TEST_CONFIG = {
    // Credenciales de un empleado que participe en un prode
    employeeEmail: 'employee1@test-1734278424132.com',  // Actualizar con email real
    employeePassword: 'Employee123!',                     // Actualizar con password real
    prodeId: 'uuid-del-prode',                           // Actualizar con ID de prode real
};

// Colores
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
};

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

async function login(email, password) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Login failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data.accessToken;
}

async function testEndpoint(token, prodeId, endpoint, name) {
    const url = `${BASE_URL}/prodes/${prodeId}/rankings/${endpoint}`;

    log(`\nTesting ${name}...`, colors.cyan);
    const start = Date.now();

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const time = Date.now() - start;

    if (!response.ok) {
        const error = await response.json();
        log(`❌ FAILED: ${error.message}`, colors.red);
        return false;
    }

    const data = await response.json();
    const ranking = data.data;

    log(`✅ SUCCESS (${time}ms)`, colors.green);
    log(`   Participants: ${ranking.metadata.totalParticipants}`);
    log(`   Cached: ${ranking.metadata.isCached}`);
    log(`   Entries: ${ranking.ranking.length}`);

    if (ranking.ranking.length > 0) {
        log(`   Top 3:`);
        ranking.ranking.slice(0, 3).forEach(entry => {
            const name = entry.employeeName || entry.areaName;
            const extra = entry.areaName ? ` (${entry.areaName})` : '';
            log(`      ${entry.position}. ${name}${extra} - ${entry.totalPoints} pts`);
        });
    }

    return true;
}

async function main() {
    try {
        log('\n🚀 SIMPLE RANKING TEST\n', colors.cyan);

        // Verificar configuración
        if (TEST_CONFIG.prodeId === 'uuid-del-prode') {
            log('❌ ERROR: Please update TEST_CONFIG with real data', colors.red);
            log('\nEdit this file and update:', colors.yellow);
            log('  - employeeEmail: email of an employee');
            log('  - employeePassword: password of the employee');
            log('  - prodeId: ID of a prode where the employee participates\n');
            process.exit(1);
        }

        // Login
        log('Logging in...', colors.cyan);
        const token = await login(TEST_CONFIG.employeeEmail, TEST_CONFIG.employeePassword);
        log('✅ Login successful\n', colors.green);

        // Test endpoints
        let success = 0;
        let total = 0;

        total++;
        if (await testEndpoint(token, TEST_CONFIG.prodeId, 'general', 'General Ranking')) success++;

        total++;
        if (await testEndpoint(token, TEST_CONFIG.prodeId, 'my-area', 'My Area Ranking')) success++;

        total++;
        if (await testEndpoint(token, TEST_CONFIG.prodeId, 'areas', 'Areas Ranking')) success++;

        // Summary
        log(`\n${'='.repeat(50)}`, colors.cyan);
        log(`RESULTS: ${success}/${total} tests passed`, success === total ? colors.green : colors.yellow);
        log('='.repeat(50), colors.cyan);

        if (success === total) {
            log('\n🎉 All tests passed!', colors.green);
            log('\n⚠️  Note: If rankings show 0 points, it\'s because');
            log('   PredictionScore calculation (Phase 7) is not implemented yet.');
        } else {
            log('\n⚠️  Some tests failed. Check the errors above.', colors.yellow);
        }

    } catch (error) {
        log(`\n❌ ERROR: ${error.message}`, colors.red);
        process.exit(1);
    }
}

main();
