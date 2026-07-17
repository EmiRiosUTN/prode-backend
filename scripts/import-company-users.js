const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'Eitalgas2026@';
const DEFAULT_COMPANY_SLUG = 'grupoitalgas';
const DEFAULT_CSV_NAME = 'Cuentas prodemax Italgas - Hoja 1.csv';
const LOGS_DIR = path.join(__dirname, '..', 'logs', 'user-imports');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function parseArgs(argv) {
    const options = {
        companySlug: DEFAULT_COMPANY_SLUG,
        csvPath: path.join(__dirname, '..', DEFAULT_CSV_NAME),
        password: DEFAULT_PASSWORD,
        dryRun: false,
        forceVerified: false,
        help: false,
        areaId: '',
        areaName: '',
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

        if (arg === '--force-verified') {
            options.forceVerified = true;
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

        if (arg.startsWith('--csv=')) {
            options.csvPath = resolveInputPath(arg.split('=').slice(1).join('='));
            continue;
        }

        if (arg === '--csv') {
            options.csvPath = resolveInputPath(argv[i + 1] || '');
            i += 1;
            continue;
        }

        if (arg.startsWith('--password=')) {
            options.password = arg.split('=').slice(1).join('=');
            continue;
        }

        if (arg === '--password') {
            options.password = argv[i + 1] || '';
            i += 1;
            continue;
        }

        if (arg.startsWith('--area-id=')) {
            options.areaId = arg.split('=').slice(1).join('=').trim();
            continue;
        }

        if (arg === '--area-id') {
            options.areaId = (argv[i + 1] || '').trim();
            i += 1;
            continue;
        }

        if (arg.startsWith('--area-name=')) {
            options.areaName = arg.split('=').slice(1).join('=').trim();
            continue;
        }

        if (arg === '--area-name') {
            options.areaName = (argv[i + 1] || '').trim();
            i += 1;
            continue;
        }
    }

    return options;
}

function resolveInputPath(inputPath) {
    const trimmed = (inputPath || '').trim();
    if (!trimmed) {
        return path.join(__dirname, '..', DEFAULT_CSV_NAME);
    }

    if (path.isAbsolute(trimmed)) {
        return trimmed;
    }

    return path.resolve(process.cwd(), trimmed);
}

function printHelp() {
    console.log(`
Uso:
  node scripts/import-company-users.js [opciones]

Opciones:
  --company-slug <slug>     Empresa destino. Default: ${DEFAULT_COMPANY_SLUG}
  --csv <ruta>              CSV a importar. Default: ${DEFAULT_CSV_NAME}
  --password <valor>        Password para todos los usuarios. Default: ${DEFAULT_PASSWORD}
  --area-id <uuid>          Fuerza un area especifica.
  --area-name <nombre>      Busca el area por nombre dentro de la empresa.
  --dry-run                 No inserta datos. Solo valida y consulta la BD.
  --force-verified          Marca email_verified=true aun si la empresa exige confirmacion.
  --help                    Muestra esta ayuda.

Comportamiento:
  - Si un email aparece repetido en el CSV, se saltean todas sus filas.
  - Si un email ya existe en la BD, se saltea.
  - Cada fila genera un resultado detallado en logs JSON y TXT.
`);
}

function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`CSV no encontrado: ${filePath}`);
    }
}

function parseCsv(content) {
    const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter((line) => line.trim() !== '');

    if (lines.length === 0) {
        throw new Error('El CSV esta vacio');
    }

    return lines.map(parseCsvLine);
}

function parseCsvLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            const next = line[i + 1];
            if (inQuotes && next === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            cells.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    cells.push(current);
    return cells.map((cell) => cell.trim());
}

function normalizeHeader(header) {
    return (header || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function titleCase(value) {
    return value
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.split('-').map(capitalize).join('-'))
        .join(' ');
}

function capitalize(word) {
    if (!word) {
        return '';
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function parseFullName(rawName) {
    const cleaned = (rawName || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) {
        return { ok: false, reason: 'Nombre vacio' };
    }

    const tokens = cleaned.split(' ');
    if (tokens.length < 2) {
        return { ok: false, reason: 'No se pudo separar apellido y nombre' };
    }

    return {
        ok: true,
        firstName: titleCase(tokens.slice(1).join(' ')),
        lastName: titleCase(tokens[0]),
        rawName: cleaned,
        strategy: 'first-token-last-name',
    };
}

function buildRows(csvRows) {
    const header = csvRows[0];
    const headerMap = new Map();

    header.forEach((cell, index) => {
        const normalized = normalizeHeader(cell);
        if (normalized) {
            headerMap.set(normalized, index);
        }
    });

    const nameIndex = headerMap.get('nombre');
    const emailIndex = headerMap.get('correo');

    if (nameIndex === undefined || emailIndex === undefined) {
        throw new Error('El CSV debe tener columnas "Nombre" y "Correo"');
    }

    return csvRows.slice(1).map((row, index) => {
        const rowNumber = index + 2;
        const rawName = (row[nameIndex] || '').trim();
        const email = (row[emailIndex] || '').trim().toLowerCase();

        return {
            rowNumber,
            rawName,
            email,
        };
    });
}

function validateRows(rawRows) {
    const duplicateMap = new Map();

    for (const row of rawRows) {
        if (!row.email) {
            continue;
        }

        if (!duplicateMap.has(row.email)) {
            duplicateMap.set(row.email, []);
        }

        duplicateMap.get(row.email).push(row.rowNumber);
    }

    const duplicatedEmails = new Map(
        Array.from(duplicateMap.entries()).filter(([, rowNumbers]) => rowNumbers.length > 1),
    );

    return rawRows.map((row) => {
        const result = {
            ...row,
            status: 'pending',
            reason: '',
            details: {},
            firstName: '',
            lastName: '',
        };

        if (!row.rawName) {
            result.status = 'invalid';
            result.reason = 'Nombre vacio';
            return result;
        }

        if (!row.email) {
            result.status = 'invalid';
            result.reason = 'Email vacio';
            return result;
        }

        if (!EMAIL_REGEX.test(row.email)) {
            result.status = 'invalid';
            result.reason = 'Formato de email invalido';
            return result;
        }

        if (duplicatedEmails.has(row.email)) {
            result.status = 'duplicate_in_csv';
            result.reason = 'Email repetido dentro del CSV';
            result.details.duplicateRows = duplicatedEmails.get(row.email);
            return result;
        }

        const parsedName = parseFullName(row.rawName);
        if (!parsedName.ok) {
            result.status = 'invalid';
            result.reason = parsedName.reason;
            return result;
        }

        result.firstName = parsedName.firstName;
        result.lastName = parsedName.lastName;
        result.details.nameStrategy = parsedName.strategy;

        return result;
    });
}

async function findCompany(prisma, options) {
    const company = await prisma.company.findUnique({
        where: { slug: options.companySlug },
        include: {
            company_areas: {
                where: { is_active: true },
                orderBy: { created_at: 'asc' },
            },
        },
    });

    if (!company) {
        throw new Error(`Empresa no encontrada para slug "${options.companySlug}"`);
    }

    if (!company.is_active) {
        throw new Error(`La empresa "${company.name}" esta inactiva`);
    }

    return company;
}

function resolveArea(company, options) {
    if (options.areaId) {
        const areaById = company.company_areas.find((area) => area.id === options.areaId);
        if (!areaById) {
            throw new Error(`No existe un area activa con id "${options.areaId}" en ${company.name}`);
        }
        return areaById;
    }

    if (options.areaName) {
        const normalizedTarget = normalizeHeader(options.areaName);
        const areaByName = company.company_areas.find((area) => normalizeHeader(area.name) === normalizedTarget);
        if (!areaByName) {
            throw new Error(`No existe un area activa con nombre "${options.areaName}" en ${company.name}`);
        }
        return areaByName;
    }

    if (company.company_areas.length === 0) {
        throw new Error(`La empresa "${company.name}" no tiene areas activas`);
    }

    return company.company_areas[0];
}

async function findExistingEmails(prisma, emails) {
    const chunkSize = 500;
    const existing = new Set();

    for (let i = 0; i < emails.length; i += chunkSize) {
        const chunk = emails.slice(i, i + chunkSize);
        const users = await prisma.user.findMany({
            where: {
                email: {
                    in: chunk,
                },
            },
            select: {
                email: true,
            },
        });

        users.forEach((user) => existing.add(user.email.toLowerCase()));
    }

    return existing;
}

async function createUser(prisma, row, company, area, passwordHash, emailVerified) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: row.email,
                password_hash: passwordHash,
                role: 'empleado',
                is_active: true,
                email_verified: emailVerified,
                verification_token: null,
                token_expires_at: null,
            },
        });

        const employee = await tx.employee.create({
            data: {
                user_id: user.id,
                company_id: company.id,
                company_area_id: area.id,
                first_name: row.firstName,
                last_name: row.lastName,
                phone: null,
            },
        });

        return { user, employee };
    });
}

function ensureLogsDir() {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function buildTimestamp() {
    const now = new Date();
    const parts = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        '-',
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
    ];

    return parts.join('');
}

function summarize(results) {
    return results.reduce((acc, row) => {
        acc.total += 1;
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
    }, {
        total: 0,
        created: 0,
        dry_run_ready: 0,
        duplicate_in_csv: 0,
        already_exists: 0,
        invalid: 0,
        error: 0,
    });
}

function writeLogs(context) {
    ensureLogsDir();
    const timestamp = buildTimestamp();
    const baseName = `${timestamp}-${context.company.slug}-user-import`;
    const summaryPath = path.join(LOGS_DIR, `${baseName}.txt`);
    const detailsPath = path.join(LOGS_DIR, `${baseName}.json`);

    const maskedPassword = `${'*'.repeat(Math.max(context.options.password.length - 4, 0))}${context.options.password.slice(-4)}`;

    const summaryLines = [
        `Empresa: ${context.company.name} (${context.company.slug})`,
        `CSV: ${context.csvPath}`,
        `Area asignada: ${context.area.name} (${context.area.id})`,
        `Dry run: ${context.options.dryRun ? 'si' : 'no'}`,
        `Force verified: ${context.options.forceVerified ? 'si' : 'no'}`,
        `Password usada: ${maskedPassword}`,
        `Email verified aplicado: ${context.emailVerified ? 'true' : 'false'}`,
        '',
        'Resumen:',
        `- total: ${context.summary.total}`,
        `- created: ${context.summary.created}`,
        `- dry_run_ready: ${context.summary.dry_run_ready}`,
        `- duplicate_in_csv: ${context.summary.duplicate_in_csv}`,
        `- already_exists: ${context.summary.already_exists}`,
        `- invalid: ${context.summary.invalid}`,
        `- error: ${context.summary.error}`,
        '',
        'Detalle de filas con problemas:',
    ];

    const issues = context.results.filter((row) => row.status !== 'created' && row.status !== 'dry_run_ready');
    if (issues.length === 0) {
        summaryLines.push('- sin incidencias');
    } else {
        issues.forEach((row) => {
            summaryLines.push(`- fila ${row.rowNumber} | ${row.email || '(sin email)'} | ${row.status} | ${row.reason}`);
        });
    }

    fs.writeFileSync(summaryPath, summaryLines.join('\n'), 'utf8');
    fs.writeFileSync(detailsPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        company: {
            id: context.company.id,
            name: context.company.name,
            slug: context.company.slug,
        },
        area: {
            id: context.area.id,
            name: context.area.name,
        },
        csvPath: context.csvPath,
        options: {
            dryRun: context.options.dryRun,
            forceVerified: context.options.forceVerified,
            passwordMasked: maskedPassword,
        },
        summary: context.summary,
        results: context.results,
    }, null, 2), 'utf8');

    return { summaryPath, detailsPath };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    ensureFileExists(options.csvPath);

    const prisma = new PrismaClient();

    try {
        console.log('Leyendo CSV...');
        const csvContent = fs.readFileSync(options.csvPath, 'utf8');
        const csvRows = parseCsv(csvContent);
        const builtRows = buildRows(csvRows);
        const validatedRows = validateRows(builtRows);

        console.log('Consultando empresa y area...');
        const company = await findCompany(prisma, options);
        const area = resolveArea(company, options);
        const emailVerified = options.forceVerified || !company.require_email_confirmation;

        const candidateEmails = validatedRows
            .filter((row) => row.status === 'pending')
            .map((row) => row.email);

        console.log(`Chequeando ${candidateEmails.length} emails contra la BD...`);
        const existingEmails = await findExistingEmails(prisma, candidateEmails);

        const passwordHash = await bcrypt.hash(options.password, 10);
        const results = [];

        for (const row of validatedRows) {
            if (row.status !== 'pending') {
                results.push(row);
                continue;
            }

            if (existingEmails.has(row.email)) {
                results.push({
                    ...row,
                    status: 'already_exists',
                    reason: 'El email ya existe en el sistema',
                });
                continue;
            }

            if (options.dryRun) {
                results.push({
                    ...row,
                    status: 'dry_run_ready',
                    reason: 'Listo para crear',
                });
                continue;
            }

            try {
                const created = await createUser(prisma, row, company, area, passwordHash, emailVerified);
                results.push({
                    ...row,
                    status: 'created',
                    reason: '',
                    details: {
                        ...row.details,
                        userId: created.user.id,
                        employeeId: created.employee.id,
                    },
                });
                console.log(`OK fila ${row.rowNumber}: ${row.email}`);
            } catch (error) {
                results.push({
                    ...row,
                    status: 'error',
                    reason: error.message || 'Error desconocido al crear',
                    details: {
                        ...row.details,
                        stack: error.stack,
                    },
                });
                console.error(`ERROR fila ${row.rowNumber}: ${row.email} -> ${error.message}`);
            }
        }

        const summary = summarize(results);
        const logs = writeLogs({
            company,
            area,
            csvPath: options.csvPath,
            options,
            emailVerified,
            results,
            summary,
        });

        console.log('\nResumen final:');
        console.log(summary);
        console.log(`Log resumen: ${logs.summaryPath}`);
        console.log(`Log detalle: ${logs.detailsPath}`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error('\nFallo el importador:', error.message);
    console.error(error);
    process.exit(1);
});
