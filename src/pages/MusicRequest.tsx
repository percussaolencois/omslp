import React from 'react';
import { HelpCircle, Send } from 'lucide-react';

export function MusicRequest() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-brand tracking-tight">Solicitação de Partitura</h1>
        <p className="text-slate-500 font-medium">Não encontrou o que procurava? Solicite ao arquivo musical.</p>
      </header>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Obra</label>
            <input 
              type="text" 
              placeholder="Ex: Quinta Sinfonia (Beethoven)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrumento / Parte</label>
            <input 
              type="text" 
              placeholder="Ex: Clarinete 1 / Grade"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações Adicionais</label>
            <textarea 
              rows={4}
              placeholder="Descreva detalhes como edição específica ou urgência..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            ></textarea>
          </div>
        </div>

        <button className="w-full bg-brand text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-brand-light transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3">
          <Send size={18} /> Enviar Solicitação
        </button>
      </div>

      <div className="p-6 bg-blue-50 rounded-2xl flex gap-4 border border-blue-100">
        <div className="p-2 bg-white rounded-lg h-fit text-brand">
          <HelpCircle size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Como funciona?</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">Sua solicitação será enviada diretamente à diretoria e ao arquivo musical. Você receberá uma notificação quando a partitura for disponibilizada em "Minhas Partes".</p>
        </div>
      </div>
    </div>
  );
}
