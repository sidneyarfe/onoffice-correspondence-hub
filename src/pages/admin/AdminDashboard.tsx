
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminClients from '@/components/admin/AdminClients';
import AdminCRM from '@/components/admin/AdminCRM';
import AdminContatos from '@/components/admin/AdminContatos';
import AdminCorrespondences from '@/components/admin/AdminCorrespondences';
import AdminFinancial from '@/components/admin/AdminFinancial';
import AdminReports from '@/components/admin/AdminReports';
import AdminDocuments from '@/components/admin/AdminDocuments';
import { AdminProducts } from '@/components/admin/AdminProducts';
import AdminTeam from '@/components/admin/AdminTeam';

const AdminDashboard = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AdminHeader />
          <main className="on-mesh flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<AdminOverview />} />
              <Route path="/crm" element={<AdminCRM />} />
              <Route path="/contatos" element={<AdminContatos />} />
              <Route path="/clientes" element={<AdminClients />} />
              <Route path="/produtos" element={<AdminProducts />} />
              <Route path="/correspondencias" element={<AdminCorrespondences />} />
              <Route path="/documentos" element={<AdminDocuments />} />
              <Route path="/financeiro" element={<AdminFinancial />} />
              <Route path="/equipe" element={<AdminTeam />} />
              <Route path="/relatorios" element={<AdminReports />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
