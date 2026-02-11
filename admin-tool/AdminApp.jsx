// admin-tool/AdminApp.jsx
// Example wrapper component showing how to integrate the admin pages
// You can use this as a reference or copy parts to your existing router

import React from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Dumbbell, Home } from 'lucide-react';
import BenchmarkDrillsPage from './pages/BenchmarkDrillsPage';
import MasterclassesPage from './pages/MasterclassesPage';

// Navigation sidebar component
function AdminSidebar() {
  const location = useLocation();

  const navItems = [
    {
      path: '/admin',
      label: 'Dashboard',
      icon: Home,
    },
    {
      path: '/admin/benchmark-drills',
      label: 'Benchmark Drills',
      icon: Dumbbell,
    },
    {
      path: '/admin/masterclasses',
      label: 'Masterclasses',
      icon: BookOpen,
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
      </div>
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Dashboard placeholder
function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/benchmark-drills"
          className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <Dumbbell className="h-8 w-8 text-blue-600 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">Benchmark Drills</h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage the default drill library
          </p>
        </Link>
        <Link
          to="/admin/masterclasses"
          className="p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <BookOpen className="h-8 w-8 text-purple-600 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">Masterclasses</h2>
          <p className="text-gray-600 text-sm mt-1">
            Create and manage video masterclasses
          </p>
        </Link>
      </div>
    </div>
  );
}

// Page wrappers with navigation
function BenchmarkDrillsPageWrapper() {
  const navigate = useNavigate();
  return <BenchmarkDrillsPage onNavigateBack={() => navigate('/admin')} />;
}

function MasterclassesPageWrapper() {
  const navigate = useNavigate();
  return <MasterclassesPage onNavigateBack={() => navigate('/admin')} />;
}

// Main Admin App component
export default function AdminApp() {
  return (
    <BrowserRouter>
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          <Routes>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/benchmark-drills" element={<BenchmarkDrillsPageWrapper />} />
            <Route path="/admin/masterclasses" element={<MasterclassesPageWrapper />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

// Alternative: If you just want to add routes to your existing router:
//
// import { BenchmarkDrillsPage, MasterclassesPage } from './admin-tool';
//
// // In your existing Routes:
// <Route path="/admin/benchmark-drills" element={<BenchmarkDrillsPage />} />
// <Route path="/admin/masterclasses" element={<MasterclassesPage />} />
