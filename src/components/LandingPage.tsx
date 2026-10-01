import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  Table, 
  MousePointerClick, 
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';

interface LandingPageProps {
  onGoToSignIn: () => void;
  onExploreDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToSignIn, onExploreDemo }) => {
  return (
    <div className="min-h-screen bg-stone-50/70 text-stone-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 text-base tracking-tight">Data Studio</span>
                <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60">
                  Analytics Platform
                </span>
              </div>
              <p className="text-xs text-stone-700">Interactive Visual Analytics & Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExploreDemo}
              className="text-xs font-semibold text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Guest Preview
            </button>
            <button
              onClick={onGoToSignIn}
              id="landing-signin-nav-btn"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 sm:px-8 pt-12 pb-16 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-medium">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span>Interactive Visual Analytics & Data Intelligence Suite</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
          Visual Analytics, Trend Forecasting & Detail Drill-Down
        </h1>

        <p className="text-base sm:text-lg text-stone-600 max-w-3xl mx-auto leading-relaxed">
          A full-featured exploratory data platform built for intuitive visual analysis. 
          Upload datasets, overlay automated linear and polynomial regression trend lines, customize series palettes, 
          and click any chart category to drill down directly into granular records.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          <button
            onClick={onGoToSignIn}
            id="landing-signin-hero-btn"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onExploreDemo}
            id="landing-explore-demo-btn"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 px-6 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>Explore Live Dashboard</span>
          </button>
        </div>

        {/* Verification Notice */}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-stone-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sign in with any valid Gmail account ending in <strong>@gmail.com</strong></span>
        </div>
      </section>

      {/* What the App is About */}
      <section className="px-4 sm:px-8 py-12 bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Overview</h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-stone-900">What is Data Studio?</h3>
            <p className="text-sm text-stone-600">
              A high-performance workspace engineered to transform raw relational records into 
              actionable business intelligence, statistical forecasts, and deep-dive discoveries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-stone-900">Multi-Dimensional Charting</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Seamlessly toggle between Bar, Line, Area, Donut, Scatter, Radar, Composed, and 
                Cross-tabulation Heatmaps with custom series color overrides.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-stone-900">Mathematical Trendlines</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Automatically calculates and overlays linear (1°) and polynomial quadratic (2°) 
                regression equations with real-time R² goodness-of-fit indicators.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-stone-900">Interactive Category Drill-Down</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Click any bar or slice to instantly isolate detail-level records for that category, 
                with a prominent one-click 'Back' button to reset the filter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How They Can Use It: Step-by-Step Guide */}
      <section className="px-4 sm:px-8 py-16 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Workflow</h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-stone-900">How You Can Use The Platform</h3>
          <p className="text-sm text-stone-600">
            Follow this simple four-step workflow to analyze your data from high-level summaries down to individual rows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs relative flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <Database className="w-4 h-4 text-stone-400" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">Load or Upload Data</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Select from ready-to-use institutional and business datasets (Apparel Retail, Financials, Tech Sales) 
                or import your own custom CSV/JSON records.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-indigo-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Instant schema detection
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs relative flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <Layers className="w-4 h-4 text-stone-400" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">Configure Dimensions</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Map X and Y axes, choose aggregation rules (Sum, Mean, Count), customize series colors with hex swatches, 
                and switch between stacked or vertical layouts.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-indigo-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Granular color overrides
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs relative flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <TrendingUp className="w-4 h-4 text-stone-400" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">Overlay Trendlines</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Enable automatic trend forecasting for time-series charts. Evaluate direction, regression formulas, 
                and R² statistical fits instantly.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-indigo-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Linear & Polynomial models
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs relative flex flex-col justify-between border-indigo-200 ring-1 ring-indigo-100">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  4
                </span>
                <MousePointerClick className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">Click & Drill Down</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Click any bar or slice to filter down to detail-level records. Inspect raw table rows with search and sorting, 
                then click <strong>'Back'</strong> to reset!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 1-Click Back button reset
            </div>
          </div>
        </div>
      </section>

      {/* Footer Call to Action */}
      <section className="bg-stone-900 text-white px-4 sm:px-8 py-12 mt-auto">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 text-stone-300 text-xs border border-stone-700">
            <span>Data Studio • Interactive Visual Analytics</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to explore and analyze your datasets?
          </h3>
          <p className="text-sm text-stone-400 max-w-xl mx-auto">
            Log in using your <strong>@gmail.com</strong> email address to launch your secure dashboard session.
          </p>
          <div className="pt-2">
            <button
              onClick={onGoToSignIn}
              className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900 bg-white hover:bg-stone-100 px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
