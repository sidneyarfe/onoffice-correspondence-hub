
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import ClientSidebar from '@/components/client/ClientSidebar';
import ClientHeader from '@/components/client/ClientHeader';
import ClientOverview from '@/components/client/ClientOverview';
import ClientDocuments from '@/components/client/ClientDocuments';
import ClientCorrespondences from '@/components/client/ClientCorrespondences';
import ClientFinancial from '@/components/client/ClientFinancial';
import ClientProfile from '@/components/client/ClientProfile';

const ClientDashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientSidebar />
        <div className="flex-1 flex flex-col">
          <ClientHeader />
          <main className="flex-1 p-6 bg-gray-50">
            <Routes>
              <Route path="/" element={<ClientOverview />} />
              <Route path="/documentos" element={<ClientDocuments />} />
              <Route path="/correspondencias" element={<ClientCorrespondences />} />
              <Route path="/financeiro" element={<ClientFinancial />} />
              <Route path="/perfil" element={<ClientProfile />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ClientDashboard;
