import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const jamLinkStyle = {
  fontFamily: "'system-ui', sans-serif",
  position: 'fixed',
  bottom: '-1px',
  right: '-1px',
  padding: '7px',
  fontSize: '14px',
  fontWeight: 'bold',
  background: '#fff',
  color: '#000',
  textDecoration: 'none',
  borderTopLeftRadius: '12px',
  zIndex: 10000,
  border: '1px solid #fff'
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <a target="_blank" href="https://jam.pieter.com" style={jamLinkStyle}>
      🕹️ Vibe Jam 2025
    </a>
  </StrictMode>
);