// admin-tool/index.js
// Export all components and pages for easy importing

// Pages
export { default as BenchmarkDrillsPage } from './pages/BenchmarkDrillsPage';
export { default as MasterclassesPage } from './pages/MasterclassesPage';

// Components
export { default as DrillCard } from './components/DrillCard';
export { default as DrillModal } from './components/DrillModal';
export { default as MasterclassCard } from './components/MasterclassCard';
export { default as MasterclassModal } from './components/MasterclassModal';
export { default as ImageUploader } from './components/ImageUploader';
export { default as VideoUploader } from './components/VideoUploader';

// Services
export * from './lib/drillService';
export * from './lib/masterclassService';
export * from './lib/storageService';

// Constants
export * from './constants/drillOptions';
