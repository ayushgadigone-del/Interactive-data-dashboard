import { ColumnMetadata, DataRow } from '../types';

export interface ColumnOutlierStats {
  columnKey: string;
  count: number;
  mean: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  lowerBound: number; // mean - 3 * stdDev
  upperBound: number; // mean + 3 * stdDev
  outlierCount: number;
  highOutlierCount: number;
  lowOutlierCount: number;
  sigmaMultiplier: number;
}

export interface CellOutlierDetail {
  columnKey: string;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
  lowerBound: number;
  upperBound: number;
  direction: 'high' | 'low';
  deviationDescription: string;
}

export interface RowOutlierResult {
  rowIndex: number;
  hasOutlier: boolean;
  outlierDetails: CellOutlierDetail[];
  maxAbsZScore: number;
  outlierColumns: string[];
}

export interface DatasetOutlierAnalysis {
  sigmaMultiplier: number;
  columnStats: Record<string, ColumnOutlierStats>;
  numericColumnKeys: string[];
  totalRowsWithOutliers: number;
  totalOutlierCells: number;
  hasAnyOutliers: boolean;
  rowResults: RowOutlierResult[];
  outlierRowIndexSet: Set<number>;
  getRowOutlierInfo: (rowIndex: number) => RowOutlierResult;
  getCellOutlierInfo: (columnKey: string, value: any) => CellOutlierDetail | null;
}

/**
 * Computes mean and population/sample standard deviation for an array of numbers.
 */
export function computeStats(values: number[]): { mean: number; stdDev: number; variance: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0, variance: 0 };
  if (n === 1) return { mean: values[0], stdDev: 0, variance: 0 };

  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  // Sample variance (n - 1)
  const sumSquaredDiff = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const variance = sumSquaredDiff / (n - 1);
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev, variance };
}

/**
 * Automated Outlier Detection Utility
 * Computes 3rd standard deviation (±3σ) thresholds across all numeric columns
 * and evaluates rows and cells that fall beyond these boundaries (|z| > 3).
 */
export function analyzeOutliers(
  data: DataRow[],
  columns: ColumnMetadata[],
  sigmaMultiplier: number = 3.0
): DatasetOutlierAnalysis {
  const columnStats: Record<string, ColumnOutlierStats> = {};
  const numericColumns = columns.filter((col) => col.type === 'number');
  const numericColumnKeys = numericColumns.map((col) => col.name);

  // 1. Gather valid numbers for each numeric column
  const columnValues: Record<string, { value: number; originalRowIndex: number }[]> = {};
  for (const colKey of numericColumnKeys) {
    columnValues[colKey] = [];
  }

  data.forEach((row, rowIdx) => {
    for (const colKey of numericColumnKeys) {
      const val = row[colKey];
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        columnValues[colKey].push({ value: val, originalRowIndex: rowIdx });
      } else if (typeof val === 'string' && val.trim() !== '') {
        const parsed = Number(val);
        if (!isNaN(parsed) && isFinite(parsed)) {
          columnValues[colKey].push({ value: parsed, originalRowIndex: rowIdx });
        }
      }
    }
  });

  // 2. Compute statistics and bounds for each column
  for (const colKey of numericColumnKeys) {
    const entries = columnValues[colKey];
    const nums = entries.map((e) => e.value);

    if (nums.length < 3) {
      // Not enough data points to reliably measure 3σ outliers
      columnStats[colKey] = {
        columnKey: colKey,
        count: nums.length,
        mean: nums.length > 0 ? nums[0] : 0,
        stdDev: 0,
        variance: 0,
        min: nums.length > 0 ? Math.min(...nums) : 0,
        max: nums.length > 0 ? Math.max(...nums) : 0,
        lowerBound: 0,
        upperBound: 0,
        outlierCount: 0,
        highOutlierCount: 0,
        lowOutlierCount: 0,
        sigmaMultiplier,
      };
      continue;
    }

    const { mean, stdDev, variance } = computeStats(nums);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const lowerBound = mean - sigmaMultiplier * stdDev;
    const upperBound = mean + sigmaMultiplier * stdDev;

    let highCount = 0;
    let lowCount = 0;

    if (stdDev > 0) {
      for (const val of nums) {
        if (val > upperBound) highCount++;
        else if (val < lowerBound) lowCount++;
      }
    }

    columnStats[colKey] = {
      columnKey: colKey,
      count: nums.length,
      mean,
      stdDev,
      variance,
      min,
      max,
      lowerBound,
      upperBound,
      outlierCount: highCount + lowCount,
      highOutlierCount: highCount,
      lowOutlierCount: lowCount,
      sigmaMultiplier,
    };
  }

  // 3. Evaluate each row against column bounds
  const rowResults: RowOutlierResult[] = [];
  const outlierRowIndexSet = new Set<number>();
  let totalOutlierCells = 0;

  data.forEach((row, rowIdx) => {
    const outlierDetails: CellOutlierDetail[] = [];
    const outlierCols: string[] = [];
    let maxAbsZ = 0;

    for (const colKey of numericColumnKeys) {
      const stats = columnStats[colKey];
      if (!stats || stats.stdDev <= 0) continue;

      const rawVal = row[colKey];
      let numVal: number | null = null;

      if (typeof rawVal === 'number' && !isNaN(rawVal)) {
        numVal = rawVal;
      } else if (typeof rawVal === 'string' && rawVal.trim() !== '') {
        const parsed = Number(rawVal);
        if (!isNaN(parsed)) numVal = parsed;
      }

      if (numVal !== null) {
        const zScore = (numVal - stats.mean) / stats.stdDev;
        const absZ = Math.abs(zScore);
        if (absZ > maxAbsZ) {
          maxAbsZ = absZ;
        }

        if (absZ > sigmaMultiplier) {
          const isHigh = numVal > stats.upperBound;
          const direction: 'high' | 'low' = isHigh ? 'high' : 'low';
          const deviationDescription = isHigh
            ? `+${zScore.toFixed(2)}σ above mean`
            : `${zScore.toFixed(2)}σ below mean`;

          outlierDetails.push({
            columnKey: colKey,
            value: numVal,
            mean: stats.mean,
            stdDev: stats.stdDev,
            zScore,
            lowerBound: stats.lowerBound,
            upperBound: stats.upperBound,
            direction,
            deviationDescription,
          });

          outlierCols.push(colKey);
          totalOutlierCells++;
        }
      }
    }

    const hasOutlier = outlierDetails.length > 0;
    if (hasOutlier) {
      outlierRowIndexSet.add(rowIdx);
    }

    rowResults.push({
      rowIndex: rowIdx,
      hasOutlier,
      outlierDetails,
      maxAbsZScore: maxAbsZ,
      outlierColumns: outlierCols,
    });
  });

  const getRowOutlierInfo = (rowIndex: number): RowOutlierResult => {
    return (
      rowResults[rowIndex] || {
        rowIndex,
        hasOutlier: false,
        outlierDetails: [],
        maxAbsZScore: 0,
        outlierColumns: [],
      }
    );
  };

  const getCellOutlierInfo = (columnKey: string, value: any): CellOutlierDetail | null => {
    const stats = columnStats[columnKey];
    if (!stats || stats.stdDev <= 0) return null;

    let numVal: number | null = null;
    if (typeof value === 'number' && !isNaN(value)) {
      numVal = value;
    } else if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (!isNaN(parsed)) numVal = parsed;
    }

    if (numVal === null) return null;

    const zScore = (numVal - stats.mean) / stats.stdDev;
    if (Math.abs(zScore) > sigmaMultiplier) {
      const isHigh = numVal > stats.upperBound;
      return {
        columnKey,
        value: numVal,
        mean: stats.mean,
        stdDev: stats.stdDev,
        zScore,
        lowerBound: stats.lowerBound,
        upperBound: stats.upperBound,
        direction: isHigh ? 'high' : 'low',
        deviationDescription: isHigh
          ? `+${zScore.toFixed(2)}σ above mean`
          : `${zScore.toFixed(2)}σ below mean`,
      };
    }
    return null;
  };

  return {
    sigmaMultiplier,
    columnStats,
    numericColumnKeys,
    totalRowsWithOutliers: outlierRowIndexSet.size,
    totalOutlierCells,
    hasAnyOutliers: outlierRowIndexSet.size > 0,
    rowResults,
    outlierRowIndexSet,
    getRowOutlierInfo,
    getCellOutlierInfo,
  };
}
