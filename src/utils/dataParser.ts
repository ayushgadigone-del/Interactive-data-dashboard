import Papa from 'papaparse';
import { AggregationType, ColumnMetadata, DataRow, DataType, FilterRule } from '../types';

export function parseRawData(input: string): { data: DataRow[]; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { data: [], error: 'Input is empty' };
  }

  // Check if JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      if (rows.length === 0) return { data: [], error: 'JSON array is empty' };
      return { data: normalizeRows(rows) };
    } catch (err: any) {
      return { data: [], error: `Invalid JSON: ${err?.message || 'Syntax error'}` };
    }
  }

  // Parse as CSV / TSV
  try {
    const parsed = Papa.parse<Record<string, any>>(trimmed, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return { data: [], error: parsed.errors[0].message };
    }

    if (!parsed.data || parsed.data.length === 0) {
      return { data: [], error: 'No rows detected in CSV' };
    }

    return { data: normalizeRows(parsed.data) };
  } catch (err: any) {
    return { data: [], error: `CSV Parsing error: ${err?.message || 'Unknown error'}` };
  }
}

function normalizeRows(rows: DataRow[]): DataRow[] {
  return rows.map((row) => {
    const clean: DataRow = {};
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.trim();
      if (!cleanKey) continue;

      if (typeof val === 'string') {
        const num = Number(val.replace(/[$,]/g, '').trim());
        if (!isNaN(num) && val.trim() !== '') {
          clean[cleanKey] = num;
        } else {
          clean[cleanKey] = val.trim();
        }
      } else {
        clean[cleanKey] = val;
      }
    }
    return clean;
  });
}

export function extractColumnMetadata(rows: DataRow[]): ColumnMetadata[] {
  if (!rows || rows.length === 0) return [];

  const keys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r || {})))
  );

  return keys.map((key) => {
    const values = rows.map((r) => r[key]).filter((v) => v !== undefined && v !== null && v !== '');
    const sampleValues = values.slice(0, 5);

    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    for (const v of values) {
      if (typeof v === 'number') numberCount++;
      else if (typeof v === 'boolean') booleanCount++;
      else if (typeof v === 'string' && !isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/'))) {
        dateCount++;
      }
    }

    let type: DataType = 'string';
    if (numberCount > values.length * 0.7) {
      type = 'number';
    } else if (booleanCount > values.length * 0.7) {
      type = 'boolean';
    } else if (dateCount > values.length * 0.7) {
      type = 'date';
    }

    const uniqueSet = new Set(values);
    const uniqueValuesCount = uniqueSet.size;
    const distinctCategories = uniqueValuesCount <= 50 ? Array.from(uniqueSet).map(String) : undefined;

    let min: number | undefined;
    let max: number | undefined;
    let sum: number | undefined;
    let avg: number | undefined;

    if (type === 'number') {
      const numVals = values.filter((v): v is number => typeof v === 'number');
      if (numVals.length > 0) {
        min = Math.min(...numVals);
        max = Math.max(...numVals);
        sum = numVals.reduce((acc, curr) => acc + curr, 0);
        avg = sum / numVals.length;
      }
    }

    return {
      name: key,
      type,
      uniqueValuesCount,
      sampleValues,
      distinctCategories,
      min,
      max,
      sum,
      avg,
    };
  });
}

export function applyFilters(data: DataRow[], filters: FilterRule[]): DataRow[] {
  if (!filters || filters.length === 0) return data;

  return data.filter((row) => {
    return filters.every((filter) => {
      const cellVal = row[filter.column];
      if (cellVal === undefined || cellVal === null) return false;

      switch (filter.operator) {
        case 'equals':
          return String(cellVal).toLowerCase() === String(filter.value).toLowerCase();
        case 'contains':
          return String(cellVal).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'greaterThan':
          return Number(cellVal) >= Number(filter.value);
        case 'lessThan':
          return Number(cellVal) <= Number(filter.value);
        case 'between':
          return Number(cellVal) >= Number(filter.value) && Number(cellVal) <= Number(filter.value2);
        case 'in':
          if (Array.isArray(filter.value)) {
            return filter.value.includes(cellVal);
          }
          return false;
        default:
          return true;
      }
    });
  });
}

export function aggregateChartData(
  data: DataRow[],
  xAxisKey: string,
  yAxisKeys: string[],
  aggregation: AggregationType = 'sum',
  groupByKey?: string
): { chartData: DataRow[]; seriesKeys: string[] } {
  if (!data || data.length === 0 || !xAxisKey) {
    return { chartData: [], seriesKeys: [] };
  }

  // If no groupByKey, standard grouping by xAxisKey
  if (!groupByKey || groupByKey === xAxisKey) {
    const groups: Map<string, { xVal: any; rows: DataRow[] }> = new Map();

    for (const row of data) {
      const rawX = row[xAxisKey] !== undefined ? String(row[xAxisKey]) : '(Empty)';
      if (!groups.has(rawX)) {
        groups.set(rawX, { xVal: row[xAxisKey], rows: [] });
      }
      groups.get(rawX)!.rows.push(row);
    }

    const chartData: DataRow[] = [];

    groups.forEach(({ xVal, rows }, key) => {
      const item: DataRow = { [xAxisKey]: xVal ?? key };

      for (const yKey of yAxisKeys) {
        const nums = rows
          .map((r) => Number(r[yKey]))
          .filter((n) => !isNaN(n));

        if (nums.length === 0) {
          item[yKey] = 0;
          continue;
        }

        switch (aggregation) {
          case 'sum':
            item[yKey] = Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
            break;
          case 'avg':
            item[yKey] = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
            break;
          case 'min':
            item[yKey] = Math.min(...nums);
            break;
          case 'max':
            item[yKey] = Math.max(...nums);
            break;
          case 'count':
            item[yKey] = nums.length;
            break;
        }
      }

      chartData.push(item);
    });

    return { chartData, seriesKeys: yAxisKeys };
  }

  // When groupByKey is present, create pivoted breakdown series
  // e.g. X = Region, Group = Category, Y = Sales -> seriesKeys: ['Electronics', 'Furniture', ...]
  const groups: Map<string, { xVal: any; groupRows: Map<string, DataRow[]> }> = new Map();
  const allSubGroupValues = new Set<string>();
  const primaryMetric = yAxisKeys[0] || 'Value';

  for (const row of data) {
    const rawX = row[xAxisKey] !== undefined ? String(row[xAxisKey]) : '(Empty)';
    const rawGroup = row[groupByKey] !== undefined ? String(row[groupByKey]) : 'Other';
    allSubGroupValues.add(rawGroup);

    if (!groups.has(rawX)) {
      groups.set(rawX, { xVal: row[xAxisKey], groupRows: new Map() });
    }
    const xGroup = groups.get(rawX)!;
    if (!xGroup.groupRows.has(rawGroup)) {
      xGroup.groupRows.set(rawGroup, []);
    }
    xGroup.groupRows.get(rawGroup)!.push(row);
  }

  const seriesKeys = Array.from(allSubGroupValues);
  const chartData: DataRow[] = [];

  groups.forEach(({ xVal, groupRows }, key) => {
    const item: DataRow = { [xAxisKey]: xVal ?? key };

    for (const sKey of seriesKeys) {
      const rows = groupRows.get(sKey) || [];
      const nums = rows
        .map((r) => Number(r[primaryMetric]))
        .filter((n) => !isNaN(n));

      if (nums.length === 0) {
        item[sKey] = 0;
        continue;
      }

      switch (aggregation) {
        case 'sum':
          item[sKey] = Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
          break;
        case 'avg':
          item[sKey] = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
          break;
        case 'min':
          item[sKey] = Math.min(...nums);
          break;
        case 'max':
          item[sKey] = Math.max(...nums);
          break;
        case 'count':
          item[sKey] = nums.length;
          break;
      }
    }

    chartData.push(item);
  });

  // If xAxis values are dates or parseable dates, sort chronologically
  if (chartData.length > 0) {
    const sampleVal = String(chartData[0][xAxisKey] || '');
    const isDate = !isNaN(Date.parse(sampleVal)) && (sampleVal.includes('-') || sampleVal.includes('/'));
    if (isDate) {
      chartData.sort((a, b) => {
        const timeA = Date.parse(String(a[xAxisKey])) || 0;
        const timeB = Date.parse(String(b[xAxisKey])) || 0;
        return timeA - timeB;
      });
    }
  }

  return { chartData, seriesKeys };
}

export function exportToCSV(data: DataRow[], filename = 'export.csv') {
  if (!data || data.length === 0) return;
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(data: DataRow[], filename = 'export.json') {
  if (!data || data.length === 0) return;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
