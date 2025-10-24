export interface Mill {
  id: string;
  name: string;
  deckle: number;
}

export interface WidthRow {
  id: string;
  label: string;
  width: number | '';
  requiredRolls: number | '';
}

export interface SetColumn {
  id: string;
  label: string;
  multiplier: number | '';
}

export type CellMatrix = Record<string, Record<string, number | ''>>;

export interface CalculatorState {
  millId: string | null;
  substance: number | '';
  length: number | '';
  rows: WidthRow[];
  sets: SetColumn[];
  cells: CellMatrix;
}

export interface CalculationRecord {
  id: string;
  name: string;
  created_at: string;
  state: CalculatorState;
}

export interface AiSuggestionResponse {
  sets: Array<{
    multiplier: number;
    rows: Array<{
      label: string;
      width: number;
      rolls: number;
    }>;
  }>;
}
