import React from 'react';
import { AppNavbar } from '@/components/AppNavbar';
import { DataIngestion } from '@/components/DataIngestion';

const AdminIngestion = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="max-w-3xl mx-auto p-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-foreground">Admin Data Ingestion</h1>
          <p className="text-muted-foreground mt-2">
            Upload medical documents to enrich the AI knowledge base.
          </p>
        </div>
        <DataIngestion />
      </div>
    </div>
  );
};

export default AdminIngestion;
