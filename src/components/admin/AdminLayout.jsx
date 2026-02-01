import React from 'react';
import { motion } from 'framer-motion';
import AdminSidebar from './AdminSidebar';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';

export default function AdminLayout({ 
  children, 
  title, 
  subtitle, 
  headerActions,
  className = '' 
}) {
  const { sidebarOpen } = useAdminSidebar();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      
      <motion.main 
        initial={false}
        animate={{ 
          marginLeft: sidebarOpen ? '16rem' : '5rem'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1"
      >
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border-b px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {headerActions && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {headerActions}
              </div>
            )}
          </div>
        </motion.header>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`p-4 sm:p-6 ${className}`}
        >
          {children}
        </motion.div>
      </motion.main>
    </div>
  );
}
