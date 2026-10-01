import { ColumnMetadata, DataRow } from '../types';

export type TrendLineModel = 'linear' | 'polynomial';

export interface TrendLineResult {
  seriesKey: string;
  model: TrendLineModel;
  degree: number;
  rSquared: number;
  rSquaredFormatted: string;
  equation: string;
  direction: 'up' | 'down' | 'flat';
  trendDataKey: string;
  predict: (xVal: any) => number | null;
}

/**
 * Detects if a column represents time-series or temporal data
 */
export function isTimeSeries(column?: ColumnMetadata, sampleValues: any[] = []): boolean {
  if (column?.type === 'date') return true;

  const valuesToCheck = sampleValues.length > 0 
    ? sampleValues 
    : (column?.sampleValues || []);

  if (valuesToCheck.length === 0) return false;

  let validDates = 0;
  for (const val of valuesToCheck) {
    if (!val) continue;
    const str = String(val).trim();
    // Common date formats: 2025-08-15, 2025/08/15, 08/15/2025, etc.
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(str)) {
      const parsed = Date.parse(str);
      if (!isNaN(parsed)) validDates++;
    } else if (typeof val === 'string' && !isNaN(Date.parse(val)) && (str.includes('-') || str.includes('/'))) {
      validDates++;
    }
  }

  return validDates >= Math.max(1, Math.floor(valuesToCheck.length * 0.6));
}

/**
 * Converts a date or numeric x-axis value to a continuous numeric timestamp
 */
export function parseXValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    return isFinite(val) ? val : null;
  }

  const str = String(val).trim();
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    return timestamp;
  }

  const num = Number(str);
  if (!isNaN(num)) {
    return num;
  }

  return null;
}

/**
 * Solves a linear system of equations M * x = b using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(M: number[][], b: number[]): number[] | null {
  const n = b.length;
  // Deep clone matrix and vector
  const A = M.map((row) => [...row]);
  const y = [...b];

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    if (Math.abs(A[maxRow][i]) < 1e-12) {
      return null; // Singular matrix
    }

    // Swap rows
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [y[i], y[maxRow]] = [y[maxRow], y[i]];

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j];
      }
      y[k] -= factor * y[i];
    }
  }

  // Back substitution
  const solution = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * solution[j];
    }
    solution[i] = sum / A[i][i];
  }

  return solution;
}

/**
 * Calculates a linear regression: y = m * x + c
 */
export function calculateLinearRegression(
  points: Array<{ x: number; y: number }>,
  seriesKey: string
): TrendLineResult | null {
  if (points.length < 2) return null;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const denominator = sumX2 - n * meanX * meanX;
  if (Math.abs(denominator) < 1e-12) return null;

  const slope = (sumXY - n * meanX * meanY) / denominator;
  const intercept = meanY - slope * meanX;

  // Calculate R^2
  let ssTot = 0;
  let ssRes = 0;
  for (const { x, y } of points) {
    const yPred = slope * x + intercept;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - yPred) ** 2;
  }

  const rSquared = ssTot > 1e-12 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  // Format equation for display
  // Use normalized slope if timestamps are large
  let eqStr = '';
  if (Math.abs(slope) < 0.001 && Math.abs(slope) > 0) {
    eqStr = `y = ${slope.toExponential(2)}x + ${intercept.toFixed(2)}`;
  } else {
    const sign = intercept >= 0 ? '+' : '-';
    eqStr = `y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(2)}`;
  }

  return {
    seriesKey,
    model: 'linear',
    degree: 1,
    rSquared,
    rSquaredFormatted: `R² = ${rSquared.toFixed(3)}`,
    equation: eqStr,
    direction: slope > 0.0001 ? 'up' : slope < -0.0001 ? 'down' : 'flat',
    trendDataKey: `_trend_${seriesKey}`,
    predict: (xVal: any) => {
      const x = parseXValue(xVal);
      if (x === null) return null;
      return Math.round((slope * x + intercept) * 100) / 100;
    },
  };
}

/**
 * Calculates a polynomial regression of specified degree (default 2: quadratic y = a*x^2 + b*x + c)
 * Uses min-max normalization on X to guarantee numerical stability.
 */
export function calculatePolynomialRegression(
  points: Array<{ x: number; y: number }>,
  seriesKey: string,
  degree: number = 2
): TrendLineResult | null {
  if (points.length <= degree) {
    return calculateLinearRegression(points, seriesKey);
  }

  const n = points.length;
  let xMin = Infinity;
  let xMax = -Infinity;
  let sumY = 0;

  for (const p of points) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    sumY += p.y;
  }

  const xRange = xMax - xMin;
  if (xRange < 1e-12) return null;

  const meanY = sumY / n;

  // Normalized points u in [0, 1]
  const normPoints = points.map((p) => ({
    u: (p.x - xMin) / xRange,
    y: p.y,
  }));

  // Build matrix for normal equations: A * c = b
  // where A_jk = sum(u^(j+k)), b_j = sum(y * u^j) for j, k in 0..degree
  const numTerms = degree + 1;
  const A: number[][] = Array.from({ length: numTerms }, () => new Array(numTerms).fill(0));
  const b: number[] = new Array(numTerms).fill(0);

  // Precompute power sums of u: sum(u^p) for p = 0 to 2 * degree
  const powerSums = new Array(2 * degree + 1).fill(0);
  for (let p = 0; p <= 2 * degree; p++) {
    for (const pt of normPoints) {
      powerSums[p] += Math.pow(pt.u, p);
    }
  }

  for (let j = 0; j < numTerms; j++) {
    for (let k = 0; k < numTerms; k++) {
      A[j][k] = powerSums[j + k];
    }
    for (const pt of normPoints) {
      b[j] += pt.y * Math.pow(pt.u, j);
    }
  }

  const coeffs = solveLinearSystem(A, b);
  if (!coeffs) {
    // Fall back to linear if polynomial is ill-conditioned
    return calculateLinearRegression(points, seriesKey);
  }

  // Calculate R^2
  let ssTot = 0;
  let ssRes = 0;
  for (const pt of normPoints) {
    let yPred = 0;
    for (let j = 0; j < numTerms; j++) {
      yPred += coeffs[j] * Math.pow(pt.u, j);
    }
    ssTot += (pt.y - meanY) ** 2;
    ssRes += (pt.y - yPred) ** 2;
  }

  const rSquared = ssTot > 1e-12 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  // Format equation: y = c2*u^2 + c1*u + c0
  let eqStr = 'y = ';
  for (let j = degree; j >= 0; j--) {
    const c = coeffs[j];
    const absC = Math.abs(c).toFixed(2);
    if (j === degree) {
      eqStr += `${c < 0 ? '-' : ''}${absC}x${j > 1 ? `^${j}` : ''}`;
    } else if (j > 0) {
      eqStr += ` ${c >= 0 ? '+' : '-'} ${absC}x${j > 1 ? `^${j}` : ''}`;
    } else {
      eqStr += ` ${c >= 0 ? '+' : '-'} ${absC}`;
    }
  }

  // Determine overall trajectory from start to end of interval
  const yStart = coeffs[0];
  let yEnd = 0;
  for (let j = 0; j < numTerms; j++) {
    yEnd += coeffs[j];
  }
  const diff = yEnd - yStart;
  const direction = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat';

  return {
    seriesKey,
    model: 'polynomial',
    degree,
    rSquared,
    rSquaredFormatted: `R² = ${rSquared.toFixed(3)}`,
    equation: eqStr,
    direction,
    trendDataKey: `_trend_${seriesKey}`,
    predict: (xVal: any) => {
      const x = parseXValue(xVal);
      if (x === null) return null;
      const u = (x - xMin) / xRange;
      let yPred = 0;
      for (let j = 0; j < numTerms; j++) {
        yPred += coeffs[j] * Math.pow(u, j);
      }
      return Math.round(yPred * 100) / 100;
    },
  };
}

/**
 * Calculates trendline regression models for all active series in chartData
 */
export function computeSeriesTrendLines(
  chartData: DataRow[],
  xAxisKey: string,
  seriesKeys: string[],
  model: TrendLineModel = 'linear',
  degree: number = 2
): {
  trendResults: Record<string, TrendLineResult>;
  augmentedChartData: DataRow[];
} {
  if (!chartData || chartData.length < 2 || !xAxisKey) {
    return { trendResults: {}, augmentedChartData: chartData };
  }

  const trendResults: Record<string, TrendLineResult> = {};

  // For each series, collect valid (x, y) points
  for (const sKey of seriesKeys) {
    const validPoints: Array<{ x: number; y: number }> = [];

    for (const row of chartData) {
      const rawX = row[xAxisKey];
      const rawY = row[sKey];

      const x = parseXValue(rawX);
      const y = Number(rawY);

      if (x !== null && !isNaN(y) && isFinite(y)) {
        validPoints.push({ x, y });
      }
    }

    if (validPoints.length >= 2) {
      const result =
        model === 'polynomial'
          ? calculatePolynomialRegression(validPoints, sKey, degree)
          : calculateLinearRegression(validPoints, sKey);

      if (result) {
        trendResults[sKey] = result;
      }
    }
  }

  // Augment chartData with predicted trend points
  const augmentedChartData = chartData.map((row) => {
    const augmented = { ...row };
    for (const [sKey, trend] of Object.entries(trendResults)) {
      const pred = trend.predict(row[xAxisKey]);
      if (pred !== null) {
        augmented[trend.trendDataKey] = pred;
      }
    }
    return augmented;
  });

  return { trendResults, augmentedChartData };
}

/**
 * Computes trendline points for a Scatter Chart dataset
 */
export function computeScatterTrendLine(
  data: DataRow[],
  xKey: string,
  yKey: string,
  model: TrendLineModel = 'linear',
  degree: number = 2
): {
  trendResult: TrendLineResult | null;
  trendPoints: DataRow[];
} {
  if (!data || data.length < 2) {
    return { trendResult: null, trendPoints: [] };
  }

  const validPoints: Array<{ x: number; y: number; originalX: any }> = [];

  for (const row of data) {
    const rawX = row[xKey];
    const rawY = row[yKey];

    const x = parseXValue(rawX);
    const y = Number(rawY);

    if (x !== null && !isNaN(y) && isFinite(y)) {
      validPoints.push({ x, y, originalX: rawX });
    }
  }

  if (validPoints.length < 2) {
    return { trendResult: null, trendPoints: [] };
  }

  // Sort by x ascending
  validPoints.sort((a, b) => a.x - b.x);

  const regressionPoints = validPoints.map((p) => ({ x: p.x, y: p.y }));

  const trendResult =
    model === 'polynomial'
      ? calculatePolynomialRegression(regressionPoints, yKey, degree)
      : calculateLinearRegression(regressionPoints, yKey);

  if (!trendResult) {
    return { trendResult: null, trendPoints: [] };
  }

  // Generate trend line points across distinct sorted X values
  const uniqueXMap = new Map<number, any>();
  for (const p of validPoints) {
    if (!uniqueXMap.has(p.x)) {
      uniqueXMap.set(p.x, p.originalX);
    }
  }

  const sortedXEntries = Array.from(uniqueXMap.entries()).sort((a, b) => a[0] - b[0]);

  const trendPoints: DataRow[] = sortedXEntries.map(([timestamp, originalX]) => {
    const yPred = trendResult.predict(timestamp);
    return {
      [xKey]: originalX,
      [yKey]: yPred,
      _isTrendLine: true,
    };
  });

  return { trendResult, trendPoints };
}
