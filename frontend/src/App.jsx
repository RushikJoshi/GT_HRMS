import React, { useEffect } from "react";
import { notification } from "antd";
import AppRoutes from "./router/AppRoutes";

// Context Providers
// NOTE: AuthProvider is already in main.jsx, do NOT duplicate it here.
import { UIProvider } from "./context/UIContext";
import { TenantProvider } from "./context/TenantContext";

export default function App() {
  // Configure notifications to appear in top-right corner
  useEffect(() => {
    notification.config({
      placement: 'topRight',
      top: 70,
      duration: 3,
      maxCount: 3,
    });
  }, []);

  return (
    <TenantProvider>
      <UIProvider>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </UIProvider>
    </TenantProvider>
  );
}
