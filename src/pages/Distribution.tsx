import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Distribution() {
  const { isAdmin } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
         <AlertCircle size={64} className="mx-auto text-red-500 mb-6" />
         <h1 className="text-3xl font-serif font-bold text-red-600">Acesso Restrito</h1>
         <p className="mt-4 text-slate-500">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-brand tracking-tight">Distribuição de Partituras</h1>
        <p className="text-slate-500 font-medium tracking-tight">Envie novas partituras para partes específicas da orquestra.</p>
      </header>

      {isSuccess && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3"
        >
          <CheckCircle2 size={24} />
          <span className="font-bold">Partitura distribuída com sucesso!</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* File Upload Area */}
          <div className="space-y-4">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Arquivo PDF</label>
             <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-brand transition-colors cursor-pointer group bg-slate-50">
                <Upload size={48} className="mx-auto text-slate-300 group-hover:text-brand transition-colors mb-4" />
                <p className="text-sm font-bold text-slate-400 group-hover:text-brand transition-colors">
                   Selecione ou Arraste o arquivo
                </p>
                <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">Máximo 10MB</p>
             </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Título da Obra</label>
              <input 
                type="text" 
                placeholder="Ex: Primavera (Vivaldi)"
                className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand/20 transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Destino</label>
              <select className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand/20 transition-all font-medium">
                <option>Toda a Orquestra</option>
                <option>Madeiras</option>
                <option>Metais</option>
                <option>Percussão</option>
                <option>Clarinete (Naipe)</option>
                <option>Individual (Músico Específico)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Observações (Opcional)</label>
              <textarea 
                rows={3}
                placeholder="Instruções para o naipe..."
                className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand/20 transition-all font-medium"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex justify-end">
           <button 
             type="submit"
             className="px-10 py-4 bg-brand hover:bg-brand-light text-white rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
           >
             <Send size={18} />
             Finalizar Distribuição
           </button>
        </div>
      </form>

      <section className="bg-slate-100 p-8 rounded-3xl border border-slate-200">
         <h3 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-6">Histórico Recente</h3>
         <div className="space-y-4">
            {[
              { id: '1', title: 'Abertura 1812', target: 'Metais', date: 'Hoje, 10:45' },
              { id: '2', title: 'Danzón No. 2', target: 'Clarinete Solo', date: 'Ontem, 16:30' },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-blue-50 text-brand rounded-lg">
                      <FileText size={16} />
                   </div>
                   <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Enviado para: {item.target}</p>
                   </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">{item.date}</span>
              </div>
            ))}
         </div>
      </section>
    </div>
  );
}
