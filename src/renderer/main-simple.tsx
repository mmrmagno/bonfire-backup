import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('=== SIMPLE REACT STARTING ===');

// Simple test component
function TestApp() {
  console.log('TestApp component rendering');
  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #111827, #1f2937, #000)',
      color: '#f97316',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔥 REACT IS WORKING! 🔥</h1>
        <p style={{ fontSize: '1.5rem', color: '#fdba74' }}>Bonfire Backup - Test Mode</p>
        <p style={{ fontSize: '1rem', color: '#9ca3af', marginTop: '1rem' }}>
          ElectronAPI Available: {window.electronAPI ? '✅ YES' : '❌ NO'}
        </p>
      </div>
    </div>
  );
}

try {
  console.log('Getting root element...');
  const rootElement = document.getElementById('root');
  
  if (rootElement) {
    console.log('Root found, creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('Rendering TestApp...');
    root.render(<TestApp />);
    
    console.log('=== REACT RENDERED SUCCESSFULLY ===');
  } else {
    console.error('No root element found!');
  }
} catch (error) {
  console.error('=== REACT FAILED ===', error);
}