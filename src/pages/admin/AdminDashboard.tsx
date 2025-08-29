
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminClients from '@/components/admin/AdminClients';
import AdminCorrespondences from '@/components/admin/AdminCorrespondences';
import AdminFinancial from '@/components/admin/AdminFinancial';
import AdminReports from '@/components/admin/AdminReports';
import AdminDocuments from '@/components/admin/AdminDocuments';
import AdminSignupSubmissions from '@/components/admin/AdminSignupSubmissions';

const AdminDashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6 bg-gray-50">
            <Routes>
              <Route path="/" element={<AdminOverview />} />
              <Route path="/solicitacoes" element={<AdminSignupSubmissions />} />
              <Route path="/clientes" element={<AdminClients />} />
              <Route path="/correspondencias" element={<AdminCorrespondences />} />
              <Route path="/documentos" element={<AdminDocuments />} />
              <Route path="/financeiro" element={<AdminFinancial />} />
              <Route path="/relatorios" element={<AdminReports />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
