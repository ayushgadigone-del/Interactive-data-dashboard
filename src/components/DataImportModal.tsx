import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Code, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  ArrowRight,
  ClipboardPaste
} from 'lucide-react';
import { parseRawData, extractColumnMetadata } from '../utils/dataParser';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { DatasetPreset, DataRow } from '../types';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (preset: DatasetPreset) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'presets'>('paste');
  const [rawInput, setRawInput] = useState('');
  const [datasetName, setDatasetName] = useState('Custom Dataset');
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<DataRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleInputChange = (val: string) => {
    setRawInput(val);
    if (!val.trim()) {
      setParseError(null);
      setPreviewRows([]);
      return;
    }

    const { data, error } = parseRawData(val);
    if (error) {
      setParseError(error);
      setPreviewRows([]);
    } else {
      setParseError(null);
      setPreviewRows(data);
    }
  };

  const handleFileProcess = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setDatasetName(file.name.replace(/\.[^/.]+$/, ''));
        setActiveTab('paste');
        handleInputChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSampleCSV = () => {
    const sample = `Category,Region,Quarter,Sales,Profit,Units
Electronics,North America,Q1,18500,4200,45
Electronics,Europe,Q1,24800,5800,32
Office Supplies,North America,Q1,3200,1100,80
Furniture,Europe,Q1,14200,2900,54
Electronics,Asia Pacific,Q1,29600,7100,88
Office Supplies,Asia Pacific,Q1,5100,1800,140
Furniture,North America,Q2,18900,3800,70
Electronics,North America,Q2,21500,5100,52
Office Supplies,Europe,Q2,4400,1400,110`;
    setDatasetName('Quarterly Category Performance');
    handleInputChange(sample);
  };

  const handleApply = () => {
    if (previewRows.length === 0) return;

    const cols = extractColumnMetadata(previewRows);
    const numCols = cols.filter((c) => c.type === 'number');
    const catCols = cols.filter((c) => c.type === 'string' || c.type === 'date');

    const newPreset: DatasetPreset = {
      id: `custom-${Date.now()}`,
      name: datasetName.trim() || 'Imported Dataset',
      category: 'Custom Import',
      description: `User-provided dataset with ${previewRows.length} rows and ${cols.length} columns.`,
      data: previewRows,
      defaultConfig: {
        chartType: 'bar',
        xAxisKey: catCols[0]?.name || cols[0]?.name || '',
        yAxisKeys: numCols.length > 0 ? [numCols[0].name] : [cols[0].name],
        aggregation: 'sum',
        paletteId: 'corporate-indigo',
        isStacked: false,
        isHorizontal: false,
        showGrid: true,
        showLegend: true,
        showLabels: false,
      },
    };

    onApplyData(newPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        id="data-import-modal-container"
        className="bg-white border border-stone-200 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Provide & Import Your Data
            </h2>
            <p className="text-xs text-stone-500">
              Paste raw CSV or JSON, drop a file, or select a preset dataset to visualize instantly.
            </p>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-200 px-4 bg-stone-50/30 text-xs overflow-x-auto whitespace-nowrap">
          <button
            id="tab-paste-btn"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste CSV / JSON</span>
          </button>
          <button
            id="tab-upload-btn"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            id="tab-presets-btn"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'presets'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sample Datasets</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block">
                    Dataset Title
                  </label>
                  <input
                    id="dataset-name-input"
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="e.g., Marketing Campaign 2024"
                    className="mt-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs w-64 text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePasteSampleCSV}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                >
                  Insert Sample Data Template
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Paste Raw Data (CSV, TSV, or JSON Array)
                </label>
                <textarea
                  id="raw-data-textarea"
                  rows={8}
                  value={rawInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Paste your CSV or JSON data here...&#10;&#10;Example CSV:&#10;Date,Region,Product,Revenue,Units&#10;2024-01-01,North,Widget A,1400,20&#10;2024-01-02,South,Widget B,2100,32"
                  className="w-full font-mono text-xs p-3 bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-stone-800 placeholder:text-stone-400"
                />
              </div>

              {/* Status Banner */}
              {parseError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {previewRows.length > 0 && !parseError && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Successfully parsed {previewRows.length} rows &{' '}
                        {Object.keys(previewRows[0] || {}).length} columns
                      </span>
                    </div>
                  </div>

                  {/* Quick table preview of first 3 rows */}
                  <div className="max-h-36 overflow-x-auto border border-stone-200 rounded-lg text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                        <tr>
                          {Object.keys(previewRows[0] || {}).map((col) => (
                            <th key={col} className="p-2 border-r border-stone-200 truncate">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b border-stone-100">
                            {Object.keys(previewRows[0] || {}).map((col) => (
                              <td key={col} className="p-2 truncate max-w-[150px] text-stone-700">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.json,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/40'
                    : 'border-stone-300 hover:border-indigo-400 bg-stone-50/50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-stone-800">
                  Drop your file here, or browse
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  Supports CSV, TSV, or JSON tabular data files up to 20MB
                </p>
                <button
                  type="button"
                  className="mt-4 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Select File
                </button>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_DATASETS.map((preset) => (
                <div
                  key={preset.id}
                  className="border border-stone-200 rounded-xl p-3.5 hover:border-indigo-500 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mb-1.5">
                      {preset.category}
                    </span>
                    <h4 className="text-xs font-bold text-stone-900">{preset.name}</h4>
                    <p className="text-[11px] text-stone-500 mt-1 line-clamp-3">
                      {preset.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">
                      {preset.data.length} records
                    </span>
                    <button
                      onClick={() => {
                        onApplyData(preset);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>Load</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-stone-200 bg-stone-50/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="apply-dataset-btn"
            disabled={previewRows.length === 0}
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
          >
            <span>Apply to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
