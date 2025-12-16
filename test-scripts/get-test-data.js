/**
 * Script para obtener IDs necesarios para testing
 * Ejecutar: node get-test-data.js
 */

const BASE_URL = 'http://localhost:3000/api';

// Configuración - Actualizar con credenciales de admin global
const ADMIN_CONFIG = {
    email: 'admin@mundialpro.com',
    password: 'Admin123!MundialPro'
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

async function getCompanies(token) {
    const response = await fetch(`${BASE_URL}/admin/companies`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get companies: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
}

async function getCompanyProdes(token, companyId) {
    // Login como admin de empresa para ver sus prodes
    const response = await fetch(`${BASE_URL}/company/prodes`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Host': 'localhost:3000', // Ajustar según el slug de la empresa
        },
    });

    if (response.ok) {
        const data = await response.json();
        return data.data;
    }
    return [];
}

async function main() {
    try {
        console.log('🔍 Obteniendo datos de prueba...\n');

        // Login como admin global
        console.log('1. Login como admin global...');
        const adminToken = await login(ADMIN_CONFIG.email, ADMIN_CONFIG.password);
        console.log('✅ Login exitoso\n');

        // Obtener empresas
        console.log('2. Obteniendo empresas...');
        const companies = await getCompanies(adminToken);

        if (companies.length === 0) {
            console.log('❌ No hay empresas creadas. Primero debes crear una empresa.');
            return;
        }

        console.log(`✅ Encontradas ${companies.length} empresa(s):\n`);

        companies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (slug: ${company.slug})`);
            console.log(`      ID: ${company.id}`);
            console.log(`      Admin: ${company.admin_user_id}\n`);
        });

        // Mostrar instrucciones
        console.log('\n📋 INSTRUCCIONES PARA TESTING:\n');
        console.log('Para probar el módulo de rankings, necesitas:');
        console.log('');
        console.log('1. Tener un PRODE creado con:');
        console.log('   - Configuración de ranking habilitada');
        console.log('   - Empleados participando');
        console.log('   - Predicciones realizadas');
        console.log('   - Resultados de partidos cargados');
        console.log('   - PredictionScore calculados (Fase 7 - pendiente)');
        console.log('');
        console.log('2. Editar test-rankings.js con:');
        console.log('   - employeeEmail: email de un empleado registrado');
        console.log('   - employeePassword: contraseña del empleado');
        console.log('   - prodeId: ID del prode a probar');
        console.log('');
        console.log('3. Si aún no tienes datos de prueba, puedes:');
        console.log('   a) Crear una empresa (si no existe)');
        console.log('   b) Crear áreas en la empresa');
        console.log('   c) Registrar empleados');
        console.log('   d) Crear un prode con configuración de rankings');
        console.log('   e) Hacer que los empleados se unan al prode');
        console.log('   f) Cargar resultados de partidos');
        console.log('   g) Calcular puntos (requiere Fase 7)');
        console.log('');
        console.log('⚠️  NOTA IMPORTANTE:');
        console.log('   Los rankings requieren que existan PredictionScore calculados.');
        console.log('   Sin la Fase 7 (cálculo de puntos), todos mostrarán 0 puntos.');
        console.log('   Pero puedes probar que los endpoints funcionan correctamente.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

main();
