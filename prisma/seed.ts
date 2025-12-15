import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // 1. Verificar admin global
  console.log('1. Checking admin global...');
  const adminGlobal = await prisma.user.findFirst({
    where: { role: 'admin_global' },
  });

  if (!adminGlobal) {
    console.log('   Creating admin global...');
    await prisma.user.create({
      data: {
        email: 'admin@mundialpro.com',
        password_hash: await bcrypt.hash('Admin123!MundialPro', 10),
        role: 'admin_global',
      },
    });
    console.log('   ✅ Admin global created');
  } else {
    console.log('   ✅ Admin global already exists');
  }

  // 2. Crear competición
  console.log('\n2. Creating competition...');
  const competition = await prisma.competition.upsert({
    where: { slug: 'mundial-2026' },
    update: {},
    create: {
      name: 'Mundial 2026',
      slug: 'mundial-2026',
      start_date: new Date('2026-06-11'),
      end_date: new Date('2026-07-19'),
    },
  });
  console.log(`   ✅ Competition: ${competition.name}`);

  // 3. Crear equipos
  console.log('\n3. Creating teams...');
  const teamNames = [
    'Argentina', 'Brasil', 'Francia', 'Alemania',
    'España', 'Inglaterra', 'Italia', 'Portugal',
  ];

  const teams: any[] = [];
  for (const name of teamNames) {
    const team = await prisma.team.upsert({
      where: {
        code: name.toLowerCase(),
      },
      update: {},
      create: {
        name,
        code: name.toLowerCase(),
        flag_url: `https://flagcdn.com/w320/${name.toLowerCase()}.png`,
      },
    });
    teams.push(team);
  }
  console.log(`   ✅ ${teams.length} teams created`);

  // 4. Crear partidos
  console.log('\n4. Creating matches...');
  const matches: any[] = [];
  const baseDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana

  for (let i = 0; i < 4; i++) {
    const matchDate = new Date(baseDate.getTime() + i * 2 * 60 * 60 * 1000);
    const match = await prisma.match.create({
      data: {
        competition_id: competition.id,
        team_a_id: teams[i * 2].id,
        team_b_id: teams[i * 2 + 1].id,
        match_date: matchDate,
        stage: 'Group Stage',
        location: 'Stadium ' + (i + 1),
        status: 'scheduled',
      },
    });
    matches.push(match);
  }
  console.log(`   ✅ ${matches.length} matches created`);

  // 5. Crear variables de predicción
  console.log('\n5. Creating prediction variables...');
  const variables = [
    { code: 'exact_result', name: 'Resultado Exacto', description: 'Acertar el resultado exacto', variable_type: 'numeric' },
    { code: 'partial_result', name: 'Ganador', description: 'Acertar solo el ganador', variable_type: 'categorical' },
    { code: 'goal_difference', name: 'Diferencia de Goles', description: 'Acertar la diferencia de goles', variable_type: 'numeric' },
    { code: 'yellow_cards', name: 'Tarjetas Amarillas', description: 'Acertar tarjetas amarillas', variable_type: 'numeric' },
    { code: 'red_cards', name: 'Tarjetas Rojas', description: 'Acertar tarjetas rojas', variable_type: 'numeric' },
    { code: 'scorers', name: 'Goleadores', description: 'Acertar goleadores', variable_type: 'text' },
  ];

  const createdVariables: any[] = [];
  for (const variable of variables) {
    const created = await prisma.predictionVariable.upsert({
      where: { code: variable.code },
      update: {},
      create: variable,
    });
    createdVariables.push(created);
  }
  console.log(`   ✅ ${createdVariables.length} prediction variables created`);

  // 6. Crear empresa de ejemplo
  console.log('\n6. Creating example company...');
  const companyAdminPassword = 'Admin123!';
  const companyAdminHash = await bcrypt.hash(companyAdminPassword, 10);

  const companyUser = await prisma.user.upsert({
    where: { email: 'admin@techcorp.com' },
    update: {},
    create: {
      email: 'admin@techcorp.com',
      password_hash: companyAdminHash,
      role: 'empresa_admin',
    },
  });

  const company = await prisma.company.upsert({
    where: { slug: 'techcorp' },
    update: {},
    create: {
      name: 'Tech Corp',
      slug: 'techcorp',
      admin_user_id: companyUser.id,
    },
  });
  console.log(`   ✅ Company: ${company.name}`);

  // 7. Crear áreas
  console.log('\n7. Creating company areas...');
  const areaNames = ['Sistemas', 'Marketing', 'Ventas', 'RRHH'];
  const areas: any[] = [];

  for (const name of areaNames) {
    const area = await prisma.companyArea.upsert({
      where: {
        company_id_name: {
          company_id: company.id,
          name,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        name,
      },
    });
    areas.push(area);
  }
  console.log(`   ✅ ${areas.length} areas created`);

  // 8. Crear empleados
  console.log('\n8. Creating employees...');
  const employeePassword = 'Employee123!';
  const employeeHash = await bcrypt.hash(employeePassword, 10);

  for (let i = 0; i < 12; i++) {
    const areaIndex = i % areas.length;
    const employeeNum = Math.floor(i / areas.length) + 1;

    await prisma.user.upsert({
      where: { email: `employee${i + 1}@techcorp.com` },
      update: {},
      create: {
        email: `employee${i + 1}@techcorp.com`,
        password_hash: employeeHash,
        role: 'empleado',
        employee: {
          create: {
            first_name: `Employee${employeeNum}`,
            last_name: areaNames[areaIndex],
            company_id: company.id,
            company_area_id: areas[areaIndex].id,
          },
        },
      },
    });
  }
  console.log('   ✅ 12 employees created');

  // 9. Crear prode
  console.log('\n9. Creating prode...');

  // Buscar si ya existe un prode para esta empresa y competición
  const existingProde = await prisma.prode.findFirst({
    where: {
      company_id: company.id,
      competition_id: competition.id,
    },
  });

  const prode = existingProde || await prisma.prode.create({
    data: {
      company_id: company.id,
      competition_id: competition.id,
      name: 'Prode Mundial 2026',
      description: 'Prode oficial de Tech Corp para el Mundial 2026',
      participation_mode: 'both',
      is_active: true,
    },
  });
  console.log(`   ✅ Prode: ${prode.name}`);

  // 10. Configurar variables del prode
  console.log('\n10. Configuring prode variables...');
  for (const variable of createdVariables.slice(0, 4)) {
    await prisma.prodeVariableConfig.upsert({
      where: {
        prode_id_prediction_variable_id: {
          prode_id: prode.id,
          prediction_variable_id: variable.id,
        },
      },
      update: {},
      create: {
        prode_id: prode.id,
        prediction_variable_id: variable.id,
        points: 10,
        is_active: true,
      },
    });
  }
  console.log('   ✅ Prode variables configured');

  // 11. Configurar ranking
  console.log('\n11. Configuring ranking...');
  await prisma.prodeRankingConfig.upsert({
    where: { prode_id: prode.id },
    update: {},
    create: {
      prode_id: prode.id,
      show_individual_general: true,
      show_individual_by_area: true,
      show_area_ranking: true,
      area_ranking_calculation: 'average',
    },
  });
  console.log('   ✅ Ranking configured');

  console.log('\n✅ Database seeded successfully!\n');
  console.log('📋 Test Credentials:');
  console.log('   Admin Global:');
  console.log('     Email: admin@mundialpro.com');
  console.log('     Password: Admin123!MundialPro\n');
  console.log('   Company Admin (Tech Corp):');
  console.log('     Email: admin@techcorp.com');
  console.log('     Password: Admin123!\n');
  console.log('   Employees:');
  console.log('     Email: employee1@techcorp.com (to employee12@techcorp.com)');
  console.log('     Password: Employee123!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });