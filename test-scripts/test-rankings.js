/**
 * Script de prueba para el módulo de Rankings
 * 
 * Este script prueba los tres tipos de rankings:
 * 1. Ranking individual general
 * 2. Ranking individual por área
 * 3. Ranking entre áreas
 * 
 * Requisitos previos:
 * - Tener un prode creado con configuración de rankings habilitada
 * - Tener empleados participando en el prode
 * - Tener algunos resultados de partidos cargados
 * - Tener PredictionScore calculados
 */

const BASE_URL = 'http://localhost:3000/api';

// Configuración - Actualizar con tus datos reales
const CONFIG = {
    employeeEmail: 'empleado@empresa.com',
    employeePassword: 'Password123!',
    prodeId: '', // Actualizar con un ID de prode real
};

async function login(email, password) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.accessToken;
}

async function testGeneralRanking(token, prodeId) {
    console.log('\n=== Testing General Ranking ===');

    const response = await fetch(`${BASE_URL}/prodes/${prodeId}/rankings/general`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error:', error);
        return;
    }

    const data = await response.json();
    console.log('✅ General Ranking:');
    console.log(`   Total participants: ${data.data.metadata.totalParticipants}`);
    console.log(`   Cached: ${data.data.metadata.isCached}`);
    console.log(`   Top 5:`);

    data.data.ranking.slice(0, 5).forEach(entry => {
        console.log(`   ${entry.position}. ${entry.employeeName} (${entry.areaName}) - ${entry.totalPoints} pts`);
    });
}

async function testMyAreaRanking(token, prodeId) {
    console.log('\n=== Testing My Area Ranking ===');

    const response = await fetch(`${BASE_URL}/prodes/${prodeId}/rankings/my-area`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error:', error);
        return;
    }

    const data = await response.json();
    console.log('✅ My Area Ranking:');
    console.log(`   Total participants in area: ${data.data.metadata.totalParticipants}`);
    console.log(`   Cached: ${data.data.metadata.isCached}`);
    console.log(`   Rankings:`);

    data.data.ranking.forEach(entry => {
        console.log(`   ${entry.position}. ${entry.employeeName} - ${entry.totalPoints} pts`);
    });
}

async function testAreasRanking(token, prodeId) {
    console.log('\n=== Testing Areas Ranking ===');

    const response = await fetch(`${BASE_URL}/prodes/${prodeId}/rankings/areas`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error:', error);
        return;
    }

    const data = await response.json();
    console.log('✅ Areas Ranking:');
    console.log(`   Cached: ${data.data.metadata.isCached}`);
    console.log(`   Rankings:`);

    data.data.ranking.forEach(entry => {
        console.log(`   ${entry.position}. ${entry.areaName} - ${entry.totalPoints} pts (${entry.participantsCount} participants)`);
        console.log(`      Top employees:`);
        entry.topEmployees.forEach(emp => {
            console.log(`      - ${emp.employeeName}: ${emp.totalPoints} pts`);
        });
    });
}

async function testCaching(token, prodeId) {
    console.log('\n=== Testing Cache ===');

    console.log('First request (should not be cached)...');
    const start1 = Date.now();
    const response1 = await fetch(`${BASE_URL}/prodes/${prodeId}/rankings/general`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    const data1 = await response1.json();
    const time1 = Date.now() - start1;
    console.log(`   Time: ${time1}ms, Cached: ${data1.data.metadata.isCached}`);

    console.log('Second request (should be cached)...');
    const start2 = Date.now();
    const response2 = await fetch(`${BASE_URL}/prodes/${prodeId}/rankings/general`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    const data2 = await response2.json();
    const time2 = Date.now() - start2;
    console.log(`   Time: ${time2}ms, Cached: ${data2.data.metadata.isCached}`);

    if (time2 < time1 && data2.data.metadata.isCached) {
        console.log('✅ Cache is working correctly!');
    } else {
        console.log('⚠️  Cache might not be working as expected');
    }
}

async function main() {
    try {
        console.log('🚀 Starting Ranking Module Tests...\n');

        if (!CONFIG.prodeId) {
            console.error('❌ Please update CONFIG.prodeId with a real prode ID');
            return;
        }

        // Login
        console.log('Logging in...');
        const token = await login(CONFIG.employeeEmail, CONFIG.employeePassword);
        console.log('✅ Login successful');

        // Test all ranking types
        await testGeneralRanking(token, CONFIG.prodeId);
        await testMyAreaRanking(token, CONFIG.prodeId);
        await testAreasRanking(token, CONFIG.prodeId);

        // Test caching
        await testCaching(token, CONFIG.prodeId);

        console.log('\n✅ All tests completed!');
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
    }
}

main();
