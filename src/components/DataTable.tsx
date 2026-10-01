import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Columns,
  AlertTriangle,
  Sparkles,
  Filter,
  X,
  Info,
  Check,
  TrendingUp,
  SlidersHorizontal,
  CheckSquare,
  Trash2,
  Copy
} from 'lucide-react';
import { ColumnMetadata, DataRow } from '../types';
import { exportToCSV } from '../utils/dataParser';
import { 
  analyzeOutliers, 
  DatasetOutlierAnalysis, 
  ColumnOutlierStats 
} from '../utils/outlierDetection';
import { RowSparkline } from './RowSparkline';
import { HorizontalSlider } from './HorizontalSlider';

interface DataTableProps {
  data: DataRow[];
  columns: ColumnMetadata[];
  datasetName: string;
  onDeleteRows?: (rowsToDelete: DataRow[]) => void;
  handleDeleteRows?: (rowsToDelete: DataRow[]) => void;
  onSelectionChange?: (selectedRows: DataRow[]) => void;
}

type IndexedDataRow = DataRow & { __origIndex: number };

export const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  columns, 
  datasetName,
  onDeleteRows,
  handleDeleteRows: propHandleDeleteRows,
  onSelectionChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() =>
    columns.map((c) => c.name)
  );
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Outlier detection controls
  const [highlightOutliers, setHighlightOutliers] = useState<boolean>(true);
  const [filterOutliersOnly, setFilterOutliersOnly] = useState<boolean>(false);
  const [selectedOutlierColumn, setSelectedOutlierColumn] = useState<string>('all');
  const [showOutlierModal, setShowOutlierModal] = useState<boolean>(false);

  // Miniature Sparkline controls for numeric distribution trends
  const numericColumns = useMemo(() => columns.filter((c) => c.type === 'number'), [columns]);
  const [showSparklineColumn, setShowSparklineColumn] = useState<boolean>(true);

  // Multi-row selection state
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [lastSelectedViewIdx, setLastSelectedViewIdx] = useState<number | null>(null);
  const [enableRowClickSelection, setEnableRowClickSelection] = useState<boolean>(true);
  const [filterSelectedOnly, setFilterSelectedOnly] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [localDeletedIndices, setLocalDeletedIndices] = useState<Set<number>>(new Set());

  // Show transient toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Sync state if new dataset or columns uploaded
  React.useEffect(() => {
    setVisibleColumnKeys(columns.map((c) => c.name));
    setPage(1);
    setFilterOutliersOnly(false);
    setSelectedOutlierColumn('all');
    setSelectedRowIndices(new Set());
    setFilterSelectedOnly(false);
    setLocalDeletedIndices(new Set());
    setLastSelectedViewIdx(null);
  }, [columns, data]);

  // Active dataset excluding locally deleted rows
  const activeData = useMemo(() => {
    if (localDeletedIndices.size === 0) return data;
    return data.filter((_, idx) => !localDeletedIndices.has(idx));
  }, [data, localDeletedIndices]);

  // Automated 3-sigma outlier analysis
  const outlierAnalysis: DatasetOutlierAnalysis = useMemo(() => {
    return analyzeOutliers(activeData, columns, 3.0);
  }, [activeData, columns]);

  // Attach original index for stable 1:1 lookup with outlier analysis and selection
  const indexedData: IndexedDataRow[] = useMemo(() => {
    return activeData.map((row, idx) => ({
      ...row,
      __origIndex: idx,
    }));
  }, [activeData]);

  // Filtering: combines text search, 3σ outlier isolation, and selected rows isolation
  const filteredData = useMemo(() => {
    let result = indexedData;

    // Selected rows filter
    if (filterSelectedOnly) {
      result = result.filter((row) => selectedRowIndices.has(row.__origIndex));
    }

    // Outlier isolation filter
    if (filterOutliersOnly) {
      if (selectedOutlierColumn === 'all') {
        result = result.filter((row) =>
          outlierAnalysis.outlierRowIndexSet.has(row.__origIndex)
        );
      } else {
        result = result.filter((row) => {
          const cellOutlier = outlierAnalysis.getCellOutlierInfo(
            selectedOutlierColumn,
            row[selectedOutlierColumn]
          );
          return cellOutlier !== null;
        });
      }
    }

    // Text search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.entries(row).some(([key, val]) => {
          if (key.startsWith('__')) return false;
          return String(val).toLowerCase().includes(term);
        })
      );
    }

    return result;
  }, [indexedData, filterSelectedOnly, selectedRowIndices, filterOutliersOnly, selectedOutlierColumn, outlierAnalysis, searchTerm]);

  // Compute row's average normalized score across numeric columns relative to their distribution
  const getRowSparklineScore = (row: IndexedDataRow): number => {
    if (numericColumns.length === 0) return 0;
    let sum = 0;
    let count = 0;
    for (const col of numericColumns) {
      const val = row[col.name];
      const stat = outlierAnalysis.columnStats[col.name];
      let num: number | null = null;
      if (typeof val === 'number' && !isNaN(val)) num = val;
      else if (typeof val === 'string' && val.trim() !== '') {
        const p = Number(val);
        if (!isNaN(p)) num = p;
      }

      if (stat && num !== null) {
        const range = stat.max - stat.min;
        const norm = range > 0 ? (num - stat.min) / range : 0.5;
        sum += Math.max(0, Math.min(1, norm));
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  };

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    if (sortKey === '__selected') {
      return [...filteredData].sort((a, b) => {
        const isSelectedA = selectedRowIndices.has(a.__origIndex) ? 1 : 0;
        const isSelectedB = selectedRowIndices.has(b.__origIndex) ? 1 : 0;
        if (isSelectedA === isSelectedB) return 0;
        return sortAsc ? isSelectedB - isSelectedA : isSelectedA - isSelectedB;
      });
    }

    if (sortKey === '__sparkline') {
      return [...filteredData].sort((a, b) => {
        const scoreA = getRowSparklineScore(a);
        const scoreB = getRowSparklineScore(b);
        if (scoreA === scoreB) return 0;
        return sortAsc ? scoreA - scoreB : scoreB - scoreA;
      });
    }

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortKey, sortAsc, selectedRowIndices, numericColumns, outlierAnalysis]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  // Toggle selection for a row, with Shift-click range support
  const handleToggleRowSelection = (
    origIndex: number, 
    viewIndex: number, 
    shiftKey: boolean
  ) => {
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      const isCurrentlySelected = next.has(origIndex);

      if (shiftKey && lastSelectedViewIdx !== null) {
        // Range selection across sortedData
        const start = Math.min(lastSelectedViewIdx, viewIndex);
        const end = Math.max(lastSelectedViewIdx, viewIndex);
        const rangeRows = sortedData.slice(start, end + 1);

        rangeRows.forEach((r) => {
          if (!isCurrentlySelected) {
            next.add(r.__origIndex);
          } else {
            next.delete(r.__origIndex);
          }
        });
      } else {
        if (isCurrentlySelected) {
          next.delete(origIndex);
        } else {
          next.add(origIndex);
        }
      }
      return next;
    });

    setLastSelectedViewIdx(viewIndex);
  };

  // Checkbox helpers for current page
  const isAllPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((r) => selectedRowIndices.has(r.__origIndex));

  const isSomePageSelected =
    paginatedData.some((r) => selectedRowIndices.has(r.__origIndex)) && !isAllPageSelected;

  const toggleSelectAllPage = () => {
    const pageIndices = paginatedData.map((r) => r.__origIndex);
    const allSelected = pageIndices.every((idx) => selectedRowIndices.has(idx));

    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIndices.forEach((idx) => next.delete(idx));
      } else {
        pageIndices.forEach((idx) => next.add(idx));
      }
      return next;
    });
  };

  // Select all filtered rows across all pages
  const selectAllFiltered = () => {
    setSelectedRowIndices(new Set(filteredData.map((r) => r.__origIndex)));
    showToast(`Selected all ${filteredData.length} records`);
  };

  // Clear all selections
  const clearAllSelected = () => {
    setSelectedRowIndices(new Set());
    setFilterSelectedOnly(false);
  };

  // Notify selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selected = indexedData
        .filter((r) => selectedRowIndices.has(r.__origIndex))
        .map(({ __origIndex, ...rest }) => rest);
      onSelectionChange(selected);
    }
  }, [selectedRowIndices, indexedData, onSelectionChange]);

  // Bulk Operations
  const handleExportSelected = () => {
    const selectedRows = indexedData
      .filter((r) => selectedRowIndices.has(r.__origIndex))
      .map(({ __origIndex, ...rest }) => rest);

    if (selectedRows.length === 0) return;

    exportToCSV(
      selectedRows,
      `${datasetName.toLowerCase().replace(/\s+/g, '-')}-selected-${selectedRows.length}-rows.csv`
    );
    showToast(`Exported ${selectedRows.length} selected row${selectedRows.length > 1 ? 's' : ''} to CSV`);
  };

  // Delete rows handler using current selection (invokes existing handleDeleteRows)
  const handleDeleteRows = (rowsToDeleteParam?: DataRow[]) => {
    const selectedRows = rowsToDeleteParam && rowsToDeleteParam.length > 0
      ? rowsToDeleteParam
      : indexedData
          .filter((r) => selectedRowIndices.has(r.__origIndex))
          .map(({ __origIndex, ...rest }) => rest);

    if (selectedRows.length === 0) return;

    const count = selectedRows.length;

    // Track local deletion
    setLocalDeletedIndices((prev) => {
      const next = new Set(prev);
      selectedRowIndices.forEach((idx) => next.add(idx));
      return next;
    });

    // Notify parent if callbacks provided
    if (propHandleDeleteRows) {
      propHandleDeleteRows(selectedRows);
    }
    if (onDeleteRows) {
      onDeleteRows(selectedRows);
    }

    showToast(`Deleted ${count} record${count > 1 ? 's' : ''}`);
    setSelectedRowIndices(new Set());
    setShowDeleteConfirmModal(false);
    setFilterSelectedOnly(false);
  };

  const handleConfirmDelete = () => {
    handleDeleteRows();
  };

  const handleCopySelected = () => {
    const selectedRows = indexedData
      .filter((r) => selectedRowIndices.has(r.__origIndex))
      .map(({ __origIndex, ...rest }) => rest);

    if (selectedRows.length === 0) return;

    navigator.clipboard.writeText(JSON.stringify(selectedRows, null, 2)).then(() => {
      setCopied(true);
      showToast(`Copied ${selectedRows.length} records as JSON to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRowClick = (
    e: React.MouseEvent<HTMLTableRowElement>, 
    origIndex: number,
    viewIndex: number
  ) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'A' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('a')
    ) {
      return;
    }
    if (enableRowClickSelection) {
      handleToggleRowSelection(origIndex, viewIndex, e.shiftKey);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortKey('');
      }
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const toggleColumn = (colName: string) => {
    if (visibleColumnKeys.includes(colName)) {
      if (visibleColumnKeys.length > 1) {
        setVisibleColumnKeys(visibleColumnKeys.filter((k) => k !== colName));
      }
    } else {
      setVisibleColumnKeys([...visibleColumnKeys, colName]);
    }
  };

  // Strip internal __origIndex when exporting
  const handleExportCSV = () => {
    const cleanData = sortedData.map(({ __origIndex, ...rest }) => rest);
    exportToCSV(cleanData, `${datasetName.toLowerCase().replace(/\s+/g, '-')}-data.csv`);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-stone-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-stone-50/60">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              id="data-table-search"
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Outlier Detection Summary & Modal Trigger */}
          <button
            type="button"
            id="open-outlier-stats-btn"
            onClick={() => setShowOutlierModal(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              outlierAnalysis.hasAnyOutliers
                ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 shadow-2xs'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
            title="Inspect 3rd Standard Deviation (±3σ) Outliers"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${outlierAnalysis.hasAnyOutliers ? 'text-rose-600' : 'text-stone-400'}`} />
            <span>
              {outlierAnalysis.hasAnyOutliers
                ? `${outlierAnalysis.totalRowsWithOutliers} Outliers (3σ)`
                : '0 Outliers (3σ)'}
            </span>
          </button>

          {/* Quick Highlight Outliers Toggle */}
          <button
            type="button"
            id="toggle-highlight-outliers-btn"
            onClick={() => setHighlightOutliers(!highlightOutliers)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              highlightOutliers
                ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
            title="Toggle highlighting of rows and values outside the 3rd standard deviation"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                highlightOutliers ? 'bg-rose-400 animate-pulse' : 'bg-stone-300'
              }`}
            />
            <span>Highlight 3σ {highlightOutliers ? 'On' : 'Off'}</span>
          </button>

          {/* Quick Filter: Outliers Only */}
          {outlierAnalysis.hasAnyOutliers && (
            <button
              type="button"
              id="filter-outliers-only-btn"
              onClick={() => {
                setFilterOutliersOnly(!filterOutliersOnly);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                filterOutliersOnly
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
              }`}
              title="Show only rows with values outside 3 standard deviations"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterOutliersOnly ? 'Showing Outliers Only' : 'Filter Outliers Only'}</span>
            </button>
          )}

          {/* Quick Sparklines Toggle */}
          {numericColumns.length > 0 && (
            <button
              type="button"
              id="toggle-sparkline-col-btn"
              onClick={() => setShowSparklineColumn(!showSparklineColumn)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                showSparklineColumn
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-2xs'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
              title="Toggle miniature sparkline chart column for numeric trends relative to column distribution"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sparklines {showSparklineColumn ? 'On' : 'Off'}</span>
            </button>
          )}

          {/* Multi-Row Selection Indicator & Quick Actions */}
          {selectedRowIndices.size > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-700" />
              <span>{selectedRowIndices.size} Selected</span>
              <button
                type="button"
                id="clear-selected-rows-btn"
                onClick={clearAllSelected}
                className="ml-1 p-0.5 hover:bg-indigo-200/90 rounded text-indigo-800 cursor-pointer transition-colors"
                title="Deselect all rows"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick Filter: Selected Rows Only */}
          {selectedRowIndices.size > 0 && (
            <button
              type="button"
              id="filter-selected-only-btn"
              onClick={() => {
                setFilterSelectedOnly(!filterSelectedOnly);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                filterSelectedOnly
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50'
              }`}
              title="Filter table to show only selected rows"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterSelectedOnly ? 'Showing Selected Only' : 'Filter Selected'}</span>
            </button>
          )}

          {/* Click-to-Select Row Toggle */}
          <button
            type="button"
            id="toggle-row-click-selection-btn"
            onClick={() => setEnableRowClickSelection(!enableRowClickSelection)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              enableRowClickSelection
                ? 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 shadow-2xs'
                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
            }`}
            title={
              enableRowClickSelection
                ? 'Click-to-Select is active: click anywhere on a row or its checkbox to select it (supports Shift+Click range)'
                : 'Click-to-Select is off: use checkboxes to select rows'
            }
          >
            <CheckSquare className={`w-3.5 h-3.5 ${enableRowClickSelection ? 'text-indigo-600' : 'text-stone-400'}`} />
            <span>Click to Select {enableRowClickSelection ? 'On' : 'Off'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 justify-end">
          {/* Column Visibility Selector */}
          <div className="relative">
            <button
              id="data-table-columns-btn"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
            >
              <Columns className="w-3.5 h-3.5 text-stone-600" />
              <span>Columns ({visibleColumnKeys.length + (showSparklineColumn && numericColumns.length > 0 ? 1 : 0)})</span>
            </button>

            {showColumnDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowColumnDropdown(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-52 max-h-64 overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-lg z-50 p-2 text-xs">
                  <div className="font-semibold text-stone-700 mb-1 px-1">Toggle Columns</div>
                  {numericColumns.length > 0 && (
                    <label className="flex items-center gap-2 px-1.5 py-1 hover:bg-indigo-50/60 rounded cursor-pointer text-indigo-900 font-semibold border-b border-stone-100 mb-1 pb-1">
                      <input
                        type="checkbox"
                        checked={showSparklineColumn}
                        onChange={() => setShowSparklineColumn(!showSparklineColumn)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 truncate">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Trend Sparkline ({numericColumns.length})</span>
                      </span>
                    </label>
                  )}
                  {columns.map((col) => (
                    <label
                      key={col.name}
                      className="flex items-center gap-2 px-1.5 py-1 hover:bg-stone-50 rounded cursor-pointer text-stone-600"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumnKeys.includes(col.name)}
                        onChange={() => toggleColumn(col.name)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="truncate">{col.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Delete Selected Button - dynamically displayed near Export button when rows are selected */}
          {selectedRowIndices.size > 0 && (
            <button
              type="button"
              id="delete-selected-btn"
              data-testid="delete-selected-btn"
              onClick={() => handleDeleteRows()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 border border-rose-600 rounded-lg shadow-xs transition-colors cursor-pointer animate-in fade-in"
              title={`Delete ${selectedRowIndices.size} selected row${selectedRowIndices.size > 1 ? 's' : ''}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-700 text-[10px] font-mono">
                {selectedRowIndices.size}
              </span>
            </button>
          )}

          {/* Export filtered rows */}
          <button
            id="data-table-export-csv-btn"
            data-testid="data-table-export-csv-btn"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
            title="Export currently filtered table rows to CSV"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Active Outlier Filter Banner */}
      {filterOutliersOnly && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>3σ Outlier Filter Active:</span>
            </span>
            <span>
              Showing {filteredData.length} records with values outside 3 standard deviations (±3σ).
            </span>
            {selectedOutlierColumn !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-white text-rose-800 font-semibold border border-rose-300">
                Column: {selectedOutlierColumn}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterOutliersOnly(false);
              setSelectedOutlierColumn('all');
            }}
            className="font-semibold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Show All Records</span>
          </button>
        </div>
      )}

      {/* Active Multi-Row Selection Filter Banner */}
      {filterSelectedOnly && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <span>Selection Filter Active:</span>
            </span>
            <span>
              Showing {filteredData.length} records currently selected.
            </span>
          </div>
          <button
            type="button"
            id="reset-selection-filter-btn"
            onClick={() => setFilterSelectedOnly(false)}
            className="font-semibold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Show All Records</span>
          </button>
        </div>
      )}

      {/* Horizontal Column Slider for easy viewing on PC & mobile */}
      <div className="px-3 py-2 border-b border-stone-100 bg-stone-50/40">
        <HorizontalSlider 
          targetRef={tableContainerRef} 
          label="Table Columns Slider" 
          stepAmount={220}
        />
      </div>

      {/* Main Table */}
      <div ref={tableContainerRef} className="overflow-x-auto scroll-smooth">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600">
              {/* Row Multi-Selection Checkbox Column Header */}
              <th 
                className="py-2.5 px-3 w-10 text-center font-semibold text-stone-500 select-none cursor-pointer hover:bg-stone-100"
                title={isAllPageSelected ? 'Deselect all rows on this page' : 'Select all rows on this page'}
                onClick={() => handleSort('__selected')}
              >
                <div 
                  className="flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    id="select-all-page-checkbox"
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomePageSelected;
                    }}
                    onChange={toggleSelectAllPage}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    title={isAllPageSelected ? 'Deselect all rows on this page' : 'Select all rows on this page'}
                  />
                </div>
              </th>
              <th className="py-2.5 px-3 w-14 text-center font-semibold text-stone-500">#</th>
              {showSparklineColumn && numericColumns.length > 0 && (
                <th
                  id="data-table-sparkline-header"
                  onClick={() => handleSort('__sparkline')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-stone-100 transition-colors select-none text-stone-700 whitespace-nowrap min-w-[170px]"
                  title="Miniature sparkline chart: visualizes data trends across numeric columns relative to each column's distribution. Click to sort rows by overall relative score."
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {numericColumns.length === 1 ? 'Distribution' : 'Row Trend'} ({numericColumns.length} num)
                    </span>
                    <span className="text-stone-400">
                      {sortKey === '__sparkline' ? (
                        sortAsc ? (
                          <ChevronUp className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-indigo-600" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>
              )}
              {columns
                .filter((c) => visibleColumnKeys.includes(c.name))
                .map((col) => {
                  const isSorted = sortKey === col.name;
                  const colStats = outlierAnalysis.columnStats[col.name];
                  const hasColOutliers = colStats && colStats.outlierCount > 0;

                  return (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-stone-100 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{col.name}</span>
                        {hasColOutliers && highlightOutliers && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-700 border border-rose-200"
                            title={`${colStats.outlierCount} value(s) in "${col.name}" fall outside 3 standard deviations [${colStats.lowerBound.toFixed(1)}, ${colStats.upperBound.toFixed(1)}]`}
                          >
                            3σ ({colStats.outlierCount})
                          </span>
                        )}
                        <span className="text-stone-400">
                          {isSorted ? (
                            sortAsc ? (
                              <ChevronUp className="w-3 h-3 text-indigo-600" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-indigo-600" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      </div>
                    </th>
                  );
                })}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnKeys.length + 2 + (showSparklineColumn && numericColumns.length > 0 ? 1 : 0)}
                  className="py-8 text-center text-stone-500 text-xs"
                >
                  {filterSelectedOnly
                    ? 'No selected records found. Use the checkboxes or click rows to select records.'
                    : filterOutliersOnly
                    ? 'No 3-sigma outlier records found for the selected criteria.'
                    : 'No matching records found.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const globalIdx = (page - 1) * pageSize + idx + 1;
                const rowOutlierInfo = outlierAnalysis.getRowOutlierInfo(row.__origIndex);
                const isOutlierRow = highlightOutliers && rowOutlierInfo.hasOutlier;
                const isSelected = selectedRowIndices.has(row.__origIndex);

                return (
                  <tr
                    key={row.__origIndex ?? idx}
                    onClick={(e) => handleRowClick(e, row.__origIndex, (page - 1) * pageSize + idx)}
                    data-checked={isSelected}
                    data-selected={isSelected}
                    aria-selected={isSelected}
                    className={`transition-colors select-text ${
                      enableRowClickSelection ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? isOutlierRow
                          ? 'bg-purple-100/90 hover:bg-purple-200/80 border-l-4 border-l-purple-600 ring-2 ring-inset ring-purple-400 font-medium text-stone-950 shadow-2xs'
                          : 'bg-indigo-50/90 hover:bg-indigo-100/80 border-l-4 border-l-indigo-600 ring-1 ring-inset ring-indigo-300 font-medium text-stone-950 shadow-2xs'
                        : isOutlierRow
                        ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500 text-stone-900 font-medium'
                        : 'hover:bg-stone-50/80 text-stone-700'
                    }`}
                    title={
                      enableRowClickSelection
                        ? isSelected
                          ? 'Row is selected. Click or uncheck to deselect.'
                          : 'Click to select this row (Shift+Click to select a range).'
                        : undefined
                    }
                  >
                    {/* Row Selection Checkbox */}
                    <td 
                      className="py-2 px-3 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        id={`select-row-checkbox-${row.__origIndex}`}
                        data-testid="row-checkbox"
                        checked={isSelected}
                        aria-checked={isSelected}
                        data-checked={isSelected}
                        aria-label={`Select row ${globalIdx}`}
                        onChange={(e) => 
                          handleToggleRowSelection(
                            row.__origIndex, 
                            (page - 1) * pageSize + idx, 
                            (e.nativeEvent as MouseEvent).shiftKey
                          )
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer align-middle transition-transform hover:scale-110"
                        title={isSelected ? 'Click to deselect this row' : 'Click to select this row (Shift+Click for range)'}
                      />
                    </td>

                    {/* Row Index */}
                    <td className="py-2 px-3 text-center text-stone-500 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span>{globalIdx}</span>
                        {isSelected && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-200/90 text-indigo-950 font-bold text-[9px] border border-indigo-300 shadow-3xs"
                            title="Row is selected for bulk operations"
                          >
                            Selected
                          </span>
                        )}
                        {isOutlierRow && (
                          <span
                            className="inline-flex items-center px-1 py-0.2 rounded bg-rose-200 text-rose-900 font-bold text-[9px] border border-rose-300"
                            title={`3σ Outlier Row: Contains ${rowOutlierInfo.outlierDetails.length} value(s) > 3 standard deviations from mean (${rowOutlierInfo.outlierColumns.join(', ')})`}
                          >
                            3σ
                          </span>
                        )}
                      </div>
                    </td>
                    {showSparklineColumn && numericColumns.length > 0 && (
                      <td className="py-2 px-3 whitespace-nowrap">
                        <RowSparkline
                          row={row}
                          numericColumns={numericColumns}
                          columnStats={outlierAnalysis.columnStats}
                          isOutlierRow={isOutlierRow}
                        />
                      </td>
                    )}
                    {columns
                      .filter((c) => visibleColumnKeys.includes(c.name))
                      .map((col) => {
                        const cellVal = row[col.name];
                        const isNum = col.type === 'number';
                        const cellOutlier =
                          highlightOutliers && isNum
                            ? outlierAnalysis.getCellOutlierInfo(col.name, cellVal)
                            : null;

                        return (
                          <td
                            key={col.name}
                            className={`py-2 px-3 truncate max-w-[220px] ${
                              isNum ? 'font-mono text-stone-900' : ''
                            }`}
                          >
                            {cellOutlier ? (
                              <div
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-100/90 text-rose-950 border border-rose-300 font-bold shadow-2xs group relative cursor-help"
                                title={`3σ Outlier in "${col.name}": Value ${cellOutlier.value.toLocaleString()} (${cellOutlier.deviationDescription})\nColumn Mean: ${cellOutlier.mean.toFixed(2)}, Std Dev: ${cellOutlier.stdDev.toFixed(2)}\n3σ Range: [${cellOutlier.lowerBound.toFixed(2)} to ${cellOutlier.upperBound.toFixed(2)}]`}
                              >
                                <span>{cellVal !== undefined && cellVal !== null ? (typeof cellVal === 'number' ? cellVal.toLocaleString() : String(cellVal)) : '-'}</span>
                                <span className="inline-flex items-center text-[10px] px-1 py-0.2 rounded bg-rose-200/90 text-rose-900 font-mono font-bold tracking-tight">
                                  {cellOutlier.direction === 'high' ? '▲' : '▼'} {cellOutlier.zScore > 0 ? `+${cellOutlier.zScore.toFixed(1)}σ` : `${cellOutlier.zScore.toFixed(1)}σ`}
                                </span>
                              </div>
                            ) : (
                              cellVal !== undefined && cellVal !== null
                                ? typeof cellVal === 'number'
                                  ? cellVal.toLocaleString()
                                  : String(cellVal)
                                : '-'
                            )}
                          </td>
                        );
                      })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Horizontal Slider */}
      <div className="px-3 py-2 border-t border-stone-100 bg-stone-50/30">
        <HorizontalSlider 
          targetRef={tableContainerRef} 
          label="Table Columns Slider" 
          stepAmount={220}
        />
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600 bg-stone-50/50">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 bg-white border border-stone-200 rounded text-xs focus:outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-stone-600">
            Showing {sortedData.length === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, sortedData.length)} of {sortedData.length} records
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="prev-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            id="next-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Persistent Multi-Row Selection Action Bar */}
      {selectedRowIndices.size > 0 && (
        <div className="sticky bottom-3 z-30 mx-auto w-full px-3 py-1 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="pointer-events-auto bg-stone-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-stone-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Selection Counter & Selection Helpers */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs font-bold">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-bold text-stone-100">
                  <span className="text-sm font-mono text-indigo-400 font-extrabold">{selectedRowIndices.size}</span>
                  <span>row{selectedRowIndices.size === 1 ? '' : 's'} selected</span>
                  <span className="text-stone-400 font-normal">of {filteredData.length} records</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedRowIndices.size < filteredData.length ? (
                    <button
                      type="button"
                      id="action-bar-select-all-filtered-btn"
                      onClick={selectAllFiltered}
                      className="text-[11px] text-indigo-300 hover:text-indigo-200 underline font-medium cursor-pointer"
                    >
                      Select all {filteredData.length} records
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> All {filteredData.length} records selected
                    </span>
                  )}
                  <span className="text-stone-500">•</span>
                  <button
                    type="button"
                    id="action-bar-deselect-btn"
                    onClick={clearAllSelected}
                    className="text-[11px] text-stone-400 hover:text-white underline cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Bulk Action Operations */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter / Isolate Selected in Table */}
              <button
                type="button"
                id="action-bar-filter-selected-btn"
                onClick={() => {
                  setFilterSelectedOnly(!filterSelectedOnly);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  filterSelectedOnly
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                }`}
                title="Isolate table view to only show selected rows"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{filterSelectedOnly ? 'Showing Selected' : 'Isolate Selected'}</span>
              </button>

              {/* Copy Selected as JSON */}
              <button
                type="button"
                id="action-bar-copy-selected-btn"
                onClick={handleCopySelected}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer"
                title="Copy selected records as formatted JSON to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>

              {/* Export Selected to CSV */}
              <button
                type="button"
                id="action-bar-export-selected-btn"
                onClick={handleExportSelected}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer"
                title="Export selected rows to a CSV file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Selected ({selectedRowIndices.size})</span>
              </button>

              {/* Delete Selected Rows */}
              <button
                type="button"
                id="action-bar-delete-selected-btn"
                onClick={() => handleDeleteRows()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors cursor-pointer"
                title="Delete all selected rows from dataset"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>

              {/* Dismiss Action Bar */}
              <button
                type="button"
                id="action-bar-close-btn"
                onClick={clearAllSelected}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer ml-1"
                title="Deselect all rows and close action bar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Selected Rows Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-stone-100 flex items-start gap-3 bg-rose-50/70">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-950">
                  Delete {selectedRowIndices.size} Selected Record{selectedRowIndices.size > 1 ? 's' : ''}?
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  This action will remove <span className="font-semibold text-rose-900">{selectedRowIndices.size}</span> selected row{selectedRowIndices.size > 1 ? 's' : ''} from <strong>{datasetName}</strong>.
                  All charts, metrics, and correlation heatmaps will automatically re-calculate.
                </p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 text-xs text-stone-600 max-h-48 overflow-y-auto space-y-1.5 border-b border-stone-100 font-mono">
              <span className="text-[11px] font-sans font-semibold text-stone-500 uppercase tracking-wider block">
                Preview of rows to be deleted:
              </span>
              {indexedData
                .filter((r) => selectedRowIndices.has(r.__origIndex))
                .slice(0, 5)
                .map((r, i) => (
                  <div key={i} className="p-1.5 bg-white rounded border border-stone-200 truncate text-[11px]">
                    Row #{r.__origIndex + 1}: {Object.entries(r).filter(([k]) => !k.startsWith('__')).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                  </div>
                ))}
              {selectedRowIndices.size > 5 && (
                <div className="text-[11px] text-stone-500 font-sans italic pt-1">
                  + {selectedRowIndices.size - 5} more records...
                </div>
              )}
            </div>

            <div className="p-3.5 bg-white flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="cancel-delete-modal-btn"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-modal-btn"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete ({selectedRowIndices.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-xl shadow-xl border border-stone-700 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Outlier Detection Analysis Modal / Inspector */}
      {showOutlierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Automated Outlier Detection (±3rd Standard Deviation)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Identifies values falling beyond 3 standard deviations from column mean (|z| &gt; 3.0)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOutlierModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Formula & Rule explanation card */}
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-stone-700 space-y-1">
                  <span className="font-semibold text-indigo-950 block">The Three-Sigma Rule (Empirical Rule)</span>
                  <p className="text-[11px] leading-relaxed text-stone-600">
                    In statistical analysis, 99.73% of values in a normal distribution fall within 3 standard deviations (μ ± 3σ).
                    Any observation with |z| = |(x - μ) / σ| &gt; 3 is classified as a significant statistical outlier requiring investigation.
                  </p>
                </div>
              </div>

              {/* Overall Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="text-[11px] text-stone-500 font-medium">Outlier Rows</div>
                  <div className="text-xl font-bold text-rose-600 font-mono mt-0.5">
                    {outlierAnalysis.totalRowsWithOutliers}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">of {data.length} total rows</div>
                </div>

                <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="text-[11px] text-stone-500 font-medium">Outlier Cells</div>
                  <div className="text-xl font-bold text-stone-900 font-mono mt-0.5">
                    {outlierAnalysis.totalOutlierCells}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">across numeric metrics</div>
                </div>

                <div className="p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <div className="text-[11px] text-stone-500 font-medium">Analyzed Columns</div>
                  <div className="text-xl font-bold text-indigo-600 font-mono mt-0.5">
                    {outlierAnalysis.numericColumnKeys.length}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">numeric attributes</div>
                </div>
              </div>

              {/* Per-Column Statistics Table */}
              <div>
                <h4 className="text-xs font-bold text-stone-800 mb-2">Column-by-Column 3σ Thresholds</h4>
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Column</th>
                        <th className="py-2 px-3 text-right">Mean (μ)</th>
                        <th className="py-2 px-3 text-right">Std Dev (σ)</th>
                        <th className="py-2 px-3 text-center">3σ Normal Range [μ - 3σ, μ + 3σ]</th>
                        <th className="py-2 px-3 text-center">Outliers</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono">
                      {outlierAnalysis.numericColumnKeys.map((colKey) => {
                        const stat = outlierAnalysis.columnStats[colKey];
                        if (!stat) return null;
                        const hasOutliers = stat.outlierCount > 0;

                        return (
                          <tr
                            key={colKey}
                            className={`hover:bg-stone-50/80 ${hasOutliers ? 'bg-rose-50/30' : ''}`}
                          >
                            <td className="py-2 px-3 font-sans font-semibold text-stone-800">
                              {colKey}
                            </td>
                            <td className="py-2 px-3 text-right text-stone-700">
                              {stat.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right text-stone-700">
                              {stat.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-center text-stone-600 text-[11px]">
                              [{stat.lowerBound.toLocaleString(undefined, { maximumFractionDigits: 1 })} to {stat.upperBound.toLocaleString(undefined, { maximumFractionDigits: 1 })}]
                            </td>
                            <td className="py-2 px-3 text-center">
                              {hasOutliers ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  {stat.outlierCount} ({stat.highOutlierCount} high, {stat.lowOutlierCount} low)
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-semibold text-[11px] font-sans">0</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-sans">
                              {hasOutliers ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOutlierColumn(colKey);
                                    setFilterOutliersOnly(true);
                                    setShowOutlierModal(false);
                                    setPage(1);
                                  }}
                                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                                >
                                  Filter
                                </button>
                              ) : (
                                <span className="text-stone-300 text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterOutliersOnly(true);
                    setSelectedOutlierColumn('all');
                    setShowOutlierModal(false);
                    setPage(1);
                  }}
                  disabled={!outlierAnalysis.hasAnyOutliers}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  View All Outlier Rows ({outlierAnalysis.totalRowsWithOutliers})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHighlightOutliers(true);
                    setFilterOutliersOnly(false);
                    setSelectedOutlierColumn('all');
                    setShowOutlierModal(false);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 font-semibold border border-stone-200 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Highlight All Rows
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowOutlierModal(false)}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
