import './index.css';
import { TreeHoleApp } from './App.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new TreeHoleApp();
  app.init();
});