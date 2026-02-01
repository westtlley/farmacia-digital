
import React, { useState, useEffect } from 'react';
import Header from '@/components/pharmacy/Header';
import Footer from '@/components/pharmacy/Footer';
import VirtualAssistant from '@/components/pharmacy/VirtualAssistant';
import { RecentPurchaseNotification } from '@/components/pharmacy/SocialProof';
import ThemeProvider, { useTheme } from '@/components/pharmacy/ThemeProvider';

function LayoutContent({ children, currentPageName }) {
  const [cartItems, setCartItems] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem('pharmacyCart');
    if (saved) {
      setCartItems(JSON.parse(saved));
    }

    const handleCartUpdate = () => {
      const updated = localStorage.getItem('pharmacyCart');
      if (updated) {
        setCartItems(JSON.parse(updated));
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const isCustomerArea = currentPageName === 'CustomerArea' || currentPageName === 'CustomerAreaEnhanced';
  const headerOffset = isCustomerArea ? 'pt-0' : 'pt-0';

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.backgroundColor }}>
      <style>{`
        :root {
          --primary: ${theme.primaryColor};
          --secondary: ${theme.secondaryColor};
          --button: ${theme.buttonColor};
          --text: ${theme.textColor};
          --button-radius: ${theme.getButtonRadius()};
          --card-radius: ${theme.getCardRadius()};
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        body {
          font-family: ${theme.getFontFamily()};
          color: ${theme.textColor};
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Apply button styles */
        button:not(.no-theme), .btn {
          border-radius: var(--button-radius);
        }

        /* Apply primary color overrides */
        .theme-primary {
          background-color: ${theme.primaryColor} !important;
        }

        .theme-primary-hover:hover {
          background-color: ${theme.secondaryColor} !important;
        }

        .theme-text {
          color: ${theme.primaryColor} !important;
        }

        .theme-border {
          border-color: ${theme.primaryColor} !important;
        }

        .bg-emerald-600 {
          background-color: ${theme.primaryColor} !important;
        }

        .hover\\:bg-emerald-700:hover {
          background-color: ${theme.secondaryColor} !important;
        }

        .text-emerald-600 {
          color: ${theme.primaryColor} !important;
        }

        .border-emerald-600 {
          border-color: ${theme.primaryColor} !important;
        }

        .bg-emerald-100 {
          background-color: ${theme.primaryColor}20 !important;
        }

        .from-emerald-600 {
          --tw-gradient-from: ${theme.primaryColor};
        }

        .to-teal-600 {
          --tw-gradient-to: ${theme.secondaryColor};
        }
      `}</style>

      {!isCustomerArea && <Header cartItemsCount={cartItems.length} />}
      
      <main className={isCustomerArea ? '' : headerOffset}>
        {children}
      </main>

      {!isCustomerArea && <Footer />}
      {!isCustomerArea && <VirtualAssistant />}
      {/* Notificações de compra APENAS para cliente (não admin) */}
      {!isCustomerArea && <RecentPurchaseNotification />}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  // Para páginas admin, não usar ThemeProvider nem Layout
  const isAdminPage = currentPageName?.startsWith('Admin');
  
  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </ThemeProvider>
  );
}
