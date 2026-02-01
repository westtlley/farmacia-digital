import React, { createContext, useContext, useState } from 'react';

const AdminSidebarContext = createContext();

export function AdminSidebarProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminSidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error('useAdminSidebar must be used within AdminSidebarProvider');
  }
  return context;
}
