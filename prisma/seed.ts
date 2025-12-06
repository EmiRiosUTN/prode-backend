import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // 1. Crear Admin Global
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'Admin123!MundialPro',
    10
  );

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'emiliano@pushandpullnow.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'emiliano@pushandpullnow.com',
      password_hash: adminPassword,
      role: UserRole.admin_global,
      is_active: true,
    },
  });

  console.log('✅ Admin Global creado:', adminUser.email);

  // 2. Crear Variables de Predicción
  const variables = [
    {
      code: 'exact_result',
      name: 'Resultado Exacto',
      description: 'Acertar el resultado exacto del partido',
      variable_type: 'match_result',
    },
    {
      code: 'winner_only',
      name: 'Solo Ganador/Empate',
      description: 'Acertar quién gana o si es empate',
      variable_type: 'match_result',
    },
    {
      code: 'team_a_goals',
      name: 'Goles Equipo A',
      description: 'Acertar cantidad exacta de goles del equipo A',
      variable_type: 'goals',
    },
    {
      code: 'team_b_goals',
      name: 'Goles Equipo B',
      description: 'Acertar cantidad exacta de goles del equipo B',
      variable_type: 'goals',
    },
    {
      code: 'total_goals',
      name: 'Total de Goles',
      description: 'Acertar el total de goles del partido',
      variable_type: 'goals',
    },
    {
      code: 'scorer',
      name: 'Goleador',
      description: 'Acertar jugador(es) que anota(n)',
      variable_type: 'scorer',
    },
    {
      code: 'red_cards',
      name: 'Tarjetas Rojas',
      description: 'Acertar si habrá tarjetas rojas',
      variable_type: 'cards',
    },
    {
      code: 'yellow_cards',
      name: 'Tarjetas Amarillas',
      description: 'Acertar cantidad de tarjetas amarillas',
      variable_type: 'cards',
    },
  ];

  for (const variable of variables) {
    await prisma.predictionVariable.upsert({
      where: { code: variable.code },
      update: {},
      create: variable,
    });
  }

  console.log('✅ Variables de predicción creadas:', variables.length);

  // 3. Crear equipos de ejemplo
  const teams = [
    { name: 'Argentina', code: 'ARG' },
    { name: 'Brasil', code: 'BRA' },
    { name: 'Uruguay', code: 'URU' },
    { name: 'Chile', code: 'CHI' },
    { name: 'Colombia', code: 'COL' },
    { name: 'Ecuador', code: 'ECU' },
    { name: 'Perú', code: 'PER' },
    { name: 'Paraguay', code: 'PAR' },
    { name: 'Venezuela', code: 'VEN' },
    { name: 'Bolivia', code: 'BOL' },
  ];

  for (const team of teams) {
    await prisma.team.upsert({
      where: { code: team.code },
      update: {},
      create: team,
    });
  }

  console.log('✅ Equipos creados:', teams.length);

  // 4. Crear competición de ejemplo
  const competition = await prisma.competition.upsert({
    where: { slug: 'copa-america-2025' },
    update: {},
    create: {
      name: 'Copa América 2025',
      slug: 'copa-america-2025',
      start_date: new Date('2025-06-01'),
      end_date: new Date('2025-07-15'),
      sport_type: 'futbol',
      is_active: true,
    },
  });

  console.log('✅ Competición creada:', competition.name);

  // 5. Crear empresa de ejemplo
  const companyAdminPassword = await bcrypt.hash('Company123!', 10);

  const companyAdminUser = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      password_hash: companyAdminPassword,
      role: UserRole.empresa_admin,
      is_active: true,
    },
  });

  const company = await prisma.company.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme',
      corporate_domain: 'acme.com',
      require_corporate_email: false,
      logo_url: 'https://via.placeholder.com/200x80?text=ACME',
      primary_color: '#1976d2',
      secondary_color: '#424242',
      admin_user_id: companyAdminUser.id,
      is_active: true,
    },
  });

  console.log('✅ Empresa de ejemplo creada:', company.name);

  // 6. Crear áreas de la empresa
  const areas = ['Sistemas', 'Ventas', 'Marketing', 'RRHH', 'Administración'];

  for (const areaName of areas) {
    await prisma.companyArea.upsert({
      where: {
        company_id_name: {
          company_id: company.id,
          name: areaName,
        },
      },
      update: {},
      create: {
        company_id: company.id,
        name: areaName,
        is_active: true,
      },
    });
  }

  console.log('✅ Áreas creadas:', areas.length);

  console.log('');
  console.log('🎉 Seed completado exitosamente!');
  console.log('');
  console.log('📊 Resumen:');
  console.log('   - Admin Global:', adminUser.email);
  console.log('   - Variables de predicción:', variables.length);
  console.log('   - Equipos:', teams.length);
  console.log('   - Competición:', competition.name);
  console.log('   - Empresa:', company.name, `(${company.slug})`);
  console.log('   - Áreas:', areas.length);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });