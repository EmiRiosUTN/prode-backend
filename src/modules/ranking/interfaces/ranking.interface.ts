export interface IndividualRankingEntry {
    position: number;
    employeeId: string;
    employeeName: string;
    areaName: string;
    totalPoints: number;
    predictionsCount: number;
}

export interface AreaRankingEntry {
    position: number;
    areaId: string;
    areaName: string;
    totalPoints: number;
    participantsCount: number;
    topEmployees: {
        employeeId: string;
        employeeName: string;
        totalPoints: number;
    }[];
}

export interface RankingMetadata {
    prodeId: string;
    prodeName: string;
    totalParticipants: number;
    lastUpdated: Date;
    isCached: boolean;
}
