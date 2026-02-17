import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import JobPortalAuthProvider from './context/JobPortalAuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <JobPortalAuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </JobPortalAuthProvider>
  </AuthProvider>
);
