import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpDown, Check, CheckCircle2, Database, GitMerge, Pencil } from 'lucide-react';
import { normalizeSearchText } from '../../lib/textSearch';

const SORT_BY_NAME = 'name';
const SORT_BY_SIMILARITY = 'similarity';
const SIMILARITY_THRESHOLD = 0.84;

export default function ExercisesTab({
  allUniqueExercises,
  processedData,
  selectedForMerge,
  onToggleSelection,
  onOpenMergeModal,
  onOpenRenameModal,
}) {
  const [sortMode, setSortMode] = useState(SORT_BY_NAME);
  const exerciseCounts = useMemo(() => buildExerciseCounts(processedData), [processedData]);
  const similarityPairs = useMemo(() => buildSimilarityPairs(allUniqueExercises), [allUniqueExercises]);
  const similarityByExercise = useMemo(() => buildSimilarityByExercise(similarityPairs), [similarityPairs]);
  const displayedExercises = useMemo(
    () => sortExercises(allUniqueExercises, similarityPairs, sortMode),
    [allUniqueExercises, similarityPairs, sortMode],
  );
  const isSimilaritySort = sortMode === SORT_BY_SIMILARITY;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3">
          <Database className="text-purple-500" size={32} /> Gestión de Ejercicios
        </h2>
        <p className="text-slate-400 text-sm">Gestiona nombres de ejercicios (fusionar o renombrar).</p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div>
          <p className="text-sm font-bold text-white">Orden de ejercicios</p>
          <p className="text-xs text-slate-500 mt-1">
            {similarityPairs.length > 0
              ? `${similarityPairs.length} posible(s) duplicado(s) por similitud.`
              : 'Sin nombres muy similares detectados.'}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex bg-slate-950 border border-slate-800 rounded-xl p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSortMode(SORT_BY_NAME)}
            className={`min-w-0 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-colors ${sortMode === SORT_BY_NAME ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="block truncate">Nombre</span>
          </button>
          <button
            type="button"
            onClick={() => setSortMode(SORT_BY_SIMILARITY)}
            className={`min-w-0 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${isSimilaritySort ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <ArrowUpDown size={15} className="shrink-0" />
            <span className="truncate">Similitud</span>
          </button>
        </div>
      </div>
      {isSimilaritySort && similarityPairs.length > 0 && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-4 text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-300 mt-0.5 shrink-0" />
            <div>
              <p className="font-black">Ejercicios posiblemente duplicados</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {similarityPairs.slice(0, 8).map((pair) => (
                  <span key={`${pair.left}__${pair.right}`} className="bg-slate-950/70 border border-amber-400/20 rounded-full px-3 py-1 text-xs font-mono">
                    {pair.left} / {pair.right} · {formatSimilarity(pair.score)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedForMerge.length > 1 && (
        <div className="sticky top-20 z-30 flex justify-center mb-6 animate-in slide-in-from-top-4">
          <button onClick={onOpenMergeModal} className="bg-purple-500 hover:bg-purple-400 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-purple-900/40 flex items-center gap-2 transform hover:scale-105 transition-all">
            <GitMerge size={20} /> Fusionar {selectedForMerge.length} seleccionados
          </button>
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left min-w-[600px]">
            <colgroup>
              <col className="w-14" />
              <col />
              <col className="w-28" />
              <col className="w-36" />
            </colgroup>
            <thead className="bg-slate-950 text-slate-500 uppercase text-xs tracking-wider font-bold">
              <tr>
                <th className="p-4 text-center"><CheckCircle2 size={16} /></th>
                <th className="p-6 whitespace-nowrap">Nombre del Ejercicio</th>
                <th className="p-6 text-center">Acciones</th>
                <th className="p-6 text-right">Registros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {displayedExercises.map((exercise) => {
                const count = exerciseCounts[exercise] || 0;
                const isSelected = selectedForMerge.includes(exercise);
                const similarity = similarityByExercise[exercise];

                return (
                  <tr key={exercise} className={`transition-colors group ${isSelected ? 'bg-purple-500/10' : 'hover:bg-slate-800/30'}`}>
                    <td className="p-4 text-center cursor-pointer" onClick={() => onToggleSelection(exercise)}>
                      <div className={`w-5 h-5 rounded border mx-auto flex items-center justify-center transition-all ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-600 group-hover:border-purple-400'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </td>
                    <td className="p-6 font-bold text-slate-200 group-hover:text-white cursor-pointer whitespace-nowrap" onClick={() => onToggleSelection(exercise)} title={exercise}>
                      <div className="flex flex-col gap-1">
                        <span>{exercise}</span>
                        {similarity && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200">
                            <AlertTriangle size={11} /> Similar a {similarity.other} ({formatSimilarity(similarity.score)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenRenameModal(exercise);
                        }}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors"
                        title="Renombrar"
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                    <td className="p-6 text-right cursor-pointer" onClick={() => onToggleSelection(exercise)}>
                      <span className="inline-block px-3 py-1 bg-slate-800 rounded-full text-slate-400 text-xs font-mono whitespace-nowrap">{count} sets</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildExerciseCounts(processedData) {
  return Object.values(processedData || {}).flat().reduce((counts, entry) => {
    counts[entry.exercise] = (counts[entry.exercise] || 0) + 1;
    return counts;
  }, {});
}

function buildSimilarityPairs(exercises) {
  const pairs = [];

  for (let leftIndex = 0; leftIndex < exercises.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < exercises.length; rightIndex += 1) {
      const left = exercises[leftIndex];
      const right = exercises[rightIndex];
      const score = getExerciseSimilarity(left, right);

      if (score >= SIMILARITY_THRESHOLD) pairs.push({ left, right, score });
    }
  }

  return pairs.sort((a, b) => b.score - a.score || a.left.localeCompare(b.left, 'es') || a.right.localeCompare(b.right, 'es'));
}

function buildSimilarityByExercise(pairs) {
  return pairs.reduce((matches, pair) => {
    if (!matches[pair.left] || pair.score > matches[pair.left].score) {
      matches[pair.left] = { other: pair.right, score: pair.score };
    }
    if (!matches[pair.right] || pair.score > matches[pair.right].score) {
      matches[pair.right] = { other: pair.left, score: pair.score };
    }
    return matches;
  }, {});
}

function sortExercises(exercises, similarityPairs, sortMode) {
  if (sortMode !== SORT_BY_SIMILARITY) return exercises;

  const ordered = [];
  const used = new Set();

  similarityPairs.forEach((pair) => {
    [pair.left, pair.right].forEach((exercise) => {
      if (used.has(exercise)) return;
      ordered.push(exercise);
      used.add(exercise);
    });
  });

  exercises.forEach((exercise) => {
    if (!used.has(exercise)) ordered.push(exercise);
  });

  return ordered;
}

function getExerciseSimilarity(left, right) {
  const normalizedLeft = normalizeExerciseName(left);
  const normalizedRight = normalizeExerciseName(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const distance = getLevenshteinDistance(normalizedLeft, normalizedRight);
  return 1 - distance / Math.max(normalizedLeft.length, normalizedRight.length);
}

function normalizeExerciseName(value) {
  return normalizeSearchText(value);
}

function getLevenshteinDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function formatSimilarity(score) {
  return `${Math.round(score * 100)}%`;
}
