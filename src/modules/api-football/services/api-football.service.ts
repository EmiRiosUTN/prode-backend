import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiFootballFixture {
    fixture: {
        id: number;
        referee: string | null;
        timezone: string;
        date: string;
        timestamp: number;
        venue: {
            id: number | null;
            name: string | null;
            city: string | null;
        };
        status: {
            long: string;
            short: string;
            elapsed: number | null;
        };
    };
    league: {
        id: number;
        name: string;
        country: string;
        logo: string;
        flag: string;
        season: number;
        round: string;
    };
    teams: {
        home: {
            id: number;
            name: string;
            logo: string;
            winner: boolean | null;
        };
        away: {
            id: number;
            name: string;
            logo: string;
            winner: boolean | null;
        };
    };
    goals: {
        home: number | null;
        away: number | null;
    };
    score: {
        halftime: { home: number | null; away: number | null };
        fulltime: { home: number | null; away: number | null };
        extratime: { home: number | null; away: number | null };
        penalty: { home: number | null; away: number | null };
    };
}

export interface ApiFootballStatistic {
    type: string;
    value: number | string | null;
}

export interface ApiFootballTeamStatistics {
    team: {
        id: number;
        name: string;
        logo: string;
    };
    statistics: ApiFootballStatistic[];
}

export interface ApiFootballResponse<T> {
    get: string;
    parameters: Record<string, string>;
    errors: Record<string, string> | any[];
    results: number;
    paging: {
        current: number;
        total: number;
    };
    response: T[];
}

export interface ApiFootballEvent {
    time: { elapsed: number; extra: number | null };
    team: { id: number; name: string; logo: string };
    player: { id: number; name: string };
    assist: { id: number | null; name: string | null };
    type: string;       // "Goal", "Card", "subst", "Var"
    detail: string;     // "Normal Goal", "Yellow Card", "Red Card", etc.
    comments: string | null;
}

@Injectable()
export class ApiFootballService {
    private readonly logger = new Logger(ApiFootballService.name);
    private readonly baseUrl = 'https://v3.football.api-sports.io';
    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('API_KEY_FOTBALL') || '';
        if (!this.apiKey) {
            this.logger.warn('API_KEY_FOTBALL is not configured in .env');
        }
    }

    private async makeRequest<T>(endpoint: string, params: Record<string, string | number>): Promise<ApiFootballResponse<T>> {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, String(value));
        });

        this.logger.log(`API-Football request: GET ${url.toString()}`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'x-apisports-key': this.apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as ApiFootballResponse<T>;

        // Check for API-level errors
        const errors = data.errors;
        if (errors && !Array.isArray(errors) && Object.keys(errors).length > 0) {
            throw new Error(`API-Football errors: ${JSON.stringify(errors)}`);
        }

        this.logger.log(`API-Football response: ${data.results} results`);
        return data;
    }

    /**
     * Fetch all fixtures for a given league and season.
     * GET /fixtures?league={id}&season={season}
     */
    async fetchFixtures(leagueId: number, season: number): Promise<ApiFootballFixture[]> {
        const data = await this.makeRequest<ApiFootballFixture>('/fixtures', {
            league: leagueId,
            season: season,
        });
        return data.response;
    }

    /**
     * Fetch fixture statistics (includes Yellow Cards, Red Cards per team).
     * GET /fixtures/statistics?fixture={id}
     */
    async fetchFixtureStatistics(fixtureId: number): Promise<ApiFootballTeamStatistics[]> {
        const data = await this.makeRequest<ApiFootballTeamStatistics>('/fixtures/statistics', {
            fixture: fixtureId,
        });
        return data.response;
    }

    /**
     * Fetch fixture events (goals, cards with player names).
     * GET /fixtures/events?fixture={id}
     */
    async fetchFixtureEvents(fixtureId: number): Promise<ApiFootballEvent[]> {
        const data = await this.makeRequest<ApiFootballEvent>('/fixtures/events', {
            fixture: fixtureId,
        });
        return data.response;
    }

    /**
     * Check API account status (remaining requests, etc.)
     * GET /status
     */
    async getStatus(): Promise<any> {
        const data = await this.makeRequest<any>('/status', {});
        return data.response;
    }
}
