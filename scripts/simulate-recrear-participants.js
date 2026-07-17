const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const DEFAULTS = {
    companySlug: 'recrear',
    targetCount: 172,
    password: 'Recrear2026@',
    seed: 260608,
    domains: ['gmail.com', 'hotmail.com', 'outlook.com'],
    logDir: path.join(__dirname, '..', 'logs', 'recrear-simulations'),
    profile: 'batch1',
};

const FIRST_NAMES = [
    'Sofia', 'Valentina', 'Martina', 'Catalina', 'Mia', 'Emilia', 'Lucia', 'Julieta', 'Camila', 'Victoria',
    'Paula', 'Malena', 'Agustina', 'Bianca', 'Brisa', 'Pilar', 'Renata', 'Lola', 'Olivia', 'Josefina',
    'Benjamin', 'Mateo', 'Felipe', 'Joaquin', 'Valentino', 'Bautista', 'Thiago', 'Tomas', 'Franco', 'Santino',
    'Lautaro', 'Facundo', 'Bruno', 'Juan', 'Nicolas', 'Ramiro', 'Santiago', 'Ignacio', 'Nahuel', 'Dylan',
    'Mora', 'Amparo', 'Ailen', 'Milagros', 'Candela', 'Abril', 'Uma', 'Nina', 'Clara', 'Elena',
    'Gael', 'Salvador', 'Lorenzo', 'Simon', 'Vicente', 'Tiziano', 'Delfina', 'Ariana', 'Zoe', 'Alma',
    'Kevin', 'Ian', 'Agustin', 'Thiara', 'Kiara', 'Micaela', 'Florencia', 'Guadalupe', 'Ciro', 'Benicio',
    'Luca', 'Aldana', 'Tatiana', 'Rocio', 'Maia', 'Belen', 'Aitana', 'Axel', 'Iker', 'Ulises',
    'Milo', 'Mirko', 'Ezequiel', 'Tobias', 'Gonzalo', 'Julian', 'Valen', 'Ariadna', 'Milena', 'Abril Sol',
];

const LAST_NAMES = [
    'Gonzalez', 'Rodriguez', 'Gomez', 'Fernandez', 'Lopez', 'Diaz', 'Martinez', 'Perez', 'Romero', 'Sosa',
    'Alvarez', 'Torres', 'Ruiz', 'Suarez', 'Molina', 'Silva', 'Castro', 'Ortiz', 'Rojas', 'Medina',
    'Herrera', 'Aguirre', 'Ponce', 'Navarro', 'Acosta', 'Benitez', 'Paz', 'Mendez', 'Quiroga', 'Vera',
    'Correa', 'Peralta', 'Bustos', 'Cabrera', 'Godoy', 'Mansilla', 'Farias', 'Ledesma', 'Miranda', 'Campos',
    'Juarez', 'Villalba', 'Roldan', 'Tevez', 'Arce', 'Leiva', 'Ojeda', 'Barrios', 'Cardozo', 'Ramos',
    'Sanchez', 'Nuñez', 'Dominguez', 'Moyano', 'Lucero', 'Ibarra', 'Cisneros', 'Gimenez', 'Pereyra', 'Flores',
    'Macias', 'Mamani', 'Farina', 'Brizuela', 'Bazan', 'Escudero', 'Maidana', 'Luna', 'Serrano', 'Vargas',
    'Andrada', 'Ferreyra', 'Carrizo', 'Monzon', 'Pino', 'Toledo', 'Aguero', 'Maldonado', 'Acuña', 'Coronel',
    'Tapia', 'Rivero', 'Villarroel', 'Paredes', 'Sotelo', 'Cejas', 'Britez', 'Gauna', 'Ayala', 'Sarmiento',
];

const SCHOOLS = [
    'Esc de Comercio',
    'Esc. de Comercio',
    'Nacional',
    'Colegio Nacional',
    'La Inmaculada',
    'la inmaculada',
    'Media 7',
    'media 7',
    'Puertas del Sol',
    'puertas del sol',
    'Isaac Newton',
    'Isaac Newron',
    'San Juan Bautista',
    'Instituto Educativo Modelo',
    'instituto educativo modelo',
    'Instituto San Pablo',
    'Nuestra Senora de Lujan de los Patriotas',
    'Nuestra Senora de Lujan',
    'Escuela de Comercio',
    'Escuela de comercio',
    'Dante Alighieri',
    'dante alighieri',
    'Escuela Nro 19',
    'Escuela Nro 19 Zárate',
    'Domingo Savio',
    'Jose Manuel Estrada',
    'jose manuel estrada',
    'Escuela Integral Jorge Luis Borges',
    'escuela integral jorge luis borges',
    'Santa Marta',
    'santa marta',
    'Mariano Moreno',
    'mariano moreno',
    'Secundaria 70',
    'Secundaria 73',
    'Mariano Acosta',
    'Escuela Secundaria N 7',
    'escuela secundaria n 7',
    'Escuela Educativa Secundaria N 55',
    'E.T. 17 Brigadier General Cornelio Saavedra',
    'ET 17 Cornelio Saavedra',
    'Secundaria 73',
];

const GRADES = [
    '6',
    '7',
    '4 año',
    '4',
    '5to',
    '5',
    '5to año',
    '6to',
    'Cuarto año',
    '4to',
    '5 año',
    '4c',
    '7mo',
    '7B',
    '7 A',
    'Sexto',
    '6 grado',
    '3er año',
    '1 año',
    '5A',
    '3ro',
    '4to año B',
    '5to A',
    '4to 1ra',
    '4to secundaria',
    '4to ano',
    '5to ano',
    '6to ano',
    '1 ano',
];

const LOCALITIES = [
    'CABA',
    'Caba',
    'Cordoba',
    'Concepcion Tucuman',
    'Ensenada',
    'La Plata',
    'La plata',
    'San Miguel',
    'Cordoba',
    'Balcarce',
    'Oncativo',
    'Valentin Alsina',
    'Lomas de Zamora',
    'Berisso',
    'Jose C. Paz',
    'Jose c paz',
    'Wilde',
    'Villa Allende',
    'Zarate',
    'Avellaneda',
    'Arturo Segui',
    'Laferrere',
];

function parseArgs(argv) {
    const options = {
        companySlug: DEFAULTS.companySlug,
        targetCount: DEFAULTS.targetCount,
        password: DEFAULTS.password,
        dryRun: false,
        seed: DEFAULTS.seed,
        batchTag: buildDefaultBatchTag(),
        help: false,
        prodeId: '',
        profile: DEFAULTS.profile,
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

        if (arg.startsWith('--count=')) {
            options.targetCount = Number(arg.split('=').slice(1).join('='));
            continue;
        }

        if (arg === '--count') {
            options.targetCount = Number(argv[i + 1] || DEFAULTS.targetCount);
            i += 1;
            continue;
        }

        if (arg.startsWith('--password=')) {
            options.password = arg.split('=').slice(1).join('=');
            continue;
        }

        if (arg === '--password') {
            options.password = argv[i + 1] || DEFAULTS.password;
            i += 1;
            continue;
        }

        if (arg.startsWith('--seed=')) {
            options.seed = Number(arg.split('=').slice(1).join('='));
            continue;
        }

        if (arg === '--seed') {
            options.seed = Number(argv[i + 1] || DEFAULTS.seed);
            i += 1;
            continue;
        }

        if (arg.startsWith('--batch-tag=')) {
            options.batchTag = sanitizeBatchTag(arg.split('=').slice(1).join('='));
            continue;
        }

        if (arg === '--batch-tag') {
            options.batchTag = sanitizeBatchTag(argv[i + 1] || '');
            i += 1;
            continue;
        }

        if (arg.startsWith('--prode-id=')) {
            options.prodeId = arg.split('=').slice(1).join('=').trim();
            continue;
        }

        if (arg === '--prode-id') {
            options.prodeId = (argv[i + 1] || '').trim();
            i += 1;
            continue;
        }

        if (arg.startsWith('--profile=')) {
            options.profile = arg.split('=').slice(1).join('=').trim() || DEFAULTS.profile;
            continue;
        }

        if (arg === '--profile') {
            options.profile = (argv[i + 1] || DEFAULTS.profile).trim();
            i += 1;
            continue;
        }
    }

    return options;
}

function buildDefaultBatchTag() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `rec${yyyy}${mm}${dd}${hh}${min}`;
}

function sanitizeBatchTag(value) {
    const cleaned = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleaned || buildDefaultBatchTag();
}

function printHelp() {
    console.log(`
Uso:
  node scripts/simulate-recrear-participants.js [opciones]

Opciones:
  --count <n>          Cantidad de usuarios nuevos a crear. Default: ${DEFAULTS.targetCount}
  --dry-run            Simula sin escribir en la BD.
  --password <valor>   Password comun para los usuarios. Default: ${DEFAULTS.password}
  --seed <n>           Seed para datos reproducibles. Default: ${DEFAULTS.seed}
  --batch-tag <tag>    Sufijo para emails. Default: ${buildDefaultBatchTag()}
  --prode-id <uuid>    Fuerza un prode especifico. Si no, usa el activo mas reciente.
  --profile <nombre>   batch1, batch2 o batch3. Default: ${DEFAULTS.profile}
  --help               Muestra esta ayuda.

Comportamiento:
  - Crea usuarios para la empresa slug "recrear"
  - Completa colegio, grado_ano y localidad en extra_data
  - Los une al prode activo
  - Genera predicciones para todos los partidos futuros y no bloqueados
  - Rota dominios entre gmail.com, hotmail.com y outlook.com
  - Puede variar el estilo de mails y telefonos por perfil
`);
}

function createRng(seed) {
    let state = seed >>> 0;
    return function next() {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function pick(rng, values) {
    return values[Math.floor(rng() * values.length)];
}

function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .trim();
}

function randomDigits(rng, minLength = 1, maxLength = 4) {
    const length = Math.floor(rng() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i += 1) {
        result += String(Math.floor(rng() * 10));
    }
    return result;
}

function randomYearish(rng) {
    const values = ['73', '78', '81', '84', '87', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '2000', '2001', '2002', '2003', '2004', '2005'];
    return pick(rng, values);
}

function pickLastNameWithSpread(rng, surnameUsage, maxPerSurname = 2) {
    const candidates = LAST_NAMES.filter((surname) => (surnameUsage.get(surname) || 0) < maxPerSurname);
    const chosen = candidates.length > 0 ? pick(rng, candidates) : pick(rng, LAST_NAMES);
    surnameUsage.set(chosen, (surnameUsage.get(chosen) || 0) + 1);
    return chosen;
}

function pickFirstNameWithSpread(rng, firstNameUsage, maxPerFirstName = 3) {
    const candidates = FIRST_NAMES.filter((firstName) => (firstNameUsage.get(firstName) || 0) < maxPerFirstName);
    const chosen = candidates.length > 0 ? pick(rng, candidates) : pick(rng, FIRST_NAMES);
    firstNameUsage.set(chosen, (firstNameUsage.get(chosen) || 0) + 1);
    return chosen;
}

function buildEmailLocalPart(rng, firstName, lastName, secondLastName, index, profile) {
    const first = slugify(firstName);
    const last = slugify(lastName);
    const secondLast = secondLastName ? slugify(secondLastName) : '';
    const firstInitial = first.charAt(0);
    const lastInitial = last.charAt(0);

    const batch1Patterns = [
        () => `${first}.${last}`,
        () => `${first}_${last}`,
        () => `${first}${last}`,
        () => `${first}${randomYearish(rng)}`,
        () => `${first}.${last}${randomDigits(rng, 1, 2)}`,
        () => `${first}${randomDigits(rng, 2, 4)}`,
        () => `${last}.${first}`,
        () => `${last}${firstInitial}`,
        () => `${firstInitial}${last}`,
        () => `${first}${lastInitial}${randomDigits(rng, 1, 3)}`,
        () => `${firstInitial}.${last}`,
        () => `${first}${last}${randomDigits(rng, 1, 2)}`,
        () => `${first}_${last}_${randomDigits(rng, 1, 2)}`,
        () => `${first}${randomYearish(rng)}${lastInitial}`,
        () => secondLast ? `${first}.${last}${secondLast.charAt(0)}` : `${first}.${last}${randomDigits(rng, 1, 2)}`,
        () => secondLast ? `${firstInitial}${last}.${secondLast}` : `${firstInitial}${last}${randomDigits(rng, 2, 3)}`,
        () => secondLast ? `${first}${last}.${secondLast}` : `${last}.${first}${randomDigits(rng, 1, 2)}`,
        () => `${first}${index + 1}`,
    ];

    const batch2Patterns = [
        () => `${last}.${first}`,
        () => `${last}_${first}`,
        () => `${last}${first}`,
        () => `${last}${randomYearish(rng)}`,
        () => `${firstInitial}${last}${randomDigits(rng, 2, 4)}`,
        () => `${last}${firstInitial}${randomDigits(rng, 1, 2)}`,
        () => `${firstInitial}.${last}${randomDigits(rng, 1, 3)}`,
        () => `${last}.${first}${randomDigits(rng, 1, 2)}`,
        () => `${first}${randomDigits(rng, 1, 2)}${lastInitial}`,
        () => `${lastInitial}${first}${randomDigits(rng, 2, 3)}`,
        () => `${first}_${randomYearish(rng)}`,
        () => `${last}_${randomDigits(rng, 2, 4)}`,
        () => `${firstInitial}${lastInitial}${randomDigits(rng, 3, 4)}`,
        () => `${first}.${last}_${randomDigits(rng, 1, 2)}`,
        () => secondLast ? `${last}.${secondLast}${firstInitial}` : `${last}.${firstInitial}${randomDigits(rng, 1, 2)}`,
        () => secondLast ? `${first}${secondLast}${randomDigits(rng, 1, 2)}` : `${first}${last}${randomDigits(rng, 2, 3)}`,
        () => secondLast ? `${secondLast}.${first}` : `${last}${randomDigits(rng, 3, 4)}`,
        () => `${last}${index + 1}`,
    ];

    const batch3Patterns = [
        () => `${first}${last}${randomDigits(rng, 2, 4)}`,
        () => `${first}.${last}${randomYearish(rng)}`,
        () => `${last}${first}${randomDigits(rng, 1, 2)}`,
        () => `${firstInitial}${last}${randomYearish(rng)}`,
        () => `${last}.${firstInitial}${randomDigits(rng, 2, 3)}`,
        () => `${first}${randomDigits(rng, 1, 2)}.${last}`,
        () => secondLast ? `${first}.${last}${secondLast.charAt(0)}${randomDigits(rng, 1, 2)}` : `${first}.${last}${randomDigits(rng, 2, 3)}`,
        () => secondLast ? `${last}${secondLast}.${firstInitial}` : `${last}${firstInitial}${randomDigits(rng, 2, 4)}`,
        () => `${first}${lastInitial}${randomYearish(rng)}`,
        () => `${firstInitial}${lastInitial}${first}${randomDigits(rng, 2, 3)}`,
        () => `${last}_${first}${randomDigits(rng, 1, 3)}`,
        () => `${first}.${last}_${randomYearish(rng)}`,
        () => `${first}${randomYearish(rng)}${last}`,
        () => `${last}${randomDigits(rng, 2, 3)}${firstInitial}`,
    ];

    const patterns = profile === 'batch3'
        ? batch3Patterns
        : profile === 'batch2'
            ? batch2Patterns
            : batch1Patterns;

    let localPart = pick(rng, patterns)();
    localPart = localPart.replace(/\.\./g, '.').replace(/__+/g, '_').replace(/[._]{2,}/g, '.');
    localPart = localPart.replace(/^[._]+|[._]+$/g, '');
    return localPart || `${first}${last}${index + 1}`;
}

function weightedPick(rng, entries) {
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = rng() * total;
    for (const entry of entries) {
        cursor -= entry.weight;
        if (cursor <= 0) {
            return entry.value;
        }
    }
    return entries[entries.length - 1].value;
}

function buildNationalNumber(areaCode, subscriberLength, rng) {
    const firstDigit = String(Math.floor(rng() * 5) + 2);
    let rest = '';
    for (let i = 0; i < subscriberLength - 1; i += 1) {
        rest += String(Math.floor(rng() * 10));
    }
    return `${areaCode}${firstDigit}${rest}`;
}

function generatePhone(rng, profile) {
    const areaCode = weightedPick(rng, profile === 'batch3'
        ? [
            { value: '223', weight: 12 },
            { value: '351', weight: 12 },
            { value: '261', weight: 10 },
            { value: '341', weight: 10 },
            { value: '11', weight: 9 },
            { value: '221', weight: 9 },
            { value: '299', weight: 8 },
            { value: '387', weight: 8 },
            { value: '381', weight: 7 },
            { value: '362', weight: 6 },
            { value: '264', weight: 5 },
            { value: '370', weight: 4 },
        ]
        : profile === 'batch2'
        ? [
            { value: '351', weight: 20 },
            { value: '221', weight: 18 },
            { value: '11', weight: 15 },
            { value: '3572', weight: 8 },
            { value: '3576', weight: 8 },
            { value: '2266', weight: 8 },
            { value: '386', weight: 7 },
            { value: '3487', weight: 6 },
            { value: '3541', weight: 5 },
            { value: '341', weight: 3 },
            { value: '261', weight: 2 },
        ]
        : [
            { value: '11', weight: 49 },
            { value: '221', weight: 13 },
            { value: '351', weight: 15 },
            { value: '386', weight: 4 },
            { value: '341', weight: 2 },
            { value: '261', weight: 1 },
            { value: '2266', weight: 2 },
            { value: '3487', weight: 2 },
            { value: '3541', weight: 2 },
            { value: '3572', weight: 3 },
            { value: '3576', weight: 2 },
        ]);

    const subscriberLength = areaCode === '11' ? 8 : 7;
    const national = buildNationalNumber(areaCode, subscriberLength, rng);
    const format = weightedPick(rng, profile === 'batch3'
        ? [
            { value: 'intl_compact', weight: 28 },
            { value: 'digits', weight: 24 },
            { value: 'intl_spaced', weight: 20 },
            { value: 'spaced', weight: 18 },
            { value: 'localish', weight: 10 },
        ]
        : profile === 'batch2'
        ? [
            { value: 'spaced', weight: 26 },
            { value: 'intl_compact', weight: 24 },
            { value: 'digits', weight: 20 },
            { value: 'intl_spaced', weight: 18 },
            { value: 'localish', weight: 12 },
        ]
        : [
            { value: 'digits', weight: 58 },
            { value: 'intl_compact', weight: 26 },
            { value: 'spaced', weight: 9 },
            { value: 'intl_spaced', weight: 2 },
            { value: 'localish', weight: 2 },
        ]);

    if (format === 'digits') {
        return national;
    }

    if (format === 'intl_compact') {
        return `+54${national}`;
    }

    if (format === 'intl_spaced') {
        if (areaCode === '11') {
            return `54 9 11 ${national.slice(2, 6)} ${national.slice(6)}`;
        }
        return `54 ${areaCode} ${national.slice(areaCode.length, areaCode.length + 3)} ${national.slice(areaCode.length + 3)}`;
    }

    if (format === 'spaced') {
        if (areaCode === '11') {
            return `${areaCode}${national.slice(2, 6)} ${national.slice(6)}`;
        }
        if (profile === 'batch3' && areaCode.length === 3) {
            return `${areaCode}-${national.slice(areaCode.length, areaCode.length + 3)}-${national.slice(areaCode.length + 3)}`;
        }
        return `${areaCode} ${national.slice(areaCode.length, areaCode.length + 3)} ${national.slice(areaCode.length + 3)}`;
    }

    return profile === 'batch3'
        ? `(${areaCode})${national.slice(areaCode.length, areaCode.length + 3)}-${national.slice(areaCode.length + 3)}`
        : `(${areaCode}) ${national.slice(areaCode.length, areaCode.length + 3)}-${national.slice(areaCode.length + 3)}`;
}

function goalValue(rng) {
    const value = rng();
    if (value < 0.18) return 0;
    if (value < 0.45) return 1;
    if (value < 0.70) return 2;
    if (value < 0.88) return 3;
    if (value < 0.97) return 4;
    return 5;
}

function yellowCardValue(rng) {
    const value = rng();
    if (value < 0.10) return 0;
    if (value < 0.35) return 1;
    if (value < 0.65) return 2;
    if (value < 0.85) return 3;
    if (value < 0.96) return 4;
    return 5;
}

function redCardValue(rng) {
    const value = rng();
    if (value < 0.82) return 0;
    if (value < 0.97) return 1;
    return 2;
}

function generatePrediction(rng) {
    const goalsA = goalValue(rng);
    const goalsB = goalValue(rng);

    return {
        predicted_goals_team_a: goalsA,
        predicted_goals_team_b: goalsB,
        predicted_yellow_cards_team_a: yellowCardValue(rng),
        predicted_yellow_cards_team_b: yellowCardValue(rng),
        predicted_red_cards_team_a: redCardValue(rng),
        predicted_red_cards_team_b: redCardValue(rng),
    };
}

function generateCandidate(rng, index, batchTag, profile, registries) {
    const firstName = profile === 'batch3'
        ? pickFirstNameWithSpread(rng, registries.firstNameUsage, 2)
        : pick(rng, FIRST_NAMES);
    const lastName = profile === 'batch3'
        ? pickLastNameWithSpread(rng, registries.lastNameUsage, 1)
        : pick(rng, LAST_NAMES);
    const secondLastName = rng() < (profile === 'batch3' ? 0.28 : 0.12)
        ? (profile === 'batch3'
            ? pickLastNameWithSpread(rng, registries.lastNameUsage, 2)
            : pick(rng, LAST_NAMES))
        : '';
    const school = pick(rng, SCHOOLS);
    const grade = pick(rng, GRADES);
    const locality = pick(rng, LOCALITIES);
    const domain = profile === 'batch3'
        ? pick(rng, ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.ar'])
        : DEFAULTS.domains[index % DEFAULTS.domains.length];

    const lastNameFull = secondLastName ? `${lastName} ${secondLastName}` : lastName;
    const localPart = buildEmailLocalPart(rng, firstName, lastName, secondLastName, index, profile);
    const email = `${localPart}@${domain}`;

    return {
        firstName,
        lastName: lastNameFull,
        email,
        phone: generatePhone(rng, profile),
        extraData: {
            colegio: school,
            grado_ano: grade,
            localidad: locality,
        },
    };
}

async function loadContext(options) {
    const company = await prisma.company.findFirst({
        where: { slug: options.companySlug },
        include: {
            company_areas: {
                where: { is_active: true },
                orderBy: { created_at: 'asc' },
            },
            prodes: {
                where: { is_active: true },
                include: {
                    competition: true,
                },
                orderBy: { created_at: 'desc' },
            },
        },
    });

    if (!company) {
        throw new Error(`Empresa no encontrada: ${options.companySlug}`);
    }

    if (company.company_areas.length === 0) {
        throw new Error(`La empresa ${company.name} no tiene areas activas`);
    }

    const prode = options.prodeId
        ? company.prodes.find((item) => item.id === options.prodeId)
        : company.prodes[0];

    if (!prode) {
        throw new Error(`La empresa ${company.name} no tiene prodes activos`);
    }

    const matches = await prisma.match.findMany({
        where: {
            competition_id: prode.competition_id,
            status: 'scheduled',
            match_date: {
                gt: new Date(),
            },
        },
        orderBy: {
            match_date: 'asc',
        },
    });

    if (matches.length === 0) {
        throw new Error(`El prode ${prode.name} no tiene partidos futuros disponibles para predecir`);
    }

    return {
        company,
        area: company.company_areas[0],
        prode,
        matches,
    };
}

async function existingEmailSet(batchTag) {
    const scopedUsers = await prisma.user.findMany({
        where: {
            employee: {
                company: {
                    slug: DEFAULTS.companySlug,
                },
            },
        },
        select: {
            email: true,
        },
    });

    const batchUsers = scopedUsers.filter((item) => item.email.toLowerCase().includes(batchTag.toLowerCase()));
    return {
        companyEmails: new Set(scopedUsers.map((item) => item.email.toLowerCase())),
        batchEmails: new Set(batchUsers.map((item) => item.email.toLowerCase())),
    };
}

async function createSimulationUser(context, candidate, passwordHash, rng) {
    const joinedAt = new Date(Date.now() - Math.floor(rng() * 10 * 24 * 60 * 60 * 1000));

    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: candidate.email,
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
                company_id: context.company.id,
                company_area_id: context.area.id,
                first_name: candidate.firstName,
                last_name: candidate.lastName,
                phone: candidate.phone,
                extra_data: candidate.extraData,
            },
        });

        const participant = await tx.prodeParticipant.create({
            data: {
                prode_id: context.prode.id,
                employee_id: employee.id,
                joined_at: joinedAt,
            },
        });

        const predictions = context.matches.map((match) => {
            const prediction = generatePrediction(rng);
            return {
                prode_participant_id: participant.id,
                match_id: match.id,
                ...prediction,
                locked_at: null,
                created_at: joinedAt,
            };
        });

        await tx.prediction.createMany({
            data: predictions,
        });

        return {
            userId: user.id,
            employeeId: employee.id,
            participantId: participant.id,
            predictionCount: predictions.length,
        };
    });
}

function ensureLogDir() {
    fs.mkdirSync(DEFAULTS.logDir, { recursive: true });
}

function buildTimestamp() {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        '-',
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
    ].join('');
}

function writeLogs(context, options, summary, results) {
    ensureLogDir();
    const timestamp = buildTimestamp();
    const base = `${timestamp}-${context.company.slug}-simulation`;
    const txtPath = path.join(DEFAULTS.logDir, `${base}.txt`);
    const jsonPath = path.join(DEFAULTS.logDir, `${base}.json`);
    const emailsPath = path.join(DEFAULTS.logDir, `${base}-emails.txt`);
    const maskedPassword = `${'*'.repeat(Math.max(options.password.length - 4, 0))}${options.password.slice(-4)}`;

    const lines = [
        `Empresa: ${context.company.name} (${context.company.slug})`,
        `Area: ${context.area.name} (${context.area.id})`,
        `Prode: ${context.prode.name} (${context.prode.id})`,
        `Competencia: ${context.prode.competition.name}`,
        `Partidos futuros con prediccion: ${context.matches.length}`,
        `Dry run: ${options.dryRun ? 'si' : 'no'}`,
        `Count objetivo: ${options.targetCount}`,
        `Batch tag: ${options.batchTag}`,
        `Seed: ${options.seed}`,
        `Profile: ${options.profile}`,
        `Password: ${maskedPassword}`,
        '',
        'Resumen:',
        `- requested: ${summary.requested}`,
        `- created: ${summary.created}`,
        `- ready_in_dry_run: ${summary.readyInDryRun}`,
        `- skipped_existing_email: ${summary.skippedExistingEmail}`,
        `- errors: ${summary.errors}`,
        `- total_predictions_created: ${summary.totalPredictionsCreated}`,
        '',
        'Detalle:',
    ];

    if (results.length === 0) {
        lines.push('- sin resultados');
    } else {
        results.forEach((item) => {
            lines.push(`- ${item.status} | ${item.email} | ${item.firstName} ${item.lastName} | ${item.reason || 'ok'}`);
        });
    }

    fs.writeFileSync(txtPath, lines.join('\n'), 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        company: {
            id: context.company.id,
            slug: context.company.slug,
            name: context.company.name,
        },
        area: {
            id: context.area.id,
            name: context.area.name,
        },
        prode: {
            id: context.prode.id,
            name: context.prode.name,
            competition: context.prode.competition.name,
        },
        options: {
            dryRun: options.dryRun,
            count: options.targetCount,
            seed: options.seed,
            batchTag: options.batchTag,
            profile: options.profile,
            passwordMasked: maskedPassword,
        },
        summary,
        results,
    }, null, 2), 'utf8');
    fs.writeFileSync(
        emailsPath,
        results.map((item) => `${item.status}\t${item.email}`).join('\n'),
        'utf8',
    );

    return { txtPath, jsonPath, emailsPath };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    if (!Number.isInteger(options.targetCount) || options.targetCount <= 0) {
        throw new Error('El parametro --count debe ser un entero positivo');
    }

    const rng = createRng(options.seed);
    const context = await loadContext(options);
    const existingEmails = await existingEmailSet(options.batchTag);
    const passwordHash = options.dryRun ? null : await bcrypt.hash(options.password, 10);

    const summary = {
        requested: options.targetCount,
        created: 0,
        readyInDryRun: 0,
        skippedExistingEmail: 0,
        errors: 0,
        totalPredictionsCreated: 0,
    };

    const results = [];
    const firstNameUsageMap = new Map();
    const lastNameUsageMap = new Map();
    let generatedIndex = 0;
    let safety = 0;
    const maxAttempts = options.targetCount * 20;

    while ((options.dryRun ? summary.readyInDryRun : summary.created) < options.targetCount) {
        if (safety >= maxAttempts) {
            throw new Error(`No se pudo completar la generacion tras ${maxAttempts} intentos`);
        }

        const candidate = generateCandidate(rng, generatedIndex, options.batchTag, options.profile, {
            firstNameUsage: firstNameUsageMap,
            lastNameUsage: lastNameUsageMap,
        });
        generatedIndex += 1;
        safety += 1;

        if (existingEmails.companyEmails.has(candidate.email.toLowerCase())) {
            summary.skippedExistingEmail += 1;
            results.push({
                status: 'skipped_existing_email',
                email: candidate.email,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                reason: 'El email ya existe en recrear',
            });
            continue;
        }

        existingEmails.companyEmails.add(candidate.email.toLowerCase());
        existingEmails.batchEmails.add(candidate.email.toLowerCase());

        if (options.dryRun) {
            summary.readyInDryRun += 1;
            summary.totalPredictionsCreated += context.matches.length;
            results.push({
                status: 'dry_run_ready',
                email: candidate.email,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                reason: `Listo para crear con ${context.matches.length} predicciones`,
                extraData: candidate.extraData,
            });
            continue;
        }

        try {
            const created = await createSimulationUser(context, candidate, passwordHash, rng);
            summary.created += 1;
            summary.totalPredictionsCreated += created.predictionCount;
            results.push({
                status: 'created',
                email: candidate.email,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                reason: '',
                ids: created,
                extraData: candidate.extraData,
            });
            console.log(`OK ${summary.created}/${options.targetCount}: ${candidate.email}`);
        } catch (error) {
            summary.errors += 1;
            results.push({
                status: 'error',
                email: candidate.email,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                reason: error.message || 'Error desconocido',
                extraData: candidate.extraData,
            });
            console.error(`ERROR ${candidate.email}: ${error.message}`);
        }
    }

    const logs = writeLogs(context, options, summary, results);

    console.log('\nResumen final:');
    console.log(summary);
    console.log(`Log resumen: ${logs.txtPath}`);
    console.log(`Log detalle: ${logs.jsonPath}`);
    console.log(`Log emails: ${logs.emailsPath}`);
}

main()
    .catch((error) => {
        console.error('\nFallo el script de simulacion:', error.message);
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
