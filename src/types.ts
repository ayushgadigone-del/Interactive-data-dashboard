export type DataType = 'number' | 'string' | 'date' | 'boolean';

export type DataRow = Record<string, any>;

export interface ColumnMetadata {
  name: string;
  type: DataType;
  uniqueValuesCount: number;
  sampleValues: (string | number | boolean)[];
  distinctCategories?: string[];
  min?: number;
  max?: number;
  sum?: number;
  avg?: number;
}

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export type ChartType = 
  | 'bar' 
  | 'line' 
  | 'area' 
  | 'pie' 
  | 'scatter' 
  | 'radar' 
  | 'composed' 
  | 'heatmap' 
  | 'correlation'
  | 'table';

export interface FilterRule {
  column: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: any;
  value2?: any;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export interface DashboardConfig {
  chartType: ChartType;
  xAxisKey: string;
  yAxisKeys: string[];
  groupByKey?: string;
  aggregation: AggregationType;
  isStacked: boolean;
  isHorizontal: boolean;
  showGrid: boolean;
  showLegend: boolean;
  showLabels: boolean;
  paletteId: string;
  customSeriesColors?: Record<string, string>;
  secondaryMetricKey?: string;
  bubbleSizeKey?: string;
  heatmapRowKey?: string;
  heatmapColKey?: string;
  heatmapValKey?: string;
  showTrendLine?: boolean;
  trendLineModel?: 'linear' | 'polynomial';
  polynomialDegree?: number;
}

export interface SelectedCategoryFilter {
  columnKey: string;
  value: any;
  metricKey?: string;
  color?: string;
}

export interface DatasetPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  data: DataRow[];
  defaultConfig?: Partial<DashboardConfig>;
}
