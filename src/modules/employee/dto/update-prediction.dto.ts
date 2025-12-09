import { PartialType } from '@nestjs/mapped-types';
import { CreatePredictionDto } from './create-prediction.dto';
import { OmitType } from '@nestjs/mapped-types';

export class UpdatePredictionDto extends PartialType(
    OmitType(CreatePredictionDto, ['prodeId', 'matchId'] as const)
) { }