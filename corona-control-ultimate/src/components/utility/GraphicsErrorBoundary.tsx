import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * GraphicsErrorBoundary
 * Fängt kritische Rendering-Fehler (WebGL Context Loss) ab.
 */
class GraphicsErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error in Graphics Layer:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload(); // Hard reload for now to clear WebGL context issues entirely
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: '#1a1a1a', color: 'white', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999, fontFamily: 'monospace'
                }}>
                    <h1 style={{ color: '#ff4444', fontSize: '3rem', marginBottom: '1rem' }}>GRAFIK-FEHLER</h1>
                    <div style={{ maxWidth: '600px', textAlign: 'center', marginBottom: '2rem', color: '#aaa' }}>
                        Die 3D-Engine ist abgestürzt. Dies kann durch einen WebGL-Context-Verlust oder einen internen Render-Fehler verursacht worden sein.
                    </div>
                    <div style={{ background: '#333', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', border: '1px solid #555' }}>
                        {this.state.error?.message || 'Unbekannter Fehler'}
                    </div>
                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '1rem 3rem', fontSize: '1.5rem', background: '#ff4444', color: 'white',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        NEUSTARTEN
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GraphicsErrorBoundary;
