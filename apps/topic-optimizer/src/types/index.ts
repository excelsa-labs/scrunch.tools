import { ConstraintAxis } from '../engine/types';

export interface AppState {
  step: 'upload' | 'configure' | 'results';
  constraintAxis: ConstraintAxis;
  constraintValue: number;
  selectedTopicIdx: number;
}

export const CONSTRAINT_DEFAULTS: Record<ConstraintAxis, number> = {
  'coverage-floor': 0.95,
  'resilience-floor': 0.95,
  'budget': 50,
};
