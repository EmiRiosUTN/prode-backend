#!/usr/bin/env node

/**
 * Script de Testing Automatizado - MundialPro API v4
 * 
 * Mejoras v4:
 * - Carga .env automáticamente
 * - Verifica conexión a BD antes de iniciar
 * - Mejor manejo de errores
 * - Diagnóstico completo
 */

// IMPORTANTE: Cargar .env ANTES de importar Prisma
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = process.argv[2] || 'http://localhost:3001';
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
  magenta: '\x1b[35m',
};

let adminToken = '';
let createdCompanyId = '';
let createdCompetitionId = '';
let createdMatchId = '';
let teamArgentinaId = '';
let teamBrasilId = '';

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

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logData(label, data) {
  log(`  ${label}:`, 'yellow');
  console.log(JSON.stringify(data, null, 2).split('\n').map(line => `    ${line}`).join('\n'));
}

// ============================================================================
// VERIFICACIÓN DE ENTORNO
// ============================================================================

async function checkEnvironment() {
  logSection('VERIFICACIÓN DE ENTORNO');
  
  // 1. Verificar que .env existe
  logTest('Verificar archivo .env');
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    logError('Archivo .env no encontrado');
    logInfo('Crea un archivo .env en la raíz del proyecto');
    logInfo('Ejemplo: DATABASE_URL="postgresql://..."');
    return false;
  }
  logSuccess('Archivo .env encontrado');
  
  // 2. Verificar DATABASE_URL
  logTest('Verificar DATABASE_URL en .env');
  if (!process.env.DATABASE_URL) {
    logError('DATABASE_URL no está definida en .env');
    logInfo('Agrega esta línea a tu .env:');
    log('  DATABASE_URL="postgresql://usuario:password@host:puerto/database"', 'cyan');
    return false;
  }
  logSuccess('DATABASE_URL está configurada');
  
  // Mostrar info de conexión (ocultando password)
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':****@');
  logInfo(`Conectando a: ${maskedUrl}`);
  
  // 3. Verificar conexión a la base de datos
  logTest('Verificar conexión a la base de datos');
  try {
    await prisma.$connect();
    logSuccess('Conexión a la base de datos exitosa');
    
    // Hacer una query simple para confirmar
    const count = await prisma.team.count();
    logSuccess(`Base de datos accesible - ${count} equipos encontrados`);
    
    return true;
  } catch (error) {
    logError('No se pudo conectar a la base de datos');
    logInfo('Error: ' + error.message);
    logInfo('');
    logInfo('Posibles causas:');
    log('  1. VPS no accesible desde tu red', 'yellow');
    log('  2. Credenciales incorrectas en DATABASE_URL', 'yellow');
    log('  3. Puerto incorrecto (debería ser 5433)', 'yellow');
    log('  4. Firewall bloqueando la conexión', 'yellow');
    logInfo('');
    logInfo('Para diagnosticar:');
    log('  npx prisma db pull', 'cyan');
    return false;
  }
}

// ============================================================================
// OBTENER EQUIPOS DESDE LA BD
// ============================================================================

async function getTeamsFromDatabase() {
  logTest('Obtener equipos desde la Base de Datos');
  
  try {
    // Buscar Argentina y Brasil en la BD
    const teamArgentina = await prisma.team.findUnique({
      where: { code: 'ARG' },
    });

    const teamBrasil = await prisma.team.findUnique({
      where: { code: 'BRA' },
    });

    if (!teamArgentina || !teamBrasil) {
      logError('No se encontraron equipos Argentina o Brasil en la BD');
      logInfo('Ejecuta: npx prisma db seed');
      return false;
    }

    teamArgentinaId = teamArgentina.id;
    teamBrasilId = teamBrasil.id;

    logSuccess('Equipos encontrados en la BD');
    logInfo(`Argentina (${teamArgentina.code}): ${teamArgentinaId}`);
    logInfo(`Brasil (${teamBrasil.code}): ${teamBrasilId}`);
    
    return true;
  } catch (error) {
    logError(`Error al consultar equipos: ${error.message}`);
    return false;
  }
}

// ============================================================================
// VERIFICAR SERVIDOR
// ============================================================================

async function checkServer() {
  logTest('Verificar que el servidor esté corriendo');
  
  try {
    const response = await fetch(BASE_URL);
    
    if (response.ok || response.status === 404) {
      logSuccess('Servidor está corriendo');
      return true;
    } else {
      logError(`Servidor respondió con status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError('No se pudo conectar al servidor');
    logInfo('Asegúrate de que el servidor esté corriendo:');
    log('  npm run start:dev', 'cyan');
    return false;
  }
}

// ============================================================================
// UTILIDADES DE REQUEST
// ============================================================================

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
      data,
    };
  } catch (error) {
    logError(`Error de red: ${error.message}`);
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

function validateResponse(response, expectedStatus, testName) {
  if (response.status === expectedStatus && response.ok) {
    logSuccess(`${testName} - Status ${response.status}`);
    return true;
  } else {
    logError(`${testName} - Expected ${expectedStatus}, got ${response.status}`);
    if (response.data) {
      logData('Response', response.data);
    }
    return false;
  }
}

// ============================================================================
// TESTS - AUTENTICACIÓN
// ============================================================================

async function testAuthLogin() {
  logTest('Login como Admin Global');
  
  const response = await request('POST', '/auth/login', {
    email: 'admin@mundialpro.com',
    password: 'Admin123!MundialPro'
  });

  if (validateResponse(response, 200, 'Login exitoso')) {
    if (response.data.success && response.data.data.accessToken) {
      adminToken = response.data.data.accessToken;
      logSuccess('Token recibido y guardado');
      logData('Usuario', response.data.data.user);
    }
  }
}

async function testAuthLoginInvalid() {
  logTest('Login con credenciales inválidas');
  
  const response = await request('POST', '/auth/login', {
    email: 'admin@mundialpro.com',
    password: 'WrongPassword'
  });

  if (response.status === 401) {
    logSuccess('Correctamente rechazado con 401');
  } else {
    logError(`Se esperaba 401, se obtuvo ${response.status}`);
  }
}

// ============================================================================
// TESTS - EMPRESAS
// ============================================================================

async function testCompaniesGetAll() {
  logTest('Listar todas las empresas');
  
  const response = await request('GET', '/admin/companies', null, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 200, 'Listar empresas')) {
    if (Array.isArray(response.data.data)) {
      logSuccess(`Se encontraron ${response.data.data.length} empresa(s)`);
      if (response.data.data.length > 0) {
        logData('Primera empresa', response.data.data[0]);
      }
    }
  }
}

async function testCompaniesCreate() {
  logTest('Crear nueva empresa');
  
  const companyData = {
    name: 'Tech Solutions Test',
    slug: `techtest-${Date.now()}`,
    corporateDomain: 'techtest.com',
    requireCorporateEmail: true,
    logoUrl: 'https://via.placeholder.com/150',
    primaryColor: '#2196F3',
    secondaryColor: '#FF5722',
    adminEmail: `admin.${Date.now()}@techtest.com`,
    adminPassword: 'TechAdmin123!'
  };

  const response = await request('POST', '/admin/companies', companyData, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 201, 'Crear empresa')) {
    if (response.data.success && response.data.data.id) {
      createdCompanyId = response.data.data.id;
      logSuccess(`Empresa creada con ID: ${createdCompanyId}`);
      logData('Empresa creada', response.data.data);
    }
  }
}

async function testCompaniesGetOne() {
  if (!createdCompanyId) {
    logError('No hay empresa creada para consultar');
    return;
  }

  logTest(`Obtener empresa por ID`);
  
  const response = await request('GET', `/admin/companies/${createdCompanyId}`, null, {
    'Authorization': `Bearer ${adminToken}`
  });

  validateResponse(response, 200, 'Obtener empresa por ID');
}

async function testCompaniesUpdate() {
  if (!createdCompanyId) {
    logError('No hay empresa creada para actualizar');
    return;
  }

  logTest('Actualizar empresa');
  
  const updateData = {
    name: 'Tech Solutions Test UPDATED',
    primaryColor: '#00BCD4'
  };

  const response = await request('PUT', `/admin/companies/${createdCompanyId}`, updateData, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 200, 'Actualizar empresa')) {
    if (response.data.data.name === updateData.name) {
      logSuccess('Nombre actualizado correctamente');
    }
  }
}

async function testCompaniesWithoutAuth() {
  logTest('Intentar listar empresas sin autenticación');
  
  const response = await request('GET', '/admin/companies');

  if (response.status === 401) {
    logSuccess('Correctamente bloqueado sin token (401)');
  } else {
    logError(`Se esperaba 401, se obtuvo ${response.status}`);
  }
}

// ============================================================================
// TESTS - COMPETICIONES
// ============================================================================

async function testCompetitionsGetAll() {
  logTest('Listar todas las competiciones');
  
  const response = await request('GET', '/admin/competitions', null, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 200, 'Listar competiciones')) {
    if (Array.isArray(response.data.data)) {
      logSuccess(`Se encontraron ${response.data.data.length} competición(es)`);
      if (response.data.data.length > 0) {
        logData('Primera competición', response.data.data[0]);
      }
    }
  }
}

async function testCompetitionsCreate() {
  logTest('Crear nueva competición');
  
  const competitionData = {
    name: 'Copa Test 2025',
    slug: `copa-test-${Date.now()}`,
    startDate: '2025-06-01T00:00:00.000Z',
    endDate: '2025-07-15T23:59:59.000Z',
    sportType: 'futbol',
    isActive: true
  };

  const response = await request('POST', '/admin/competitions', competitionData, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 201, 'Crear competición')) {
    if (response.data.success && response.data.data.id) {
      createdCompetitionId = response.data.data.id;
      logSuccess(`Competición creada con ID: ${createdCompetitionId}`);
      logData('Competición creada', response.data.data);
    }
  }
}

async function testCompetitionsGetOne() {
  if (!createdCompetitionId) {
    logError('No hay competición creada para consultar');
    return;
  }

  logTest(`Obtener competición por ID`);
  
  const response = await request('GET', `/admin/competitions/${createdCompetitionId}`, null, {
    'Authorization': `Bearer ${adminToken}`
  });

  validateResponse(response, 200, 'Obtener competición por ID');
}

async function testCompetitionsUpdate() {
  if (!createdCompetitionId) {
    logError('No hay competición creada para actualizar');
    return;
  }

  logTest('Actualizar competición');
  
  const updateData = {
    name: 'Copa Test 2025 ACTUALIZADA',
    isActive: true
  };

  const response = await request('PUT', `/admin/competitions/${createdCompetitionId}`, updateData, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 200, 'Actualizar competición')) {
    if (response.data.data.name === updateData.name) {
      logSuccess('Nombre actualizado correctamente');
    }
  }
}

// ============================================================================
// TESTS - PARTIDOS
// ============================================================================

async function testMatchesGetAll() {
  logTest('Listar todos los partidos');
  
  const response = await request('GET', '/admin/matches', null, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 200, 'Listar partidos')) {
    if (Array.isArray(response.data.data)) {
      logSuccess(`Se encontraron ${response.data.data.length} partido(s)`);
    }
  }
}

async function testMatchesCreate() {
  if (!createdCompetitionId) {
    logError('No hay competición creada para crear partido');
    return;
  }

  if (!teamArgentinaId || !teamBrasilId) {
    logError('No hay IDs de equipos disponibles');
    return;
  }

  logTest('Crear nuevo partido');
  
  const matchData = {
    competitionId: createdCompetitionId,
    teamAId: teamArgentinaId,
    teamBId: teamBrasilId,
    matchDate: '2025-06-15T21:00:00.000Z',
    stage: 'Fase de Grupos - Jornada 1',
    location: 'Estadio Test'
  };

  const response = await request('POST', '/admin/matches', matchData, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 201, 'Crear partido')) {
    if (response.data.success && response.data.data.id) {
      createdMatchId = response.data.data.id;
      logSuccess(`Partido creado con ID: ${createdMatchId}`);
      logData('Partido creado', response.data.data);
    }
  }
}

async function testMatchesGetOne() {
  if (!createdMatchId) {
    logError('No hay partido creado para consultar');
    return;
  }

  logTest('Obtener partido por ID');
  
  const response = await request('GET', `/admin/matches/${createdMatchId}`, null, {
    'Authorization': `Bearer ${adminToken}`
  });

  validateResponse(response, 200, 'Obtener partido por ID');
}

async function testMatchesUpdate() {
  if (!createdMatchId) {
    logError('No hay partido creado para actualizar');
    return;
  }

  logTest('Actualizar partido');
  
  const updateData = {
    matchDate: '2025-06-15T22:00:00.000Z',
    location: 'Estadio Test ACTUALIZADO'
  };

  const response = await request('PUT', `/admin/matches/${createdMatchId}`, updateData, {
    'Authorization': `Bearer ${adminToken}`
  });

  validateResponse(response, 200, 'Actualizar partido');
}

async function testMatchesUpdateResult() {
  if (!createdMatchId) {
    logError('No hay partido creado para actualizar resultado');
    return;
  }

  logTest('Cargar resultado del partido');
  
  const resultData = {
    goalsTeamA: 2,
    goalsTeamB: 1,
    yellowCardsTeamA: 3,
    yellowCardsTeamB: 2,
    redCardsTeamA: 0,
    redCardsTeamB: 1
  };

  const response = await request('PUT', `/admin/matches/${createdMatchId}/result`, resultData, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 200, 'Actualizar resultado')) {
    logData('Resultado guardado', response.data.data);
  }
}

async function testMatchesAddScorer() {
  if (!createdMatchId || !teamArgentinaId) {
    logError('No hay partido creado para agregar goleador');
    return;
  }

  logTest('Agregar goleador al partido');
  
  const scorerData = {
    playerFullName: 'Lionel Messi',
    teamId: teamArgentinaId,
    goalsCount: 2
  };

  const response = await request('POST', `/admin/matches/${createdMatchId}/scorers`, scorerData, {
    'Authorization': `Bearer ${adminToken}`
  });

  if (validateResponse(response, 201, 'Agregar goleador')) {
    logData('Goleador agregado', response.data.data);
  }
}

// ============================================================================
// LIMPIEZA
// ============================================================================

async function cleanup() {
  logSection('LIMPIEZA');
  
  if (createdCompanyId) {
    logInfo('Empresa de prueba creada:');
    log(`  ID: ${createdCompanyId}`, 'yellow');
    logInfo('Para eliminarla manualmente:');
    log(`  DELETE ${API_BASE}/admin/companies/${createdCompanyId}`, 'cyan');
  }
  
  // Cerrar conexión de Prisma
  await prisma.$disconnect();
  logSuccess('Conexión a BD cerrada');
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function runAllTests() {
  log('', 'reset');
  log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║                  MUNDIALPRO API - TEST AUTOMATIZADO v4                       ║', 'bright');
  log('║              (Con .env y verificación de conexión)                           ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'bright');
  log('', 'reset');
  log(`Base URL: ${BASE_URL}`, 'cyan');
  log(`API Base: ${API_BASE}`, 'cyan');
  log('', 'reset');

  try {
    // VERIFICAR ENTORNO
    const envOk = await checkEnvironment();
    if (!envOk) {
      log('', 'reset');
      logError('⚠️  Verificación de entorno falló. No se pueden ejecutar los tests.');
      await cleanup();
      process.exit(1);
    }

    // VERIFICAR SERVIDOR
    const serverOk = await checkServer();
    if (!serverOk) {
      log('', 'reset');
      logError('⚠️  Servidor no está corriendo. Inicia el servidor con: npm run start:dev');
      await cleanup();
      process.exit(1);
    }

    // OBTENER EQUIPOS
    logSection('PREPARACIÓN DE DATOS');
    const hasTeams = await getTeamsFromDatabase();

    // AUTENTICACIÓN
    logSection('1. AUTENTICACIÓN');
    await testAuthLogin();
    await testAuthLoginInvalid();

    if (!adminToken) {
      logError('No se pudo obtener token de admin. Abortando tests.');
      await cleanup();
      process.exit(1);
    }

    // EMPRESAS
    logSection('2. ADMIN GLOBAL - EMPRESAS');
    await testCompaniesGetAll();
    await testCompaniesCreate();
    await testCompaniesGetOne();
    await testCompaniesUpdate();
    await testCompaniesWithoutAuth();

    // COMPETICIONES
    logSection('3. ADMIN GLOBAL - COMPETICIONES');
    await testCompetitionsGetAll();
    await testCompetitionsCreate();
    await testCompetitionsGetOne();
    await testCompetitionsUpdate();

    // PARTIDOS
    logSection('4. ADMIN GLOBAL - PARTIDOS');
    await testMatchesGetAll();
    
    if (hasTeams) {
      await testMatchesCreate();
      await testMatchesGetOne();
      await testMatchesUpdate();
      await testMatchesUpdateResult();
      await testMatchesAddScorer();
    } else {
      logWarning('Tests de partidos omitidos - No hay equipos en la BD');
      logInfo('Ejecuta: npx prisma db seed');
    }

    // LIMPIEZA
    await cleanup();

  } catch (error) {
    logError(`Error fatal: ${error.message}`);
    console.error(error);
    await prisma.$disconnect();
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
    process.exit(0);
  } else {
    log('⚠️  Algunos tests fallaron. Revisa los detalles arriba.', 'yellow');
    process.exit(1);
  }
}

// Ejecutar tests
runAllTests().catch((error) => {
  console.error('Error crítico:', error);
  prisma.$disconnect();
  process.exit(1);
});