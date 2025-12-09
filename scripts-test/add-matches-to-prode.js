#!/usr/bin/env node

/**
 * Script para agregar partidos de la competición al sistema
 * Los partidos ya deberían existir en la DB del seed
 */

const BASE_URL = 'http://acme.localhost:3000/api';

async function addMatchesToCompetition() {
    console.log('🔧 Verificando partidos en la competición...\n');

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

    const competitionId = process.argv[2];

    if (!competitionId) {
        console.log('❌ Uso: node add-matches-to-prode.js <competition-id>');
        console.log('\nEjecuta: node add-matches-to-prode.js c4485811-a8a8-43bc-9118-91ee9bdcc20b\n');
        process.exit(1);
    }

    console.log('2. Consultando información de la competición...');
    console.log(`   Competition ID: ${competitionId}\n`);

    console.log('📋 INSTRUCCIONES PARA AGREGAR PARTIDOS:\n');
    console.log('Como el seed no crea partidos automáticamente, necesitas:');
    console.log('');
    console.log('OPCIÓN 1 - Usando Prisma Studio (MÁS FÁCIL):');
    console.log('1. Abre Prisma Studio: npx prisma studio');
    console.log('2. Ve a la tabla "matches"');
    console.log('3. Haz click en "Add record"');
    console.log('4. Completa los campos:');
    console.log(`   - competition_id: ${competitionId}`);
    console.log('   - team_a_id: (copia un ID de la tabla "teams")');
    console.log('   - team_b_id: (copia otro ID de la tabla "teams")');
    console.log('   - match_date: (una fecha futura, ej: 2025-06-15T20:00:00Z)');
    console.log('   - status: scheduled');
    console.log('   - stage: "Fase de Grupos"');
    console.log('5. Guarda el registro');
    console.log('6. Repite para crear 2-3 partidos más\n');

    console.log('OPCIÓN 2 - Script SQL directo:');
    console.log('Ejecuta esto en Prisma Studio > SQL Query:\n');
    console.log('-- Primero obtén IDs de equipos');
    console.log('SELECT id, name FROM teams LIMIT 4;\n');
    console.log('-- Luego inserta partidos (reemplaza los UUIDs con los IDs reales)');
    console.log(`INSERT INTO matches (id, competition_id, team_a_id, team_b_id, match_date, stage, status)
VALUES 
  (gen_random_uuid(), '${competitionId}', 'TEAM_A_ID_AQUI', 'TEAM_B_ID_AQUI', '2025-06-15 20:00:00', 'Fase de Grupos', 'scheduled'),
  (gen_random_uuid(), '${competitionId}', 'TEAM_C_ID_AQUI', 'TEAM_D_ID_AQUI', '2025-06-16 20:00:00', 'Fase de Grupos', 'scheduled');
`);

    console.log('\n✅ Después de agregar partidos, ejecuta: node test-empleado.js\n');
}

addMatchesToCompetition();
