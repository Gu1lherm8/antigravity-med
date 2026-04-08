import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    this.setState({ error, info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '2rem', background: 'red', color: 'white', zIndex: 99999, position: 'absolute', inset: 0}}>
          <h1>Crash Detectado pelo Antigravity!</h1>
          <pre>{this.state.error?.toString() || 'Erro desconhecido'}</pre>
          <pre>{this.state.info?.componentStack || 'Sem stack disponível'}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
