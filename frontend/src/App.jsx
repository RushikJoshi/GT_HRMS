import React, { useEffect } from "react";
import { notification } from "antd";
import AppRoutes from "./router/AppRoutes";
import { useAuth } from "./context/AuthContext";

// Context Providers
// NOTE: AuthProvider is already in main.jsx, do NOT duplicate it here.
import { UIProvider } from "./context/UIContext";
import { TenantProvider } from "./context/TenantContext";

export default function App() {
  const { user } = useAuth();

  // Configure notifications to appear in top-right corner
  useEffect(() => {
    notification.config({
      placement: 'topRight',
      top: 70,
      duration: 5,
      maxCount: 3,
    });
  }, []);

  return (
    <TenantProvider>
      <UIProvider>
        <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
          <main className="flex-1 min-h-0 relative">
            <AppRoutes />
          </main>
        </div>
      </UIProvider>
    </TenantProvider>
  );
}
