import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface MatchAnalysis {
    teamA_win_probability: number;
    teamB_win_probability: number;
    draw_probability: number;
    expected_yellow_cards: { min: number; max: number };
    expected_red_cards: { min: number; max: number };
    generated_at: Date;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private openai: OpenAI;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            this.logger.warn('OPENAI_API_KEY not configured. AI analysis will be unavailable.');
            return;
        }
        this.openai = new OpenAI({ apiKey });
    }

    async generateMatchAnalysis(
        teamAName: string,
        teamBName: string,
        matchDate: Date,
    ): Promise<MatchAnalysis> {
        if (!this.openai) {
            throw new Error('OpenAI API is not configured');
        }

        try {
            const prompt = `You are a football/soccer match analyst. Analyze the upcoming match between ${teamAName} and ${teamBName} scheduled for ${matchDate.toISOString()}.

Provide a concise analysis with the following probabilities and predictions:
1. Win probability for ${teamAName}
2. Win probability for ${teamBName}
3. Draw probability
4. Expected yellow cards range (min-max)
5. Expected red cards range (min-max)

IMPORTANT: Respond ONLY with a valid JSON object in this exact format, no additional text:
{
  "teamA_win_probability": <number 0-100>,
  "teamB_win_probability": <number 0-100>,
  "draw_probability": <number 0-100>,
  "expected_yellow_cards": { "min": <number>, "max": <number> },
  "expected_red_cards": { "min": <number>, "max": <number> }
}

Base your analysis on:
- Team historical performance
- Recent form
- Head-to-head records if known
- General football statistics

Ensure all win probabilities sum to 100.`;

            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a football match analyst that provides statistical predictions in JSON format.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 300,
                response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            const analysis = JSON.parse(content);

            // Validate and normalize probabilities
            const total = analysis.teamA_win_probability + analysis.teamB_win_probability + analysis.draw_probability;
            if (Math.abs(total - 100) > 1) {
                // Normalize if they don't sum to 100
                const factor = 100 / total;
                analysis.teamA_win_probability = Math.round(analysis.teamA_win_probability * factor);
                analysis.teamB_win_probability = Math.round(analysis.teamB_win_probability * factor);
                analysis.draw_probability = 100 - analysis.teamA_win_probability - analysis.teamB_win_probability;
            }

            return {
                ...analysis,
                generated_at: new Date(),
            };
        } catch (error) {
            this.logger.error(`Failed to generate match analysis: ${error.message}`, error.stack);
            throw new Error('Failed to generate AI analysis');
        }
    }
}
