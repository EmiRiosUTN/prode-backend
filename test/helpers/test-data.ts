/**
 * Data factories para crear datos de prueba consistentes
 */

export class TestData {
    static company(override?: Partial<{
        name: string;
        slug: string;
        adminEmail: string;
        adminPassword: string;
    }>) {
        const timestamp = Date.now();
        return {
            name: override?.name || `Test Company ${timestamp}`,
            slug: override?.slug || `test-${timestamp}`,
            adminEmail: override?.adminEmail || `admin-${timestamp}@test.com`,
            adminPassword: override?.adminPassword || 'Admin123!Test',
        };
    }

    static employee(companySlug: string, areaId: string, index: number) {
        return {
            email: `employee${index}@${companySlug}.com`,
            password: 'Employee123!',
            firstName: `Employee${index}`,
            lastName: 'Test',
            companyAreaId: areaId,
        };
    }

    static competition(override?: Partial<{
        name: string;
        startDate: string;
        endDate: string;
    }>) {
        return {
            name: override?.name || 'Test Competition',
            startDate: override?.startDate || new Date().toISOString(),
            endDate: override?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
    }

    static team(competitionId: string, name: string) {
        return {
            competitionId,
            name,
            shortName: name.substring(0, 3).toUpperCase(),
            flagUrl: `https://flagcdn.com/w320/${name.toLowerCase()}.png`,
        };
    }

    static match(data: {
        competitionId: string;
        teamAId: string;
        teamBId: string;
        hoursFromNow?: number;
        stage?: string;
    }) {
        const matchDate = new Date(Date.now() + (data.hoursFromNow || 24) * 60 * 60 * 1000);
        return {
            competitionId: data.competitionId,
            teamAId: data.teamAId,
            teamBId: data.teamBId,
            matchDate: matchDate.toISOString(),
            stage: data.stage || 'Group Stage',
            location: 'Test Stadium',
        };
    }

    static prode(competitionId: string, variableIds: string[]) {
        return {
            competitionId,
            name: 'Test Prode',
            description: 'Test prode for E2E testing',
            participationMode: 'both' as const,
            variableConfigs: variableIds.map(id => ({
                variableId: id,
                points: 10,
                isActive: true,
            })),
            rankingConfig: {
                showIndividualGeneral: true,
                showIndividualByArea: true,
                showAreaRanking: true,
                areaRankingCalculation: 'average' as const,
            },
        };
    }

    static prediction(matchId: string, override?: Partial<{
        predictedGoalsTeamA: number;
        predictedGoalsTeamB: number;
        predictedYellowCardsTeamA: number;
        predictedYellowCardsTeamB: number;
        predictedRedCardsTeamA: number;
        predictedRedCardsTeamB: number;
    }>) {
        return {
            matchId,
            predictedGoalsTeamA: override?.predictedGoalsTeamA ?? 2,
            predictedGoalsTeamB: override?.predictedGoalsTeamB ?? 1,
            predictedYellowCardsTeamA: override?.predictedYellowCardsTeamA ?? 2,
            predictedYellowCardsTeamB: override?.predictedYellowCardsTeamB ?? 1,
            predictedRedCardsTeamA: override?.predictedRedCardsTeamA ?? 0,
            predictedRedCardsTeamB: override?.predictedRedCardsTeamB ?? 0,
        };
    }

    static matchResult(override?: Partial<{
        goalsTeamA: number;
        goalsTeamB: number;
        yellowCardsTeamA: number;
        yellowCardsTeamB: number;
        redCardsTeamA: number;
        redCardsTeamB: number;
    }>) {
        return {
            goalsTeamA: override?.goalsTeamA ?? 2,
            goalsTeamB: override?.goalsTeamB ?? 1,
            yellowCardsTeamA: override?.yellowCardsTeamA ?? 2,
            yellowCardsTeamB: override?.yellowCardsTeamB ?? 1,
            redCardsTeamA: override?.redCardsTeamA ?? 0,
            redCardsTeamB: override?.redCardsTeamB ?? 0,
        };
    }

    static scorer(playerName: string, teamId: string, goals: number = 1) {
        return {
            playerFullName: playerName,
            teamId,
            goalsCount: goals,
        };
    }
}
