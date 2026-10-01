import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Download, MousePointerClick, Search, Trash2, X } from 'lucide-react';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import { DatasetPreset, DashboardConfig, FilterRule, DataRow, SelectedCategoryFilter } from './types';
import { 
  extractColumnMetadata, 
  applyFilters, 
  aggregateChartData, 
  exportToCSV, 
  exportToJSON 
} from './utils/dataParser';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { ChartControls } from './components/ChartControls';
import { ChartContainer } from './components/ChartContainer';
import { FilterBar } from './components/FilterBar';
import { DataTable } from './components/DataTable';
import { DataImportModal } from './components/DataImportModal';
import { LandingPage } from './components/LandingPage';
import { SignInPage, AuthUser } from './components/SignInPage';

type AppView = 'dashboard' | 'landing' | 'signin';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [presets, setPresets] = useState<DatasetPreset[]>(SAMPLE_DATASETS);
  const [currentPreset, setCurrentPreset] = useState<DatasetPreset>(SAMPLE_DATASETS[0]);
  const [data, setData] = useState<DataRow[]>(SAMPLE_DATASETS[0].data);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategoryFilter | null>(null);
  const [detailRowsSearch, setDetailRowsSearch] = useState<string>('');
  const [selectedDetailRows, setSelectedDetailRows] = useState<DataRow[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const handleSignInSuccess = (user: AuthUser) => {
    setAuthUser(user);
    try {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } catch {}
    setCurrentView('dashboard');
  };

  const handleSignOut = () => {
    setAuthUser(null);
    try {
      localStorage.removeItem('auth_user');
    } catch {}
  };

  // Column metadata extracted from the current dataset
  const columns = useMemo(() => extractColumnMetadata(data), [data]);

  // Initial dashboard config from preset or deduced from columns
  const [config, setConfig] = useState<DashboardConfig>(() => {
    const defaultCfg = SAMPLE_DATASETS[0].defaultConfig || {};
    const numCols = columns.filter((c) => c.type === 'number');
    const catCols = columns.filter((c) => c.type === 'string' || c.type === 'date');

    return {
      chartType: defaultCfg.chartType || 'bar',
      xAxisKey: defaultCfg.xAxisKey || catCols[0]?.name || columns[0]?.name || '',
      yAxisKeys: defaultCfg.yAxisKeys || (numCols.length > 0 ? [numCols[0].name] : [columns[0]?.name || '']),
      groupByKey: defaultCfg.groupByKey,
      aggregation: defaultCfg.aggregation || 'sum',
      isStacked: defaultCfg.isStacked ?? false,
      isHorizontal: defaultCfg.isHorizontal ?? false,
      showGrid: defaultCfg.showGrid ?? true,
      showLegend: defaultCfg.showLegend ?? true,
      showLabels: defaultCfg.showLabels ?? false,
      paletteId: defaultCfg.paletteId || 'corporate-indigo',
      secondaryMetricKey: defaultCfg.secondaryMetricKey,
      heatmapRowKey: defaultCfg.heatmapRowKey,
      heatmapColKey: defaultCfg.heatmapColKey,
      heatmapValKey: defaultCfg.heatmapValKey,
    };
  });

  // Whenever currentPreset changes, update data and config
  const handleSelectPreset = (preset: DatasetPreset) => {
    setCurrentPreset(preset);
    setData(preset.data);
    setFilters([]);
    setSelectedCategory(null);

    const cols = extractColumnMetadata(preset.data);
    const numCols = cols.filter((c) => c.type === 'number');
    const catCols = cols.filter((c) => c.type === 'string' || c.type === 'date');
    const defaultCfg = preset.defaultConfig || {};

    setConfig((prev) => ({
      ...prev,
      chartType: defaultCfg.chartType || prev.chartType,
      xAxisKey: defaultCfg.xAxisKey || catCols[0]?.name || cols[0]?.name || '',
      yAxisKeys: defaultCfg.yAxisKeys || (numCols.length > 0 ? [numCols[0].name] : [cols[0]?.name || '']),
      groupByKey: defaultCfg.groupByKey,
      aggregation: defaultCfg.aggregation || 'sum',
      paletteId: defaultCfg.paletteId || prev.paletteId,
      heatmapRowKey: defaultCfg.heatmapRowKey || catCols[0]?.name,
      heatmapColKey: defaultCfg.heatmapColKey || catCols[1]?.name,
      heatmapValKey: defaultCfg.heatmapValKey || numCols[0]?.name,
      secondaryMetricKey: defaultCfg.secondaryMetricKey || numCols[1]?.name,
    }));
  };

  // When user imports or pastes custom data
  const handleApplyCustomData = (newPreset: DatasetPreset) => {
    setPresets((prev) => [newPreset, ...prev]);
    handleSelectPreset(newPreset);
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return applyFilters(data, filters);
  }, [data, filters]);

  // Detail rows for drilled-down category
  const detailRows = useMemo(() => {
    if (!selectedCategory) return filteredData;
    return filteredData.filter(
      (row) => String(row[selectedCategory.columnKey]) === String(selectedCategory.value)
    );
  }, [filteredData, selectedCategory]);

  // Detail rows filtered across all columns by text search
  const searchedDetailRows = useMemo(() => {
    if (!detailRowsSearch.trim()) return detailRows;
    const term = detailRowsSearch.toLowerCase();
    return detailRows.filter((row) =>
      Object.entries(row).some(([key, val]) => {
        if (key.startsWith('__')) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [detailRows, detailRowsSearch]);

  // Aggregated data for Recharts
  const { chartData, seriesKeys } = useMemo(() => {
    return aggregateChartData(
      filteredData,
      config.xAxisKey,
      config.yAxisKeys,
      config.aggregation,
      config.groupByKey
    );
  }, [filteredData, config.xAxisKey, config.yAxisKeys, config.aggregation, config.groupByKey]);

  // Config updater
  const handleUpdateConfig = (updates: Partial<DashboardConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  // Filter handlers
  const handleAddFilter = (newFilter: FilterRule) => {
    setFilters((prev) => [...prev, newFilter]);
  };

  const handleRemoveFilter = (idx: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearFilters = () => {
    setFilters([]);
    setSelectedCategory(null);
  };

  // Handle bulk deletion of rows from DataTable
  const handleDeleteRows = (rowsToDelete: DataRow[]) => {
    setData((prev) => prev.filter((r) => !rowsToDelete.includes(r)));
  };

  // Exports
  const handleExportCSV = () => {
    exportToCSV(filteredData, `${currentPreset.name.toLowerCase().replace(/\s+/g, '-')}-data.csv`);
  };

  const handleExportJSON = () => {
    exportToJSON(filteredData, `${currentPreset.name.toLowerCase().replace(/\s+/g, '-')}-data.json`);
  };

  if (currentView === 'landing') {
    return (
      <LandingPage
        onGoToSignIn={() => setCurrentView('signin')}
        onExploreDemo={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'signin') {
    return (
      <SignInPage
        onSuccess={handleSignInSuccess}
        onBackToLanding={() => setCurrentView('landing')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/70 text-stone-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <Header
        currentDataset={currentPreset}
        availablePresets={presets}
        onSelectPreset={handleSelectPreset}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onResetFilters={handleClearFilters}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        rowCount={data.length}
        filteredCount={selectedCategory ? detailRows.length : filteredData.length}
        hasActiveFilters={filters.length > 0 || selectedCategory !== null}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        authUser={authUser}
        onNavigateLanding={() => setCurrentView('landing')}
        onNavigateSignIn={() => setCurrentView('signin')}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* KPI Executive Metric Cards */}
        <KpiCards
          data={selectedCategory ? detailRows : filteredData}
          columns={columns}
          primaryMetricKey={config.yAxisKeys[0]}
          secondaryMetricKey={config.yAxisKeys[1] || config.secondaryMetricKey}
        />

        {/* Dynamic Filters Bar */}
        <FilterBar
          columns={columns}
          activeFilters={filters}
          onAddFilter={handleAddFilter}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearFilters}
        />

        {/* Dashboard Center: Controls on Left, Chart on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Configuration Panel */}
          <div
            className={`lg:col-span-4 bg-white border border-stone-200 rounded-xl p-4 shadow-xs ${
              isSidebarOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Visualization Settings
                </h2>
                <p className="text-[11px] text-stone-700">Customize chart type, axes, & metrics</p>
              </div>
              <button
                type="button"
                id="close-sidebar-mobile-btn"
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Close settings"
              >
                <X className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>

            <ChartControls
              config={config}
              columns={columns}
              seriesKeys={seriesKeys}
              chartData={chartData}
              onChangeConfig={handleUpdateConfig}
            />
          </div>

          {/* Right Visual Chart Display */}
          <div className="lg:col-span-8 space-y-4">
            <ChartContainer
              config={config}
              data={filteredData}
              chartData={chartData}
              seriesKeys={seriesKeys}
              columns={columns}
              datasetName={currentPreset.name}
              onChangeConfig={handleUpdateConfig}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onResetCategory={() => setSelectedCategory(null)}
              onDeleteRows={handleDeleteRows}
            />
          </div>
        </div>

        {/* Detail-Level Rows Section (Drill-Down Filter Table) */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              {selectedCategory && (
                <button
                  type="button"
                  id="detail-rows-back-btn"
                  onClick={() => {
                    setSelectedCategory(null);
                    setDetailRowsSearch('');
                    setSelectedDetailRows([]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer group"
                  title="Back to all categories overview"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back (Reset Filter)</span>
                </button>
              )}

              {/* Search input field next to the back button across all columns */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  id="detail-rows-search-input"
                  placeholder="Filter detail rows across columns..."
                  value={detailRowsSearch}
                  onChange={(e) => setDetailRowsSearch(e.target.value)}
                  className="pl-8 pr-7 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-60"
                />
                {detailRowsSearch && (
                  <button
                    type="button"
                    onClick={() => setDetailRowsSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-stone-900">
                    {selectedCategory
                      ? `Detail-Level Rows: ${selectedCategory.columnKey} = "${String(selectedCategory.value)}"`
                      : 'Underlying Dataset Records'}
                  </h2>
                  {selectedCategory ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Drill-Down Active
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500 font-normal hidden sm:inline">
                      (Click any chart item above to drill down)
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {selectedCategory
                    ? `Showing ${searchedDetailRows.length} of ${detailRows.length} underlying row${detailRows.length === 1 ? '' : 's'} associated with "${selectedCategory.value}".`
                    : `Showing all ${searchedDetailRows.length} records. Click any category bar or pie slice to filter down to its exact detail rows.`}
                </p>
              </div>
            </div>

            {selectedCategory && (
              <div className="flex items-center gap-2">
                {selectedDetailRows.length > 0 && (
                  <button
                    type="button"
                    id="detail-rows-delete-selected-btn"
                    onClick={() => {
                      handleDeleteRows(selectedDetailRows);
                      setSelectedDetailRows([]);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 border border-rose-600 rounded-lg shadow-xs transition-colors cursor-pointer animate-in fade-in"
                    title={`Delete ${selectedDetailRows.length} selected row${selectedDetailRows.length > 1 ? 's' : ''}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected</span>
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-700 text-[10px] font-mono">
                      {selectedDetailRows.length}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  id="export-drilldown-category-csv-btn"
                  onClick={() => {
                    exportToCSV(
                      searchedDetailRows,
                      `${currentPreset.name.toLowerCase().replace(/\s+/g, '-')}-${String(selectedCategory.value).toLowerCase().replace(/\s+/g, '-')}-details.csv`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                  title="Export isolated detail rows to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  <span>Export Category CSV</span>
                </button>
              </div>
            )}
          </div>

          <DataTable
            data={searchedDetailRows}
            columns={columns}
            datasetName={selectedCategory ? `${currentPreset.name} - ${selectedCategory.value}` : currentPreset.name}
            onDeleteRows={handleDeleteRows}
            handleDeleteRows={handleDeleteRows}
            onSelectionChange={setSelectedDetailRows}
          />
        </div>
      </main>

      {/* Data Import & Paste Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplyData={handleApplyCustomData}
      />
    </div>
  );
}
