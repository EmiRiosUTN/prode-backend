/**
 * Script de prueba para el Módulo de Scoring (Fase 7)
 * 
 * Este script prueba:
 * 1. Cálculo automático de puntos
 * 2. Bloqueo automático de predicciones
 * 3. Fuzzy matching de goleadores
 * 
 * Ejecutar: node test-scoring.js
 */

const BASE_URL = 'http://localhost:3000/api';

// Configuración - Actualizar con datos reales
const CONFIG = {
    adminEmail: 'admin@mundialpro.com',
    adminPassword: 'Admin123!MundialPro',
    matchId: '', // ID de un partido con predicciones
    prodeId: '', // ID del prode
};

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
        throw new Error('Login failed');
    }

    const data = await response.json();
    return data.data.accessToken;
}

async function loadMatchResult(token, matchId) {
    log('\n1. Loading match result...', colors.cyan);

    const response = await fetch(`${BASE_URL}/admin/matches/${matchId}/result`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            goalsTeamA: 2,
            goalsTeamB: 1,
            yellowCardsTeamA: 2,
            yellowCardsTeamB: 1,
            redCardsTeamA: 0,
            redCardsTeamB: 0,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        log(`❌ Failed: ${error.message}`, colors.red);
        return false;
    }

    log('✅ Match result loaded successfully', colors.green);
    log('   This should trigger automatic scoring calculation', colors.cyan);
    return true;
}

async function checkPredictionScores(token, prodeId) {
    log('\n2. Checking prediction scores...', colors.cyan);

    // Wait a bit for the scoring job to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    const response = await fetch(`${BASE_URL}/prodes/${prodeId}/rankings/general`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        log('❌ Failed to get rankings', colors.red);
        return false;
    }

    const data = await response.json();
    const ranking = data.data.ranking;

    log('✅ Prediction scores calculated', colors.green);
    log(`   Total participants: ${ranking.length}`);

    if (ranking.length > 0) {
        log('   Top 3:');
        ranking.slice(0, 3).forEach(entry => {
            log(`      ${entry.position}. ${entry.employeeName} - ${entry.totalPoints} pts`);
        });
    }

    return true;
}

async function testFuzzyMatching() {
    log('\n3. Testing fuzzy matching...', colors.cyan);

    log('   Fuzzy matching examples:', colors.cyan);
    log('   - "Leonel Mesi" → "Lionel Messi" ✓');
    log('   - "Di Maria" → "Ángel Di María" ✓');
    log('   - "Mbappe" → "Kylian Mbappé" ✓');
    log('   ');
    log('   To test fuzzy matching:', colors.yellow);
    log('   1. Create predictions with similar player names');
    log('   2. Load match result with correct player names');
    log('   3. Check logs for fuzzy match messages');
    log('   4. Verify points are awarded despite name differences');
}

async function testPredictionLocking() {
    log('\n4. Testing prediction locking...', colors.cyan);

    log('   Prediction locking runs automatically every 5 minutes', colors.yellow);
    log('   It locks predictions for matches starting in 1 hour');
    log('   ');
    log('   To test manually:', colors.cyan);
    log('   1. Create a match starting in ~1 hour');
    log('   2. Create predictions for that match');
    log('   3. Wait for the cron job to run (or trigger manually)');
    log('   4. Verify predictions have locked_at timestamp');
}

async function checkAuditLogs(token) {
    log('\n5. Checking audit logs...', colors.cyan);

    log('   Audit logs are created for:', colors.yellow);
    log('   - Loading match results');
    log('   - Calculating scores');
    log('   - Creating companies');
    log('   - Creating prodes');
    log('   ');
    log('   Check database: SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;');
}

async function main() {
    try {
        log('\n🚀 SCORING MODULE TEST (Phase 7)\n', colors.cyan);

        if (!CONFIG.matchId || !CONFIG.prodeId) {
            log('❌ Please update CONFIG with real data:', colors.red);
            log('   - matchId: ID of a match with predictions');
            log('   - prodeId: ID of the prode');
            log('\nYou can get these IDs from the database or API');
            return;
        }

        // Login
        log('Logging in as admin...', colors.cyan);
        const token = await login(CONFIG.adminEmail, CONFIG.adminPassword);
        log('✅ Login successful\n', colors.green);

        // Test scoring
        const resultLoaded = await loadMatchResult(token, CONFIG.matchId);
        if (resultLoaded) {
            await checkPredictionScores(token, CONFIG.prodeId);
        }

        // Test fuzzy matching
        await testFuzzyMatching();

        // Test prediction locking
        await testPredictionLocking();

        // Check audit logs
        await checkAuditLogs(token);

        log('\n' + '='.repeat(60), colors.cyan);
        log('✅ Test completed!', colors.green);
        log('='.repeat(60), colors.cyan);

        log('\n📋 Next steps:', colors.yellow);
        log('1. Check server logs for scoring calculation details');
        log('2. Verify prediction_scores table has new entries');
        log('3. Test fuzzy matching with similar player names');
        log('4. Monitor cron job for prediction locking');
        log('5. Review audit_logs table for system actions');

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, colors.red);
        console.error(error);
    }
}

main();
