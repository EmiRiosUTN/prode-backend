
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const prodeId = '46994ce7-79f1-483b-89af-471a3de727d0';

    console.log(`Checking participants for Prode ID: ${prodeId}`);

    const prode = await prisma.prode.findUnique({
        where: { id: prodeId },
        include: { prode_ranking_config: true }
    });

    if (!prode) {
        console.error('Prode not found!');
        process.exit(1);
    }

    console.log('Prode:', prode.name);
    console.log('Ranking Config:', prode.prode_ranking_config);

    const participants = await prisma.prodeParticipant.findMany({
        where: { prode_id: prode.id },
        include: {
            employee: {
                include: {
                    company_area: true,
                    user: true
                }
            }
        }
    });

    console.log(`Found ${participants.length} participants:`);
    participants.forEach(p => {
        console.log(`- ${p.employee.first_name} ${p.employee.last_name} (Area: ${p.employee.company_area.name}, User: ${p.employee.user.email})`);
    });

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
