import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useCalculatorState } from './hooks/useCalculatorState';
import type { AiSuggestionResponse, CalculationRecord, Mill } from './types/calculator';
import { requestAiSuggestion } from './services/aiService';
import { deleteCalculation, fetchHistory, saveCalculation } from './services/historyService';
import { supabase } from './lib/supabaseClient';
import { nanoid } from './utils/nanoid';

const mills: Mill[] = [
  { id: 'han-deckle-5200', name: 'Han Paper — Deckle 5,200 mm', deckle: 5200 },
  { id: 'alpha-4800', name: 'Alpha Mill — Deckle 4,800 mm', deckle: 4800 },
  { id: 'seoul-4500', name: 'Seoul Fibers — Deckle 4,500 mm', deckle: 4500 }
];

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export default function App() {
  const {
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
  } = useCalculatorState();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<CalculationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const historyEnabled = Boolean(supabase);
  const selectedMill = useMemo(() => mills.find((mill) => mill.id === state.millId) ?? null, [state.millId]);

  useEffect(() => {
    if (!historyOpen || !historyEnabled) {
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    fetchHistory()
      .then((records) => {
        if (!cancelled) {
          setHistory(records);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error.message ?? 'Failed to load history');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [historyOpen, historyEnabled]);

  const handleSave = async () => {
    if (!historyEnabled) {
      setErrorMessage('Supabase 설정이 없어 저장할 수 없습니다. 환경 변수를 확인하세요.');
      return;
    }
    const name = window.prompt('저장할 작업의 이름을 입력하세요', '새 계산');
    if (!name) {
      return;
    }
    try {
      await saveCalculation(name.trim(), state);
      setHistoryOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save calculation';
      setErrorMessage(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('선택한 기록을 삭제할까요?')) {
      return;
    }
    try {
      await deleteCalculation(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete record';
      setErrorMessage(message);
    }
  };

  const handleLoad = (record: CalculationRecord) => {
    resetState(record.state);
    setHistoryOpen(false);
  };

  const handleAiFill = async () => {
    setAiLoading(true);
    try {
      const response = await requestAiSuggestion(state);
      applyAiSuggestion(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI suggestion failed';
      setErrorMessage(message);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = (response: AiSuggestionResponse) => {
    if (!response.sets?.length) {
      return;
    }
    const existingRows = [...state.rows];
    const rowMap = new Map(existingRows.map((row) => [row.label, row]));
    const sets = response.sets.map((set, index) => ({
      id: nanoid(),
      label: `AI Set ${index + 1}`,
      multiplier: set.multiplier
    }));

    for (const set of response.sets) {
      for (const row of set.rows) {
        if (!rowMap.has(row.label)) {
          const newRow = {
            id: nanoid(),
            label: row.label,
            width: row.width,
            requiredRolls: ''
          };
          existingRows.push(newRow);
          rowMap.set(row.label, newRow);
        }
      }
    }

    const cells = existingRows.reduce<Record<string, Record<string, number | ''>>>((matrix, row) => {
      matrix[row.id] = sets.reduce<Record<string, number | ''>>((rowMapCells, set, index) => {
        const suggestion = response.sets[index].rows.find((item) => item.label === row.label);
        rowMapCells[set.id] = suggestion ? suggestion.rolls : '';
        return rowMapCells;
      }, {});
      return matrix;
    }, {});

    resetState({
      ...state,
      rows: existingRows,
      sets,
      cells
    });
  };

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    const id = window.setTimeout(() => setErrorMessage(null), 4000);
    return () => window.clearTimeout(id);
  }, [errorMessage]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI 기반 초지기 트림 사이즈 계산기 v2.0</h1>
            <p className="text-sm text-slate-400">
              Deckle 제약을 고려한 최적 세트 조합 계산과 AI 자동 채움, Supabase 저장 기능을 제공합니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              disabled={!historyEnabled}
              className={clsx(
                'rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium transition',
                historyEnabled
                  ? 'text-slate-200 hover:border-slate-500 hover:text-white'
                  : 'cursor-not-allowed text-slate-600'
              )}
            >
              이전 기록 보기
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!historyEnabled}
              className={clsx(
                'rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition',
                historyEnabled
                  ? 'bg-brand-600 shadow-brand-600/20 hover:bg-brand-700'
                  : 'cursor-not-allowed bg-slate-700 text-slate-400 shadow-slate-900/20'
              )}
            >
              계산 저장
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">기본 정보 설정</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-slate-300">제지사 선택</span>
              <select
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-600 focus:outline-none"
                value={state.millId ?? ''}
                onChange={(event) => setMillId(event.target.value || null)}
              >
                <option value="">제지사를 선택하세요</option>
                {mills.map((mill) => (
                  <option key={mill.id} value={mill.id}>
                    {mill.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-slate-300">Deckle (mm)</span>
              <input
                readOnly
                value={selectedMill?.deckle ?? ''}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                placeholder="제지사를 선택하면 표시됩니다"
              />
            </label>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-300">평량 (g/m²)</span>
                <input
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-600 focus:outline-none"
                  type="number"
                  min={0}
                  value={state.substance ?? ''}
                  onChange={(event) => setSubstance(event.target.value ? Number(event.target.value) : '')}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-300">롤 길이 (m)</span>
                <input
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-600 focus:outline-none"
                  type="number"
                  min={0}
                  value={state.length ?? ''}
                  onChange={(event) => setLength(event.target.value ? Number(event.target.value) : '')}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold">세트 조합 구성</h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addRow}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-brand-600 hover:text-white"
              >
                지폭 추가
              </button>
              <button
                type="button"
                onClick={addSet}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-brand-600 hover:text-white"
              >
                세트 추가
              </button>
              <button
                type="button"
                onClick={handleAiFill}
                disabled={aiLoading}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {aiLoading ? 'AI 계산 중…' : 'AI로 채우기'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-300">지폭 이름</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-300">지폭 (mm)</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-300">필요 롤 수</th>
                  {state.sets.map((set) => (
                    <th key={set.id} className="min-w-[8rem] px-4 py-3 text-left font-medium text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <span>{set.label}</span>
                        <button
                          type="button"
                          className="text-xs text-slate-500 transition hover:text-red-400"
                          onClick={() => removeSet(set.id)}
                        >
                          삭제
                        </button>
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <span>Multiplier</span>
                        <input
                          className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-brand-600 focus:outline-none"
                          type="number"
                          min={0}
                          value={set.multiplier ?? ''}
                          onChange={(event) =>
                            updateSet(set.id, {
                              multiplier: event.target.value === '' ? '' : Number(event.target.value)
                            })
                          }
                        />
                      </label>
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {state.rows.map((row) => (
                  <tr key={row.id} className="bg-slate-950/60">
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-600 focus:outline-none"
                        value={row.label}
                        onChange={(event) => updateRow(row.id, { label: event.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-600 focus:outline-none"
                        type="number"
                        min={0}
                        value={row.width ?? ''}
                        onChange={(event) =>
                          updateRow(row.id, {
                            width: event.target.value === '' ? '' : Number(event.target.value)
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-600 focus:outline-none"
                        type="number"
                        min={0}
                        value={row.requiredRolls ?? ''}
                        onChange={(event) =>
                          updateRow(row.id, {
                            requiredRolls: event.target.value === '' ? '' : Number(event.target.value)
                          })
                        }
                      />
                    </td>
                    {state.sets.map((set) => (
                      <td key={set.id} className="px-4 py-3">
                        <input
                          className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-600 focus:outline-none"
                          type="number"
                          min={0}
                          value={state.cells[row.id]?.[set.id] ?? ''}
                          onChange={(event) =>
                            updateCell(
                              row.id,
                              set.id,
                              event.target.value === '' ? '' : Number(event.target.value)
                            )
                          }
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-sm text-slate-500 transition hover:text-red-400"
                        onClick={() => removeRow(row.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">실시간 계산 요약</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-sm font-semibold text-slate-200">세트별 Deckle 합계</h3>
              <div className="grid gap-2">
                {state.sets.map((set) => {
                  const deckle = totals.deckleMap[set.id] ?? 0;
                  const limit = selectedMill?.deckle ?? Infinity;
                  const withinLimit = deckle <= limit;
                  return (
                    <div key={set.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{set.label}</p>
                        <p className="text-xs text-slate-500">
                          총 지폭합: {deckle ? numberFormatter.format(deckle) : '0'} mm
                        </p>
                      </div>
                      <span
                        className={clsx(
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          withinLimit
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        )}
                      >
                        {withinLimit ? '적합' : '초과'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-sm font-semibold text-slate-200">지폭별 생산량 요약</h3>
              <div className="grid gap-2">
                {totals.perRow.map((row) => (
                  <div key={row.rowId} className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-100">
                      <span>{state.rows.find((item) => item.id === row.rowId)?.label ?? '지폭'}</span>
                      <span>{numberFormatter.format(row.producedRolls)} 롤</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      필요량 {numberFormatter.format(row.requiredRolls)} 롤 · 차이 {numberFormatter.format(row.difference)} 롤 ·
                      생산 톤수 {numberFormatter.format(row.producedTons)} t
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">최종 발주 요약</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {totals.perSet.map((set) => (
              <div key={set.setId} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-slate-200">
                  {state.sets.find((item) => item.id === set.setId)?.label ?? '세트'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Multiplier {numberFormatter.format(set.multiplier)} · Deckle 합계{' '}
                  {numberFormatter.format(set.totalWidth)} mm
                </p>
                <p className="mt-4 text-lg font-semibold text-brand-500">
                  총 생산 톤수 {numberFormatter.format(set.totalWeightTons)} t
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {historyOpen && (
        <HistoryModal
          open={historyOpen}
          loading={historyLoading}
          history={history}
          onClose={() => setHistoryOpen(false)}
          onDelete={handleDelete}
          onLoad={handleLoad}
        />
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 rounded-lg border border-rose-600 bg-rose-600/20 px-4 py-3 text-sm text-rose-100 shadow-lg">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

interface HistoryModalProps {
  open: boolean;
  loading: boolean;
  history: CalculationRecord[];
  onClose: () => void;
  onLoad: (record: CalculationRecord) => void;
  onDelete: (id: string) => void;
}

function HistoryModal({ open, loading, history, onClose, onDelete, onLoad }: HistoryModalProps) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
      <div className="max-h-[80vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold">이전 계산 기록</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            닫기
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-slate-400">기록을 불러오는 중…</p>}
          {!loading && history.length === 0 && <p className="text-sm text-slate-400">저장된 기록이 없습니다.</p>}
          <ul className="grid gap-3">
            {history.map((record) => (
              <li key={record.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-slate-200">{record.name}</p>
                <p className="text-xs text-slate-500">
                  {new Date(record.created_at).toLocaleString()}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onLoad(record)}
                    className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
                  >
                    불러오기
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(record.id)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-rose-500 hover:text-rose-300"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
