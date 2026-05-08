import React from 'react';
import { FileStack, Upload, Search } from 'lucide-react';

export function ScoreDistribution() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand tracking-tight">Distribuidor de Grades</h1>
          <p className="text-slate-500 font-medium">Gerenciamento e envio de Grades Completas para a orquestra.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar grades..."
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all w-64"
            />
          </div>
          <button className="bg-brand text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-light transition-all flex items-center gap-2">
            <Upload size={16} /> Nova Grade
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-brand/30 transition-all group shadow-sm">
            <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-brand/5 transition-colors">
              <FileStack size={48} className="text-slate-300 group-hover:text-brand transition-colors" />
            </div>
            <h3 className="font-bold text-slate-800 tracking-tight">Concerto n. 1 em Sib Menor</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tchaikovsky</p>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[9px] font-black text-brand bg-brand/5 px-2 py-1 rounded-full uppercase">Grade Completa</span>
              <span className="text-[9px] font-bold text-slate-400">12/04/2024</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-300">
           <FileStack size={24} />
        </div>
        <h3 className="font-bold text-slate-700">Área Restrita à Diretoria</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">Esta ferramenta permite o upload de arquivos pesados (PDFs de Grade) que serão vinculados apenas a usuários com privilégios de visualização total.</p>
      </div>
    </div>
  );
}
