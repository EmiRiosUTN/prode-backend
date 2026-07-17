const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Eitalgas2026@';
const DEFAULT_COMPANY_SLUG = 'grupoitalgas';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const FIRST_NAME_HINTS = [
    'kevin', 'hernan', 'javier', 'javi', 'sebastian', 'sebas', 'juan', 'joaquin', 'jose', 'maria', 'ana', 'lucas',
    'ramiro', 'martin', 'nicolas', 'nahuel', 'franco', 'paula', 'sofia', 'valentina', 'camila',
];

function parseArgs(argv) {
    const options = {
        companySlug: DEFAULT_COMPANY_SLUG,
        password: DEFAULT_PASSWORD,
        emails: [],
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

        if (arg.startsWith('--password=')) {
            options.password = arg.split('=').slice(1).join('=');
            continue;
        }

        if (arg === '--password') {
            options.password = argv[i + 1] || DEFAULT_PASSWORD;
            i += 1;
            continue;
        }

        if (arg.startsWith('--emails=')) {
            options.emails = parseEmailsArg(arg.split('=').slice(1).join('='));
            continue;
        }

        if (arg === '--emails') {
            options.emails = parseEmailsArg(argv[i + 1] || '');
            i += 1;
            continue;
        }
    }

    return options;
}

function parseEmailsArg(raw) {
    return String(raw || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
}

function printHelp() {
    console.log(`
Uso:
  node scripts/create-users-from-emails.js --company-slug <slug> --emails <mail1,mail2,...> [--dry-run]

Ejemplo:
  node scripts/create-users-from-emails.js --dry-run --company-slug grupoitalgas --emails "a@x.com,b@y.com"
`);
}

function titleCase(value) {
    return value
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function normalizeToken(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z]/g, '');
}

function splitByKnownFirstName(localPart) {
    const lower = localPart.toLowerCase();
    const hints = [...FIRST_NAME_HINTS].sort((a, b) => b.length - a.length);
    for (const hint of hints) {
        if (lower.startsWith(hint) && lower.length >= hint.length + 2) {
            return {
                firstName: titleCase(hint),
                lastName: titleCase(lower.slice(hint.length)),
                strategy: 'known-first-name-prefix',
            };
        }
    }
    return null;
}

function splitByKnownFirstNameSuffix(localPart) {
    const lower = localPart.toLowerCase();
    const hints = [...FIRST_NAME_HINTS].sort((a, b) => b.length - a.length);
    for (const hint of hints) {
        if (lower.endsWith(hint) && lower.length >= hint.length + 2) {
            return {
                firstName: titleCase(hint),
                lastName: titleCase(lower.slice(0, lower.length - hint.length)),
                strategy: 'known-first-name-suffix',
            };
        }
    }
    return null;
}

function parseNameFromEmail(email) {
    const [localRaw] = email.split('@');
    const localWithoutDigits = localRaw.replace(/\d+$/g, '');
    const parts = localWithoutDigits.split(/[._-]+/).filter(Boolean);

    if (parts.length >= 2) {
        return {
            firstName: titleCase(parts.slice(0, -1).join(' ')),
            lastName: titleCase(parts[parts.length - 1]),
            strategy: 'separator-split',
        };
    }

    const originalLettersOnly = normalizeToken(localWithoutDigits);
    if (/^[A-Z]+$/.test(localRaw.replace(/\d+$/g, '')) && originalLettersOnly.length > 4) {
        const lastNameRaw = originalLettersOnly.slice(0, -2);
        const firstNameRaw = originalLettersOnly.slice(-2);
        return {
            firstName: titleCase(firstNameRaw),
            lastName: titleCase(lastNameRaw),
            strategy: 'uppercase-tail-initials',
        };
    }

    const knownSplit = splitByKnownFirstName(originalLettersOnly);
    if (knownSplit) {
        return knownSplit;
    }

    const knownSuffixSplit = splitByKnownFirstNameSuffix(originalLettersOnly);
    if (knownSuffixSplit) {
        return knownSuffixSplit;
    }

    return {
        firstName: titleCase(originalLettersOnly.slice(0, Math.max(1, Math.floor(originalLettersOnly.length / 2)))),
        lastName: titleCase(originalLettersOnly.slice(Math.max(1, Math.floor(originalLettersOnly.length / 2)))),
        strategy: 'fallback-halves',
    };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    if (options.emails.length === 0) {
        throw new Error('Debes indicar al menos un email con --emails');
    }

    const invalid = options.emails.filter((email) => !EMAIL_REGEX.test(email));
    if (invalid.length > 0) {
        throw new Error(`Emails invalidos: ${invalid.join(', ')}`);
    }

    const company = await prisma.company.findFirst({
        where: { slug: options.companySlug },
        include: {
            company_areas: {
                where: { is_active: true },
                orderBy: { created_at: 'asc' },
            },
        },
    });

    if (!company) {
        throw new Error(`Empresa no encontrada: ${options.companySlug}`);
    }

    if (company.company_areas.length === 0) {
        throw new Error(`La empresa ${company.name} no tiene areas activas`);
    }

    const area = company.company_areas[0];
    const passwordHash = options.dryRun ? null : await bcrypt.hash(options.password, 10);
    const existingUsers = await prisma.user.findMany({
        where: {
            email: {
                in: options.emails,
            },
        },
        select: {
            id: true,
            email: true,
        },
    });

    const existingEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));
    const results = [];

    for (const email of options.emails) {
        const parsed = parseNameFromEmail(email);

        if (existingEmails.has(email)) {
            results.push({
                status: 'already_exists',
                email,
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                strategy: parsed.strategy,
            });
            continue;
        }

        if (options.dryRun) {
            results.push({
                status: 'dry_run_ready',
                email,
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                strategy: parsed.strategy,
            });
            continue;
        }

        const created = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password_hash: passwordHash,
                    role: 'empleado',
                    is_active: true,
                    email_verified: true,
                    verification_token: null,
                    token_expires_at: null,
                },
            });

            const employee = await tx.employee.create({
                data: {
                    user_id: user.id,
                    company_id: company.id,
                    company_area_id: area.id,
                    first_name: parsed.firstName,
                    last_name: parsed.lastName,
                    phone: null,
                },
            });

            return { user, employee };
        });

        results.push({
            status: 'created',
            email,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            strategy: parsed.strategy,
            userId: created.user.id,
            employeeId: created.employee.id,
        });
    }

    console.log(JSON.stringify({
        company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
        },
        area: {
            id: area.id,
            name: area.name,
        },
        dryRun: options.dryRun,
        total: options.emails.length,
        results,
    }, null, 2));
}

main()
    .catch((error) => {
        console.error('\nFallo la creacion por emails:', error.message);
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
