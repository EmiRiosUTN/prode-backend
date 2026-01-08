#!/usr/bin/env node

/**
 * Script para crear un Prode de prueba
 * Ejecutar UNA SOLA VEZ antes de los tests
 */

const BASE_URL = 'http://acme.localhost:3001/api';

async function createTestProde() {
    console.log('🔧 Creando Prode de prueba...\n');

    // 1. Login como admin de empresa
    console.log('1. Login como admin de empresa...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@acme.com',
            password: 'Company123!'
        })
    });

    const loginData = await loginResponse.json();
    const token = loginData.data?.accessToken;

    if (!token) {
        console.error('❌ No se pudo obtener token');
        process.exit(1);
    }

    console.log('✓ Login exitoso\n');

    // 2. Obtener variables de predicción
    console.log('2. Obteniendo variables de predicción del seed...');

    // Las variables se pueden obtener consultando directamente o usar las conocidas del seed
    // El seed crea: exact_result, winner_only, team_a_goals, team_b_goals, etc.

    const competitionId = process.argv[2];

    if (!competitionId) {
        console.log('❌ Uso: node create-prode.js <competition-id>');
        console.log('\nPasos:');
        console.log('1. Abre Prisma Studio: npx prisma studio');
        console.log('2. Ve a la tabla "competitions"');
        console.log('3. Copia el ID de "Copa América 2025"');
        console.log('4. Ejecuta: node create-prode.js <ese-id>\n');
        process.exit(1);
    }

    // Obtener ID de variable de predicción (exact_result del seed)
    console.log('3. Consultando variables de predicción...');

    // Query directo a la DB usando el endpoint que tengamos disponible
    // Como no tenemos endpoint público, vamos a usar un ID placeholder
    // y pedir que el usuario lo complete desde Prisma Studio

    const predictionVariableId = process.argv[3];

    if (!predictionVariableId) {
        console.log('❌ También necesitas el ID de una variable de predicción');
        console.log('\nPasos completos:');
        console.log('1. Abre Prisma Studio: npx prisma studio');
        console.log('2. Ve a la tabla "competitions" y copia el ID de "Copa América 2025"');
        console.log('3. Ve a la tabla "prediction_variables" y copia el ID de "Resultado Exacto"');
        console.log('4. Ejecuta: node create-prode.js <competition-id> <variable-id>\n');
        process.exit(1);
    }

    console.log(`✓ Competition ID: ${competitionId}`);
    console.log(`✓ Variable ID: ${predictionVariableId}\n`);

    // 4. Crear prode
    console.log('4. Creando prode...');
    const createResponse = await fetch(`${BASE_URL}/company/prodes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'Prode Test Copa América',
            description: 'Prode de prueba para testing automático',
            competitionId: competitionId,
            participationMode: 'general',
            variableConfigs: [
                {
                    predictionVariableId: predictionVariableId,
                    points: 3
                }
            ],
            rankingConfig: {
                showIndividualGeneral: true,
                showIndividualByArea: false,
                showAreaRanking: false,
                areaRankingCalculation: 'sum'
            }
        })
    });

    const createData = await createResponse.json();

    if (createResponse.status === 201) {
        console.log('✅ Prode creado exitosamente!');
        console.log(`   ID: ${createData.data.id}`);
        console.log(`   Nombre: ${createData.data.name}\n`);
        console.log('👉 Ahora podes ejecutar: node test-empleado.js\n');
    } else {
        console.error('❌ Error al crear prode:');
        console.error(JSON.stringify(createData, null, 2));
        process.exit(1);
    }
}

createTestProde();