const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const company = await prisma.company.findFirst({ where: { slug: 'recrear' } });
  if (!company) {
    console.log('Company recrear not found');
    return;
  }
  
  // Find all employees of this company
  const employees = await prisma.employee.findMany({
    where: { company_id: company.id },
    include: { user: true }
  });
  
  console.log('Total employees found:', employees.length);
  
  const toDelete = employees.filter(e => e.user.role !== 'empresa_admin' && e.user.role !== 'admin_global');
  
  console.log('Employees to delete:', toDelete.length);
  for(const e of toDelete) {
     console.log('Deleting user:', e.user.id, e.user.email);
     await prisma.user.delete({ where: { id: e.user.id } });
  }
  console.log('Deleted successfully.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
