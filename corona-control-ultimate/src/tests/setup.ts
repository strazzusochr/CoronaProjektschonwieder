import '@testing-library/jest-dom';

// Mocks für Browser APIs die in Node nicht existieren
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Canvas Mock (für Three.js Komponenten)
HTMLCanvasElement.prototype.getContext = () => null;
