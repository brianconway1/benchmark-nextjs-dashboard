'use client';

import { ToastProvider } from '@/contexts/ToastContext';

interface ToastProviderWrapperProps {
  children: React.ReactNode;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

export function ToastProviderWrapper({ 
  children, 
  position = { vertical: 'top', horizontal: 'right' } 
}: ToastProviderWrapperProps) {
  return <ToastProvider position={position}>{children}</ToastProvider>;
}

