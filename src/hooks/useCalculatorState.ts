import { useMemo, useState } from 'react';
import { nanoid } from '../utils/nanoid';
import type {
  CalculatorState,
  CellMatrix,
  SetColumn,
  WidthRow
} from '../types/calculator';

const INITIAL_ROW: WidthRow = {
  id: nanoid(),
  label: 'Trim 1',
  width: '',
  requiredRolls: ''
};

const INITIAL_SET: SetColumn = {
  id: nanoid(),
  label: 'Set 1',
  multiplier: 1
};

function createInitialCells(rows: WidthRow[], sets: SetColumn[]): CellMatrix {
  return rows.reduce<CellMatrix>((matrix, row) => {
    matrix[row.id] = sets.reduce<Record<string, number | ''>>((rowMap, set) => {
      rowMap[set.id] = '';
      return rowMap;
    }, {});
    return matrix;
  }, {});
}

export function useCalculatorState() {
  const [state, setState] = useState<CalculatorState>(() => {
    const rows = [INITIAL_ROW];
    const sets = [INITIAL_SET];
    return {
      millId: null,
      substance: '',
      length: '',
      rows,
      sets,
      cells: createInitialCells(rows, sets)
    };
  });

  const setMillId = (millId: string | null) => setState((prev: CalculatorState) => ({ ...prev, millId }));
  const setSubstance = (substance: number | '') =>
    setState((prev: CalculatorState) => ({ ...prev, substance }));
  const setLength = (length: number | '') => setState((prev: CalculatorState) => ({ ...prev, length }));

  const addRow = () =>
    setState((prev: CalculatorState) => {
      const row: WidthRow = {
        id: nanoid(),
        label: `Trim ${prev.rows.length + 1}`,
        width: '',
        requiredRolls: ''
      };
      const rows = [...prev.rows, row];
      const cells = {
        ...prev.cells,
        [row.id]: prev.sets.reduce<Record<string, number | ''>>((map: Record<string, number | ''>, set: SetColumn) => {
          const next = { ...map };
          next[set.id] = '';
          return next;
        }, {})
      };
      return { ...prev, rows, cells };
    });

  const removeRow = (rowId: string) =>
    setState((prev: CalculatorState) => {
      const rows = prev.rows.filter((row: WidthRow) => row.id !== rowId);
      const cells = { ...prev.cells };
      delete cells[rowId];
      return { ...prev, rows, cells };
    });

  const updateRow = (rowId: string, patch: Partial<WidthRow>) =>
    setState((prev: CalculatorState) => ({
      ...prev,
      rows: prev.rows.map((row: WidthRow) => (row.id === rowId ? { ...row, ...patch } : row))
    }));

  const addSet = () =>
    setState((prev: CalculatorState) => {
      const set: SetColumn = {
        id: nanoid(),
        label: `Set ${prev.sets.length + 1}`,
        multiplier: 1
      };
      const sets = [...prev.sets, set];
      const cellsEntries = Object.entries(prev.cells).map(([rowId, rowMap]): [
        string,
        Record<string, number | ''>
      ] => {
        const typedRowMap = rowMap as Record<string, number | ''>;
        return [rowId, { ...typedRowMap, [set.id]: '' as number | '' }];
      });
      const cells = Object.fromEntries(cellsEntries) as CellMatrix;
      return { ...prev, sets, cells };
    });

  const removeSet = (setId: string) =>
    setState((prev: CalculatorState) => {
      const sets = prev.sets.filter((set: SetColumn) => set.id !== setId);
      const cellsEntries = Object.entries(prev.cells).map(([rowId, rowMap]): [
        string,
        Record<string, number | ''>
      ] => {
        const typedRowMap = rowMap as Record<string, number | ''>;
        const { [setId]: _removed, ...rest } = typedRowMap;
        return [rowId, rest];
      });
      const cells = Object.fromEntries(cellsEntries) as CellMatrix;
      return { ...prev, sets, cells };
    });

  const updateSet = (setId: string, patch: Partial<SetColumn>) =>
    setState((prev: CalculatorState) => ({
      ...prev,
      sets: prev.sets.map((set: SetColumn) => (set.id === setId ? { ...set, ...patch } : set))
    }));

  const updateCell = (rowId: string, setId: string, value: number | '') =>
    setState((prev: CalculatorState) => ({
      ...prev,
      cells: {
        ...prev.cells,
        [rowId]: {
          ...prev.cells[rowId],
          [setId]: value
        }
      }
    }));

  const resetState = (next: CalculatorState) => {
    setState({
      ...next,
      cells: ensureMatrixIntegrity(next.rows, next.sets, next.cells)
    });
  };

  const totals = useMemo(() => computeTotals(state), [state]);

  return {
    state,
    totals,
    actions: {
      setMillId,
      setSubstance,
      setLength,
      addRow,
      removeRow,
      updateRow,
      addSet,
      removeSet,
      updateSet,
      updateCell,
      resetState
    }
  };
}

function ensureMatrixIntegrity(rows: WidthRow[], sets: SetColumn[], matrix: CellMatrix): CellMatrix {
  const safeMatrix: CellMatrix = {};
  for (const row of rows) {
    const existingRow = matrix[row.id] ?? {};
    safeMatrix[row.id] = {};
    for (const set of sets) {
      const raw = existingRow[set.id];
      safeMatrix[row.id][set.id] = typeof raw === 'number' || raw === '' ? raw : '';
    }
  }
  return safeMatrix;
}

function computeTotals(state: CalculatorState) {
  const { rows, sets, cells, substance, length } = state;
  const deckleMap = sets.reduce<Record<string, number>>((map, set) => {
    const totalWidth = rows.reduce((sum, row) => {
      const rolls = Number(cells[row.id]?.[set.id] ?? 0);
      const width = Number(row.width ?? 0);
      return sum + rolls * width;
    }, 0);
    map[set.id] = totalWidth;
    return map;
  }, {});

  const perRow = rows.map((row) => {
    const producedRolls = sets.reduce((sum, set) => {
      const rolls = Number(cells[row.id]?.[set.id] ?? 0);
      const multiplier = Number(set.multiplier ?? 0);
      return sum + rolls * multiplier;
    }, 0);

    const requiredRolls = Number(row.requiredRolls ?? 0);
    const widthMm = Number(row.width ?? 0);
    const lengthMeters = Number(length ?? 0);
    const gsm = Number(substance ?? 0);
    const widthMeters = widthMm / 1000;
    const producedTons = producedRolls * widthMeters * lengthMeters * gsm / 1_000_000;

    return {
      rowId: row.id,
      producedRolls,
      requiredRolls,
      difference: producedRolls - requiredRolls,
      producedTons
    };
  });

  const perSet = sets.map((set) => {
    const totalWidth = deckleMap[set.id] ?? 0;
    const multiplier = Number(set.multiplier ?? 0);
    const totalWeightTons = rows.reduce((sum, row) => {
      const rolls = Number(cells[row.id]?.[set.id] ?? 0);
      const widthMm = Number(row.width ?? 0);
      const lengthMeters = Number(length ?? 0);
      const gsm = Number(substance ?? 0);
      const widthMeters = widthMm / 1000;
      const weight = rolls * multiplier * widthMeters * lengthMeters * gsm / 1_000_000;
      return sum + weight;
    }, 0);

    return {
      setId: set.id,
      totalWidth,
      multiplier,
      totalWeightTons
    };
  });

  return { deckleMap, perRow, perSet };
}
