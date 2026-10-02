import { Component, type ReactNode } from 'react';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="text-center space-y-4">
            <p className="text-lg font-bold text-slate-900">حدث خطأ غير متوقع</p>
            <p className="text-sm text-slate-500">يرجى إعادة تحميل الصفحة</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              إعادة تحميل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
