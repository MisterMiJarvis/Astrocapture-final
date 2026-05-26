import React from 'react';
import { ProjectDetailView } from './ProjectDetailView';
import { PHD2AnalysisView } from './PHD2AnalysisView';
import { NINAAnalysisView } from './NINAAnalysisView';
import { LogUploader } from './LogUploader';
import { PDFReportGenerator } from './PDFReportGenerator';

/**
 * Module 6 — Projets, Logs & Analyse Post-Session
 */
const Module6Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <header>
        <h2 className="text-2xl font-bold">Module 6 — Projets, Logs & Analyse</h2>
        <p className="text-gray-500">Gestion de projet, analyse PHD2/NINA, upload de logs et rapports PDF</p>
      </header>
      <ProjectDetailView />
      <PHD2AnalysisView />
      <NINAAnalysisView />
      <LogUploader />
      <PDFReportGenerator />
    </div>
  );
};

export default Module6Dashboard;
