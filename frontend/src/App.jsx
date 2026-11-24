import React, { useState } from 'react';
import { Lock, Unlock, BarChart3, ShieldCheck } from 'lucide-react';
import Header from './components/Header';
import EncodeTab from './components/EncodeTab';
import DecodeTab from './components/DecodeTab';
import SteganalysisLab from './components/SteganalysisLab';

export default function App() {
  const [activeTab, setActiveTab] = useState('encode'); // 'encode' | 'decode' | 'lab'
  const [latestReport, setLatestReport] = useState(null);

  const handleNavigateToLab = (resultData) => {
    setLatestReport(resultData);
    setActiveTab('lab');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cyber-950 text-slate-100">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-cyber-900 border border-cyber-800 shadow-xl">
            <button
              onClick={() => setActiveTab('encode')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                activeTab === 'encode'
                  ? 'bg-gradient-to-r from-cyber-accent to-cyber-neon text-cyber-950 shadow-lg shadow-cyber-accent/20'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>1. ENCRYPT &amp; EMBED</span>
            </button>

            <button
              onClick={() => setActiveTab('decode')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                activeTab === 'decode'
                  ? 'bg-gradient-to-r from-cyber-emerald to-teal-400 text-cyber-950 shadow-lg shadow-cyber-emerald/20'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Unlock className="w-4 h-4" />
              <span>2. EXTRACT &amp; DECRYPT</span>
            </button>

            <button
              onClick={() => setActiveTab('lab')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                activeTab === 'lab'
                  ? 'bg-cyber-800 text-cyber-accent border border-cyber-accent/30 shadow-lg'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>3. STEGANALYSIS LAB</span>
            </button>
          </div>
        </div>

        {/* Active Tab View */}
        <div className="mt-4">
          {activeTab === 'encode' && <EncodeTab onNavigateToLab={handleNavigateToLab} />}
          {activeTab === 'decode' && <DecodeTab />}
          {activeTab === 'lab' && <SteganalysisLab initialReport={latestReport} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-cyber-900 bg-cyber-950/80 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyber-emerald" />
            <span>CipherLoom Cryptographic Steganography Engine</span>
          </div>
          <div>
            Pure Shannon One-Time Pad ($H(M|C)=H(M)$) &bull; Zero Detection &bull; WAV &amp; MP3 Native
          </div>
        </div>
      </footer>
    </div>
  );
}
