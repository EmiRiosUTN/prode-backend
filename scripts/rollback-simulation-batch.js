const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

function parseArgs(argv) {
    const options = {
        logPath: '',
        dryRun: false,
        help: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === '--help' || arg === '-h') {
            options.help = true;
            continue;
        }

        if (arg === '--dry-run') {
            options.dryRun = true;
            continue;
        }

        if (arg.startsWith('--log=')) {
            options.logPath = arg.split('=').slice(1).join('=').trim();
            continue;
        }

        if (arg === '--log') {
            options.logPath = (argv[i + 1] || '').trim();
            i += 1;
            continue;
        }
    }

    return options;
}

function printHelp() {
    console.log(`
Uso:
  node scripts/rollback-simulation-batch.js --log <ruta-json> [--dry-run]

Comportamiento:
  - Lee un log JSON de simulate-recrear-participants.js
  - Toma solo los items con status "created"
  - Borra esos usuarios por userId
  - El delete de user dispara cascada sobre employee, participant y predictions

Ejemplo:
  node scripts/rollback-simulation-batch.js --dry-run --log "logs/recrear-simulations/20260609-012849-recrear-simulation.json"
  node scripts/rollback-simulation-batch.js --log "logs/recrear-simulations/20260609-012849-recrear-simulation.json"
`);
}

function resolveLogPath(inputPath) {
    if (!inputPath) {
        throw new Error('Debes indicar --log <ruta-json>');
    }

    if (path.isAbsolute(inputPath)) {
        return inputPath;
    }

    return path.resolve(process.cwd(), inputPath);
}

function loadLog(logPath) {
    if (!fs.existsSync(logPath)) {
        throw new Error(`No existe el log: ${logPath}`);
    }

    const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    if (!data || !Array.isArray(data.results)) {
        throw new Error('El log no tiene formato valido');
    }

    return data;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    const logPath = resolveLogPath(options.logPath);
    const logData = loadLog(logPath);

    const createdItems = logData.results.filter((item) => item.status === 'created' && item.ids?.userId);

    if (createdItems.length === 0) {
        throw new Error('El log no contiene usuarios creados para revertir');
    }

    console.log(`Log: ${logPath}`);
    console.log(`Empresa: ${logData.company?.name || 'desconocida'} (${logData.company?.slug || 'sin-slug'})`);
    console.log(`Usuarios creados en el log: ${createdItems.length}`);
    console.log(`Modo dry-run: ${options.dryRun ? 'si' : 'no'}`);

    const summary = {
        requestedDeletes: createdItems.length,
        foundUsers: 0,
        deletedUsers: 0,
        missingUsers: 0,
        errors: 0,
    };

    for (const item of createdItems) {
        const userId = item.ids.userId;
        const email = item.email;

        try {
            const existingUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true },
            });

            if (!existingUser) {
                summary.missingUsers += 1;
                console.log(`MISSING ${email} (${userId})`);
                continue;
            }

            summary.foundUsers += 1;

            if (options.dryRun) {
                console.log(`READY_DELETE ${email} (${userId})`);
                continue;
            }

            await prisma.user.delete({
                where: { id: userId },
            });

            summary.deletedUsers += 1;
            console.log(`DELETED ${email} (${userId})`);
        } catch (error) {
            summary.errors += 1;
            console.error(`ERROR ${email} (${userId}): ${error.message}`);
        }
    }

    console.log('\nResumen final:');
    console.log(summary);
}

main()
    .catch((error) => {
        console.error('\nFallo el rollback:', error.message);
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
