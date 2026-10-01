import React from 'react';
import { 
  BarChart3, 
  UploadCloud, 
  Download, 
  RefreshCw, 
  Database, 
  SlidersHorizontal,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Info,
  User
} from 'lucide-react';
import { DatasetPreset } from '../types';
import { AuthUser } from './SignInPage';

interface HeaderProps {
  currentDataset: DatasetPreset;
  availablePresets: DatasetPreset[];
  onSelectPreset: (preset: DatasetPreset) => void;
  onOpenImportModal: () => void;
  onResetFilters: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  rowCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  authUser?: AuthUser | null;
  onNavigateLanding?: () => void;
  onNavigateSignIn?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDataset,
  availablePresets,
  onSelectPreset,
  onOpenImportModal,
  onResetFilters,
  onExportCSV,
  onExportJSON,
  rowCount,
  filteredCount,
  hasActiveFilters,
  toggleSidebar,
  isSidebarOpen,
  authUser,
  onNavigateLanding,
  onNavigateSignIn,
  onSignOut,
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 max-w-7xl mx-auto">
        {/* Left branding and dataset indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white shadow-sm">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-stone-900 tracking-tight">
                Data Studio
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {currentDataset.name}
              </span>
            </div>
            <p className="text-xs text-stone-700">
              Visualizing <span className="font-semibold text-stone-900">{filteredCount}</span> of{' '}
              <span className="text-stone-800">{rowCount}</span> rows
              {hasActiveFilters && (
                <span className="ml-1 text-amber-700 font-medium">(filtered)</span>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons & controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Preset Selector */}
          <div className="relative inline-flex items-center">
            <Database className="w-3.5 h-3.5 absolute left-2.5 text-stone-600 pointer-events-none" />
            <select
              id="dataset-preset-select"
              value={currentDataset.id}
              onChange={(e) => {
                const found = availablePresets.find((p) => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="pl-8 pr-7 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              {availablePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Import / Provide Your Data Button */}
          <button
            id="open-import-modal-btn"
            onClick={onOpenImportModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Provide / Paste Data</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              id="export-menu-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors focus:outline-none"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-40 bg-white border border-stone-200 rounded-lg shadow-lg z-50 py-1 text-xs text-stone-700">
                  <button
                    id="export-csv-btn"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCSV();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-stone-100 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download as CSV</span>
                  </button>
                  <button
                    id="export-json-btn"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportJSON();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-stone-100 flex items-center gap-2"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Download as JSON</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              id="reset-filters-btn"
              onClick={onResetFilters}
              title="Reset all filters and category isolation"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          <div className="h-4 w-px bg-stone-200 mx-0.5 hidden sm:block" />

          {/* User Account or Sign In */}
          {authUser ? (
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-lg text-xs">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <div className="text-[11px] leading-tight text-left hidden sm:block">
                <span className="font-semibold text-stone-900 block truncate max-w-[120px]">
                  {authUser.name}
                </span>
                <span className="text-[10px] text-stone-500 font-mono truncate block max-w-[130px]">
                  {authUser.email}
                </span>
              </div>
              <button
                id="header-signout-btn"
                onClick={onSignOut}
                title="Sign out"
                className="text-stone-600 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="header-signin-btn"
              onClick={onNavigateSignIn}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors cursor-pointer"
              title="Sign In"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sign In</span>
            </button>
          )}

          {/* About / Institution Portal Button */}
          {onNavigateLanding && (
            <button
              id="header-about-btn"
              onClick={onNavigateLanding}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title="About Data Studio"
            >
              <Info className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden md:inline">About</span>
            </button>
          )}

          {/* Customize Sidebar Toggle for mobile and tablet screens */}
          <button
            id="toggle-config-sidebar-btn"
            onClick={toggleSidebar}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors lg:hidden cursor-pointer ${
              isSidebarOpen 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
            title="Toggle Settings & Chart Controls"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isSidebarOpen ? 'Close Settings' : 'Settings'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
