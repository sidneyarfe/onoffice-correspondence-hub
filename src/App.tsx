
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

// Context para autenticação
import { AuthProvider } from "./contexts/AuthContext";

// Páginas principais
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ClientDashboard from "./pages/client/ClientDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PlanSelection from "./pages/PlanSelection";
import SignupForm from "./pages/SignupForm";
import NotFound from "./pages/NotFound";

// Rotas protegidas
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/planos" element={<PlanSelection />} />
            <Route path="/cadastro" element={<SignupForm />} />
            
            {/* Rotas do Cliente */}
            <Route
              path="/cliente/*"
              element={
                <ProtectedRoute userType="client">
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Rotas do Admin */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute userType="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
