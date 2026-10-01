import { DataRow } from '../types';

export type CorrelationStrength = 'very_strong' | 'strong' | 'moderate' | 'weak' | 'negligible';
export type CorrelationDirection = 'positive' | 'negative' | 'neutral';

export interface CorrelationCell {
  colA: string;
  colB: string;
  r: number;
  rSquared: number;
  sampleSize: number;
  strength: CorrelationStrength;
  direction: CorrelationDirection;
  strengthLabel: string;
  description: string;
  isSignificant: boolean;
  tStat: number;
}

export interface CorrelationMatrixResult {
  columns: string[];
  matrix: Record<string, Record<string, CorrelationCell>>;
  pairs: CorrelationCell[]; // unique off-diagonal pairs sorted by |r| descending
  strongestPositivePair: CorrelationCell | null;
  strongestNegativePair: CorrelationCell | null;
  mostCorrelatedColumn: { column: string; avgAbsR: number } | null;
  totalNumericRows: number;
}

/**
 * Standard error function approximation for normal cumulative distribution
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

/**
 * Approximate two-tailed p-value for Pearson correlation t-statistic
 */
function approximatePValue(t: number, df: number): number {
  if (df <= 0 || !isFinite(t)) return 0;
  // For df >= 30, t is very close to standard normal
  // For smaller df, apply standard t-to-z approximation: z = t * (1 - 1/(4*df)) / sqrt(1 + t^2/(2*df))
  const z = Math.abs(t) * (1 - 1 / (4 * Math.max(1, df))) / Math.sqrt(1 + (t * t) / (2 * Math.max(1, df)));
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  const pVal = 2 * (1 - cdf);
  return Math.max(0, Math.min(1, pVal));
}

/**
 * Categorize Pearson correlation r into descriptive strength & narrative
 */
export function getCorrelationDetails(
  r: number,
  colA: string,
  colB: string,
  sampleSize: number
): {
  strength: CorrelationStrength;
  direction: CorrelationDirection;
  strengthLabel: string;
  description: string;
  isSignificant: boolean;
  tStat: number;
} {
  const absR = Math.abs(r);
  const direction: CorrelationDirection = absR < 0.05 ? 'neutral' : r > 0 ? 'positive' : 'negative';

  let strength: CorrelationStrength = 'negligible';
  let strengthLabel = 'Negligible / No Correlation';

  if (absR >= 0.8) {
    strength = 'very_strong';
    strengthLabel = 'Very Strong';
  } else if (absR >= 0.6) {
    strength = 'strong';
    strengthLabel = 'Strong';
  } else if (absR >= 0.4) {
    strength = 'moderate';
    strengthLabel = 'Moderate';
  } else if (absR >= 0.2) {
    strength = 'weak';
    strengthLabel = 'Weak';
  }

  // Calculate t-statistic and approximate significance
  const df = sampleSize - 2;
  let tStat = 0;
  let isSignificant = false;

  if (df > 0 && absR < 1) {
    tStat = r * Math.sqrt(df / Math.max(0.0001, 1 - r * r));
    const pVal = approximatePValue(tStat, df);
    isSignificant = pVal < 0.05;
  } else if (absR >= 0.999) {
    isSignificant = true;
  }

  // Narrative description
  let description = '';
  if (colA === colB) {
    description = `Identical metric (${colA}). Self-correlation is always +1.00.`;
  } else if (absR < 0.1) {
    description = `Virtually no linear relationship detected between ${colA} and ${colB} (r = ${r.toFixed(2)}).`;
  } else if (r > 0) {
    description = `${strengthLabel} positive relationship: As ${colA} increases, ${colB} tends to increase proportionally (r = +${r.toFixed(2)}).`;
  } else {
    description = `${strengthLabel} inverse relationship: As ${colA} increases, ${colB} tends to decrease systematically (r = ${r.toFixed(2)}).`;
  }

  return {
    strength,
    direction,
    strengthLabel,
    description,
    isSignificant,
    tStat,
  };
}

/**
 * Computes Pearson correlation r between two arrays of numbers
 */
export function computePearsonR(
  x: number[],
  y: number[]
): { r: number; sampleSize: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { r: 0, sampleSize: n };

  let sumX = 0;
  let sumY = 0;
  let validN = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (typeof xi === 'number' && !isNaN(xi) && isFinite(xi) &&
        typeof yi === 'number' && !isNaN(yi) && isFinite(yi)) {
      sumX += xi;
      sumY += yi;
      validN++;
    }
  }

  if (validN < 2) return { r: 0, sampleSize: validN };

  const meanX = sumX / validN;
  const meanY = sumY / validN;

  let numerator = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (typeof xi === 'number' && !isNaN(xi) && isFinite(xi) &&
        typeof yi === 'number' && !isNaN(yi) && isFinite(yi)) {
      const dx = xi - meanX;
      const dy = yi - meanY;
      numerator += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }
  }

  if (varX <= 1e-12 || varY <= 1e-12) {
    return { r: 0, sampleSize: validN };
  }

  const denominator = Math.sqrt(varX * varY);
  let r = numerator / denominator;
  // Guard against slight floating point inaccuracies
  r = Math.max(-1, Math.min(1, r));

  return { r, sampleSize: validN };
}

/**
 * Generates the complete correlation matrix for given numeric columns across the dataset
 */
export function computeCorrelationMatrix(
  data: DataRow[],
  numericColumnNames: string[]
): CorrelationMatrixResult {
  const columns = [...numericColumnNames];
  const matrix: Record<string, Record<string, CorrelationCell>> = {};
  const pairs: CorrelationCell[] = [];

  // Extract column values ahead of time
  const columnDataMap: Record<string, number[]> = {};
  for (const col of columns) {
    columnDataMap[col] = data.map((row) => {
      const val = row[col];
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && val.trim() !== '') {
        const parsed = Number(val);
        return isNaN(parsed) ? NaN : parsed;
      }
      return NaN;
    });
  }

  // Pre-initialize matrix rows
  for (const colA of columns) {
    matrix[colA] = {};
  }

  // Compute pairwise correlations
  for (let i = 0; i < columns.length; i++) {
    const colA = columns[i];

    for (let j = 0; j < columns.length; j++) {
      const colB = columns[j];

      if (i === j) {
        // Self-correlation is exactly 1.0
        const sampleSize = columnDataMap[colA].filter((v) => !isNaN(v) && isFinite(v)).length;
        const details = getCorrelationDetails(1.0, colA, colB, sampleSize);
        matrix[colA][colB] = {
          colA,
          colB,
          r: 1.0,
          rSquared: 1.0,
          sampleSize,
          ...details,
        };
      } else if (j > i) {
        // Compute unique pair
        const { r, sampleSize } = computePearsonR(columnDataMap[colA], columnDataMap[colB]);
        const rSquared = Math.max(0, Math.min(1, r * r));
        const details = getCorrelationDetails(r, colA, colB, sampleSize);

        const cell: CorrelationCell = {
          colA,
          colB,
          r,
          rSquared,
          sampleSize,
          ...details,
        };

        // Symmetric assignment
        matrix[colA][colB] = cell;
        matrix[colB][colA] = {
          ...cell,
          colA: colB,
          colB: colA,
          description: details.description,
        };

        pairs.push(cell);
      }
    }
  }

  // Sort pairs by absolute correlation descending
  pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  // Identify top relationships
  const positivePairs = pairs.filter((p) => p.r > 0.05);
  const negativePairs = pairs.filter((p) => p.r < -0.05);

  const strongestPositivePair =
    positivePairs.length > 0
      ? [...positivePairs].sort((a, b) => b.r - a.r)[0]
      : null;

  const strongestNegativePair =
    negativePairs.length > 0
      ? [...negativePairs].sort((a, b) => a.r - b.r)[0]
      : null;

  // Find column with highest average absolute correlation
  let mostCorrelatedColumn: { column: string; avgAbsR: number } | null = null;
  if (columns.length > 1) {
    let maxAvg = -1;
    let topCol = columns[0];

    for (const col of columns) {
      const otherCols = columns.filter((c) => c !== col);
      if (otherCols.length > 0) {
        const sumAbs = otherCols.reduce((acc, c) => acc + Math.abs(matrix[col][c]?.r || 0), 0);
        const avg = sumAbs / otherCols.length;
        if (avg > maxAvg) {
          maxAvg = avg;
          topCol = col;
        }
      }
    }

    if (maxAvg >= 0) {
      mostCorrelatedColumn = { column: topCol, avgAbsR: maxAvg };
    }
  }

  return {
    columns,
    matrix,
    pairs,
    strongestPositivePair,
    strongestNegativePair,
    mostCorrelatedColumn,
    totalNumericRows: data.length,
  };
}

/**
 * Returns color styling for correlation cell based on divergent scale:
 * - Negative: Red/Rose
 * - Zero: Neutral slate/stone
 * - Positive: Blue/Indigo
 */
export function getCorrelationColor(r: number, isSelected: boolean = false): {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  accentBg: string;
} {
  // Clamp
  const val = Math.max(-1, Math.min(1, r));

  if (Math.abs(val) < 0.05) {
    return {
      backgroundColor: isSelected ? '#e2e8f0' : '#f8fafc',
      textColor: '#475569',
      borderColor: '#cbd5e1',
      accentBg: '#f1f5f9',
    };
  }

  if (val > 0) {
    // Positive scale (Indigo/Blue)
    if (val >= 0.8) {
      return {
        backgroundColor: '#4338ca', // indigo-700
        textColor: '#ffffff',
        borderColor: '#3730a3',
        accentBg: '#312e81',
      };
    }
    if (val >= 0.6) {
      return {
        backgroundColor: '#4f46e5', // indigo-600
        textColor: '#ffffff',
        borderColor: '#4338ca',
        accentBg: '#3730a3',
      };
    }
    if (val >= 0.4) {
      return {
        backgroundColor: '#818cf8', // indigo-400
        textColor: '#ffffff',
        borderColor: '#6366f1',
        accentBg: '#4f46e5',
      };
    }
    if (val >= 0.2) {
      return {
        backgroundColor: '#c7d2fe', // indigo-200
        textColor: '#1e1b4b',
        borderColor: '#a5b4fc',
        accentBg: '#e0e7ff',
      };
    }
    return {
      backgroundColor: '#e0e7ff', // indigo-100
      textColor: '#312e81',
      borderColor: '#c7d2fe',
      accentBg: '#eef2ff',
    };
  }

  // Negative scale (Rose/Red)
  const absVal = Math.abs(val);
  if (absVal >= 0.8) {
    return {
      backgroundColor: '#be123c', // rose-700
      textColor: '#ffffff',
      borderColor: '#9f1239',
      accentBg: '#881337',
    };
  }
  if (absVal >= 0.6) {
    return {
      backgroundColor: '#e11d48', // rose-600
      textColor: '#ffffff',
      borderColor: '#be123c',
      accentBg: '#9f1239',
    };
  }
  if (absVal >= 0.4) {
    return {
      backgroundColor: '#fb7185', // rose-400
      textColor: '#ffffff',
      borderColor: '#f43f5e',
      accentBg: '#e11d48',
    };
  }
  if (absVal >= 0.2) {
    return {
      backgroundColor: '#fecdd3', // rose-200
      textColor: '#881337',
      borderColor: '#fda4af',
      accentBg: '#ffe4e6',
    };
  }
  return {
    backgroundColor: '#ffe4e6', // rose-100
    textColor: '#9f1239',
    borderColor: '#fecdd3',
    accentBg: '#fff1f2',
  };
}
