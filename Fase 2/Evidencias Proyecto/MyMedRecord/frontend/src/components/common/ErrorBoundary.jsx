import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-blue-950">Se produjo un error visual</h2>
            <p className="text-xs text-stone-500">
              Ocurrió un problema al cargar esta vista. Puedes recargar la aplicación para continuar.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4 text-teal-300" />
              <span>Recargar Página</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
