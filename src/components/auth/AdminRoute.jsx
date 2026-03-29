import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function AdminRoute({ children }) {
  const location = useLocation();
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => base44.auth.me(),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`${createPageUrl('AdminLogin')}?next=${next}`} replace />;
  }

  return children;
}
