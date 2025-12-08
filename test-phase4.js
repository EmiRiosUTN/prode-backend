#!/usr/bin/env node

/**
 * Test simple para endpoints de Company
 * IMPORTANTE: Usa fetch con node-fetch que no soporta Host header correctamente
 * Para testing real, usar Postman/Thunder Client o curl
 */

const BASE_URL = 'http://acme.localhost:3000/api'; // Usar subdomain en URL

async function test() {
    console.log('\n🧪 Testing Phase 4 - Company Module\n');
    console.log('⚠️  NOTA: Este test usa acme.localhost:3000');
    console.log('   Si falla, verifica que tu /etc/hosts o DNS local resuelva acme.localhost\n');

    // 1. Login como empresa_admin
    console.log('1. Login como empresa_admin...');
    const loginRes = await fetch(`http://localhost:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@acme.com',
            password: 'Company123!'
        })
    });

    const loginData = await loginRes.json();

    if (!loginData.success || !loginData.data.accessToken) {
        console.error('❌ Login failed');
        console.error(loginData);
        process.exit(1);
    }

    const token = loginData.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   User: ${loginData.data.user.email}`);
    console.log(`   Role: ${loginData.data.user.role}`);

    // Headers para requests autenticados
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 2. Test GET /company/config
    console.log('\n2. GET /company/config...');
    try {
        const configRes = await fetch(`${BASE_URL}/company/config`, { headers });

        if (configRes.ok) {
            const configData = await configRes.json();
            console.log('✅ Config retrieved');
            if (configData.success && configData.data) {
                console.log(`   Company: ${configData.data.name}`);
                console.log(`   Slug: ${configData.data.slug}`);
            } else {
                console.log(`   Raw response:`, configData);
            }
        } else {
            const errorData = await configRes.json();
            console.error(`❌ Failed (${configRes.status}):`, errorData.message || errorData);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    // 3. Test PUT /company/config
    console.log('\n3. PUT /company/config...');
    try {
        const updateConfigRes = await fetch(`${BASE_URL}/company/config`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                logoUrl: 'https://via.placeholder.com/300',
                primaryColor: '#FF5722',
                secondaryColor: '#2196F3'
            })
        });

        if (updateConfigRes.ok) {
            console.log('✅ Config updated');
        } else {
            const errorData = await updateConfigRes.json();
            console.error(`❌ Failed (${updateConfigRes.status}):`, errorData.message || errorData);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    // 4. Test GET /company/areas
    console.log('\n4. GET /company/areas...');
    try {
        const areasRes = await fetch(`${BASE_URL}/company/areas`, { headers });

        if (areasRes.ok) {
            const areasData = await areasRes.json();
            if (areasData.success && Array.isArray(areasData.data)) {
                console.log(`✅ Areas retrieved: ${areasData.data.length} areas found`);
            } else {
                console.log('✅ Response received:', areasData);
            }
        } else {
            const errorData = await areasRes.json();
            console.error(`❌ Failed (${areasRes.status}):`, errorData.message || errorData);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    // 5. Test POST /company/areas
    console.log('\n5. POST /company/areas...');
    try {
        const createAreaRes = await fetch(`${BASE_URL}/company/areas`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: `Test Area ${Date.now()}`,
                description: 'Area de prueba'
            })
        });

        if (createAreaRes.ok) {
            const newArea = await createAreaRes.json();
            if (newArea.success && newArea.data) {
                console.log('✅ Area created');
                console.log(`   ID: ${newArea.data.id}`);
                console.log(`   Name: ${newArea.data.name}`);
            } else {
                console.log('✅ Response:', newArea);
            }
        } else {
            const errorData = await createAreaRes.json();
            console.error(`❌ Failed (${createAreaRes.status}):`, errorData.message || errorData);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    // 6. Test GET /company/employees
    console.log('\n6. GET /company/employees...');
    try {
        const employeesRes = await fetch(`${BASE_URL}/company/employees`, { headers });

        if (employeesRes.ok) {
            const employeesData = await employeesRes.json();
            if (employeesData.success && Array.isArray(employeesData.data)) {
                console.log(`✅ Employees retrieved: ${employeesData.data.length} employees found`);
            } else {
                console.log('✅ Response:', employeesData);
            }
        } else {
            const errorData = await employeesRes.json();
            console.error(`❌ Failed (${employeesRes.status}):`, errorData.message || errorData);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    // 7. Test GET /company/prodes
    console.log('\n7. GET /company/prodes...');
    try {
        const prodesRes = await fetch(`${BASE_URL}/company/prodes`, { headers });

        if (prodesRes.ok) {
            const prodesData = await prodesRes.json();
            if (prodesData.success && Array.isArray(prodesData.data)) {
                console.log(`✅ Prodes retrieved: ${prodesData.data.length} prodes found`);
            } else {
                console.log('✅ Response:', prodesData);
            }
        } else {
            const errorData = await prodesRes.json();
            console.error(`❌ Failed (${prodesRes.status}):`, errorData.message || errorData);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }

    console.log('\n✅ Test completed!\n');
    console.log('📝 NOTA: Para testing completo, usa Postman/Thunder Client');
    console.log('   con el header Host: acme.localhost:3000\n');
}

test().catch(err => {
    console.error('\n❌ Test failed:', err.message);
    console.error(err);
    process.exit(1);
});
