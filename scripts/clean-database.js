const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function cleanDatabase() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Conectando a la base de datos...');
        await client.connect();
        console.log('Conectado exitosamente.');

        // Leer el archivo SQL
        const sqlFilePath = path.join(__dirname, 'clean-database.sql');
        const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('\n⚠️  ADVERTENCIA: Este script eliminará TODOS los datos excepto el admin global.');
        console.log('Ejecutando script de limpieza en 3 segundos...\n');

        // Esperar 3 segundos para dar tiempo a cancelar
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Ejecutando script SQL...\n');

        // Ejecutar el script SQL
        const result = await client.query(sqlScript);

        console.log('\n✅ Script ejecutado exitosamente.');

        // Mostrar los resultados de las consultas de verificación
        if (result && Array.isArray(result)) {
            result.forEach((res, index) => {
                if (res.rows && res.rows.length > 0) {
                    console.log(`\nResultado ${index + 1}:`);
                    console.table(res.rows);
                }
            });
        }

    } catch (error) {
        console.error('\n❌ Error al ejecutar el script:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\nConexión cerrada.');
    }
}

// Ejecutar la función
cleanDatabase();
