import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: 600, margin: '4rem auto' }}>
          <h2 style={{ color: '#c0392b' }}>Something went wrong</h2>
          <p style={{ color: '#555' }}>
            If you just deployed this app, make sure all{' '}
            <code>VITE_FIREBASE_*</code> environment variables are set in your
            Vercel project settings and redeploy.
          </p>
          <pre style={{
            background: '#f4f4f4', padding: '1rem', borderRadius: 6,
            fontSize: 13, overflowX: 'auto', color: '#c0392b'
          }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
