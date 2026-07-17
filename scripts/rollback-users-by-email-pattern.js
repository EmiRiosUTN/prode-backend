const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

function parseArgs(argv) {
    const options = {
        companySlug: '',
        emailContains: '',
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

        if (arg.startsWith('--company-slug=')) {
            options.companySlug = arg.split('=').slice(1).join('=').trim();
            continue;
        }

        if (arg === '--company-slug') {
            options.companySlug = (argv[i + 1] || '').trim();
            i += 1;
            continue;
        }

        if (arg.startsWith('--email-contains=')) {
            options.emailContains = arg.split('=').slice(1).join('=').trim();
            continue;
        }

        if (arg === '--email-contains') {
            options.emailContains = (argv[i + 1] || '').trim();
            i += 1;
            continue;
        }
    }

    return options;
}

function printHelp() {
    console.log(`
Uso:
  node scripts/rollback-users-by-email-pattern.js --company-slug <slug> --email-contains <texto> [--dry-run]

Ejemplo:
  node scripts/rollback-users-by-email-pattern.js --dry-run --company-slug recrear --email-contains recrear0608a
  node scripts/rollback-users-by-email-pattern.js --company-slug recrear --email-contains recrear0608a
`);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    if (!options.companySlug) {
        throw new Error('Falta --company-slug');
    }

    if (!options.emailContains) {
        throw new Error('Falta --email-contains');
    }

    const company = await prisma.company.findFirst({
        where: { slug: options.companySlug },
        select: { id: true, name: true, slug: true },
    });

    if (!company) {
        throw new Error(`Empresa no encontrada: ${options.companySlug}`);
    }

    const users = await prisma.user.findMany({
        where: {
            email: {
                contains: options.emailContains,
            },
            employee: {
                company_id: company.id,
            },
        },
        select: {
            id: true,
            email: true,
            employee: {
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                },
            },
        },
        orderBy: {
            created_at: 'asc',
        },
    });

    console.log(`Empresa: ${company.name} (${company.slug})`);
    console.log(`Filtro email: ${options.emailContains}`);
    console.log(`Modo dry-run: ${options.dryRun ? 'si' : 'no'}`);
    console.log(`Usuarios encontrados: ${users.length}`);

    if (users.length === 0) {
        return;
    }

    console.log('\nUsuarios objetivo:');
    for (const user of users) {
        const fullName = user.employee
            ? `${user.employee.first_name} ${user.employee.last_name}`.trim()
            : '(sin employee)';
        console.log(`- ${user.email} | ${fullName} | ${user.id}`);
    }

    if (options.dryRun) {
        return;
    }

    let deleted = 0;
    for (const user of users) {
        await prisma.user.delete({
            where: { id: user.id },
        });
        deleted += 1;
        console.log(`DELETED ${user.email}`);
    }

    console.log(`\nBorrados: ${deleted}`);
}

main()
    .catch((error) => {
        console.error('\nFallo el rollback por patron:', error.message);
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
