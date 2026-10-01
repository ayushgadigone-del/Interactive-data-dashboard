import React from 'react';
import { Filter, X, Plus } from 'lucide-react';
import { ColumnMetadata, FilterRule } from '../types';

interface FilterBarProps {
  columns: ColumnMetadata[];
  activeFilters: FilterRule[];
  onAddFilter: (filter: FilterRule) => void;
  onRemoveFilter: (index: number) => void;
  onClearAll: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  columns,
  activeFilters,
  onAddFilter,
  onRemoveFilter,
  onClearAll,
}) => {
  const [selectedCol, setSelectedCol] = React.useState<string>(columns[0]?.name || '');
  const [filterVal, setFilterVal] = React.useState<string>('');
  const [isAdding, setIsAdding] = React.useState(false);

  // Sync selectedCol if columns change
  React.useEffect(() => {
    if (columns.length > 0 && !columns.some((c) => c.name === selectedCol)) {
      setSelectedCol(columns[0].name);
    }
  }, [columns, selectedCol]);

  const currentCol = columns.find((c) => c.name === selectedCol);

  const handleApply = () => {
    if (!selectedCol || !filterVal.trim()) return;

    onAddFilter({
      column: selectedCol,
      operator: currentCol?.type === 'number' ? 'greaterThan' : 'contains',
      value: currentCol?.type === 'number' ? Number(filterVal) : filterVal.trim(),
    });

    setFilterVal('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white border border-stone-200/80 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-stone-500 font-medium mr-1">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Filters:</span>
        </div>

        {activeFilters.length === 0 && !isAdding && (
          <span className="text-stone-600 italic">No active filters. Showing full dataset.</span>
        )}

        {/* Active Filter Chips */}
        {activeFilters.map((filter, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60"
          >
            <span>
              <strong>{filter.column}</strong>{' '}
              {filter.operator === 'greaterThan' ? '≥' : ':'} {String(filter.value)}
            </span>
            <button
              onClick={() => onRemoveFilter(idx)}
              className="hover:text-indigo-900 focus:outline-none"
              title="Remove filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Add Filter Inline Popover */}
        {isAdding ? (
          <div className="inline-flex items-center gap-1.5 p-1 bg-stone-50 rounded-lg border border-stone-200">
            <select
              value={selectedCol}
              onChange={(e) => {
                setSelectedCol(e.target.value);
                setFilterVal('');
              }}
              className="px-2 py-1 bg-white border border-stone-200 rounded text-xs text-stone-800 focus:outline-none"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {currentCol?.distinctCategories && currentCol.distinctCategories.length <= 20 ? (
              <select
                value={filterVal}
                onChange={(e) => setFilterVal(e.target.value)}
                className="px-2 py-1 bg-white border border-stone-200 rounded text-xs text-stone-800 focus:outline-none"
              >
                <option value="">Select option...</option>
                {currentCol.distinctCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={currentCol?.type === 'number' ? 'number' : 'text'}
                placeholder={currentCol?.type === 'number' ? 'Min value...' : 'Contains...'}
                value={filterVal}
                onChange={(e) => setFilterVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                className="w-28 px-2 py-1 bg-white border border-stone-200 rounded text-xs text-stone-800 focus:outline-none"
              />
            )}

            <button
              onClick={handleApply}
              disabled={!filterVal}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-xs font-semibold"
            >
              Apply
            </button>

            <button
              onClick={() => setIsAdding(false)}
              className="p-1 text-stone-500 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            id="add-filter-chip-btn"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-dashed border-stone-300 rounded-full transition-colors"
          >
            <Plus className="w-3 h-3 text-stone-500" />
            <span>Add Filter</span>
          </button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <button
          onClick={onClearAll}
          className="text-stone-500 hover:text-stone-800 text-[11px] underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
};
