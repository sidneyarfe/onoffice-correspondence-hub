
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Context para autenticação
import { AuthProvider } from "./contexts/AuthContext";

// Páginas principais
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ClientDashboard from "./pages/client/ClientDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PlanSelection from "./pages/PlanSelection";
import SignupForm from "./pages/SignupForm";
import ContractSuccess from "./pages/ContractSuccess";
import AguardandoAssinatura from "./pages/AguardandoAssinatura";
import ProcessandoPagamento from "./pages/ProcessandoPagamento";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import PagamentoFalha from "./pages/PagamentoFalha";
import PagamentoPendente from "./pages/PagamentoPendente";
import InstrucoesPagamento from "./pages/InstrucoesPagamento";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/planos" element={<PlanSelection />} />
            <Route path="/cadastro" element={<SignupForm />} />
            <Route path="/sucesso" element={<ContractSuccess />} />
            <Route path="/aguardando-assinatura" element={<AguardandoAssinatura />} />
            <Route path="/processando-pagamento" element={<ProcessandoPagamento />} />
            <Route path="/pagamento-sucesso" element={<PagamentoSucesso />} />
            <Route path="/falha-pagamento" element={<PagamentoFalha />} />
            <Route path="/pagamento-pendente" element={<PagamentoPendente />} />
            <Route path="/instrucoes-pagamento" element={<InstrucoesPagamento />} />
            
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
