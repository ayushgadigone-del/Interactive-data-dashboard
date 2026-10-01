import React from 'react';
import { Layers, TrendingUp, DollarSign, Calculator, Activity, Hash } from 'lucide-react';
import { ColumnMetadata, DataRow } from '../types';

interface KpiCardsProps {
  data: DataRow[];
  columns: ColumnMetadata[];
  primaryMetricKey?: string;
  secondaryMetricKey?: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  data,
  columns,
  primaryMetricKey,
  secondaryMetricKey,
}) => {
  const numericColumns = columns.filter((c) => c.type === 'number');
  const metricCol = numericColumns.find((c) => c.name === primaryMetricKey) || numericColumns[0];
  const secondCol = numericColumns.find((c) => c.name === secondaryMetricKey) || numericColumns[1];

  // Calculations for primary metric
  const primaryValues = data
    .map((r) => Number(r[metricCol?.name]))
    .filter((n) => !isNaN(n));

  const totalSum = primaryValues.reduce((acc, curr) => acc + curr, 0);
  const average = primaryValues.length > 0 ? totalSum / primaryValues.length : 0;
  const maxVal = primaryValues.length > 0 ? Math.max(...primaryValues) : 0;
  const minVal = primaryValues.length > 0 ? Math.min(...primaryValues) : 0;

  // Format large numbers cleanly
  const formatNumber = (num: number) => {
    if (Math.abs(num) >= 1_000_000) {
      return (num / 1_000_000).toFixed(2) + 'M';
    }
    if (Math.abs(num) >= 1_000) {
      return (num / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'k';
    }
    if (Number.isInteger(num)) {
      return num.toLocaleString();
    }
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const getIcon = (name: string = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('sales') || lower.includes('profit') || lower.includes('revenue') || lower.includes('mrr')) {
      return <DollarSign className="w-4 h-4 text-emerald-600" />;
    }
    if (lower.includes('rate') || lower.includes('pct') || lower.includes('percent')) {
      return <Activity className="w-4 h-4 text-cyan-600" />;
    }
    return <TrendingUp className="w-4 h-4 text-indigo-600" />;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Card 1: Total Records */}
      <div 
        id="kpi-total-records"
        className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-stone-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-stone-700">Total Entries</span>
          <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-stone-900 tracking-tight">
            {data.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-700 font-medium mt-0.5">
            {columns.length} dimensions & metrics
          </div>
        </div>
      </div>

      {/* Card 2: Primary Sum */}
      {metricCol ? (
        <div 
          id="kpi-primary-sum"
          className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-700 truncate mr-1">
              Sum ({metricCol.name})
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              {getIcon(metricCol.name)}
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-stone-900 tracking-tight">
              {formatNumber(totalSum)}
            </div>
            <div className="text-[11px] text-stone-700 font-medium mt-0.5">
              Aggregated total across {primaryValues.length} points
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs flex items-center justify-center text-xs text-stone-600">
          No numeric metric selected
        </div>
      )}

      {/* Card 3: Primary Average */}
      {metricCol ? (
        <div 
          id="kpi-primary-avg"
          className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-700 truncate mr-1">
              Average ({metricCol.name})
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Calculator className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-stone-900 tracking-tight">
              {formatNumber(average)}
            </div>
            <div className="text-[11px] text-stone-700 font-medium mt-0.5">
              Mean value per record
            </div>
          </div>
        </div>
      ) : null}

      {/* Card 4: Range Peak / Secondary Metric */}
      {secondCol ? (
        <div 
          id="kpi-secondary-stat"
          className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-700 truncate mr-1">
              Peak ({metricCol?.name})
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Hash className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-stone-900 tracking-tight">
              {formatNumber(maxVal)}
            </div>
            <div className="text-[11px] text-stone-700 font-medium mt-0.5">
              Low: {formatNumber(minVal)} · High: {formatNumber(maxVal)}
            </div>
          </div>
        </div>
      ) : (
        <div 
          id="kpi-peak-val"
          className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-700">Peak Value</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-stone-900 tracking-tight">
              {formatNumber(maxVal)}
            </div>
            <div className="text-[11px] text-stone-700 font-medium mt-0.5">
              Maximum observed data point
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
