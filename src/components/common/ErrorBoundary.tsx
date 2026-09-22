import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en la aplicación:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <h1 className="text-xl font-bold text-slate-900">Algo salió mal</h1>
          <p className="text-sm text-slate-600">
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Recargar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
