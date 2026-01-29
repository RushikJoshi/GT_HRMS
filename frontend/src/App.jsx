import React from "react";
import AppRoutes from "./router/AppRoutes";

// Context Providers
// NOTE: AuthProvider is already in main.jsx, do NOT duplicate it here.
import { UIProvider } from "./context/UIContext";
import { TenantProvider } from "./context/TenantContext";

export default function App() {
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
