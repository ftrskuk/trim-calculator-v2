import { supabase } from '../lib/supabaseClient';
import type { CalculationRecord, CalculatorState } from '../types/calculator';

const TABLE_NAME = 'calculations';

export async function saveCalculation(name: string, state: CalculatorState): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.from(TABLE_NAME).insert({
    name,
    state
  });

  if (error) {
    throw error;
  }
}

export async function fetchHistory(): Promise<CalculationRecord[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as CalculationRecord[];
}

export async function deleteCalculation(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
  if (error) {
    throw error;
  }
}
