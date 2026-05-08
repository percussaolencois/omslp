import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Music2, Send, Bell, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function Home() {
  const { profile, isAdmin } = useAuth();

  const stats = [
    { label: 'Partituras na Estante', value: '124', icon: Music2, color: 'text-blue-600' },
    { label: 'Novos Avisos', value: '3', icon: Bell, color: 'text-amber-500' },
    { label: 'Distribuições Recentes', value: '8', icon: Send, color: 'text-emerald-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-4 gap-4 md:h-[calc(100vh-14rem)]">
      {/* Welcome Card - Large Span */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:col-span-2 md:row-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
           <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Painel do Músico</span>
           <span className="bg-brand/10 text-brand text-[9px] font-bold px-2 py-1 rounded-full uppercase">Ativo</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 leading-tight tracking-tight">
            Olá, {profile?.Nome?.split(' ')[0] || 'Clarinetista'}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
             Você tem <span className="font-bold text-brand">12 novas partituras</span> pendentes na sua estante.
          </p>
        </div>
        <div className="flex -space-x-2 mt-6">
           {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-8 h-8 rounded-full bg-brand/10 border-2 border-white flex items-center justify-center text-[10px] font-bold text-brand">
                {String.fromCharCode(64 + i)}P
              </div>
           ))}
           <div className="w-8 h-8 rounded-full bg-brand border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
             +42
           </div>
        </div>
      </motion.div>

      {/* Stats - Blue Inverse */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="md:col-span-1 md:row-span-2 bg-brand rounded-3xl p-6 shadow-xl text-white flex flex-col justify-between"
      >
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
           <Music2 size={20} />
        </div>
        <div>
           <p className="text-4xl font-bold">124</p>
           <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Obras no Acervo</p>
        </div>
      </motion.div>

      {/* Progress / Shelf Card */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="md:col-span-1 md:row-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between"
      >
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estudo Semanal</span>
        <div className="space-y-4">
           <div className="h-1.5 w-full bg-brand/10 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-brand rounded-full"></div>
           </div>
           <p className="text-[10px] text-slate-500 font-bold leading-tight">75% das metas concluídas para o próximo concerto</p>
        </div>
        <Link to="/minhas-partituras" className="text-[10px] font-bold text-brand flex items-center gap-1 uppercase hover:underline">
          Acessar Estante <ArrowRight size={12} />
        </Link>
      </motion.div>

      {/* Distribution List - Wide span */}
      <motion.div
        className="md:col-span-2 md:row-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden"
      >
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Distribuição Recente</h2>
            <Link to="/servicos/distribuicao" className="text-[10px] text-brand font-bold uppercase hover:underline">Ver Todos</Link>
         </div>
         <div className="space-y-3 overflow-y-auto pr-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 hover:border-brand/30 shadow-sm transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                   <div>
                      <h4 className="text-xs font-bold truncate">Sinfonia No. {i + 4}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Metais • Maestro Agostinho</p>
                   </div>
                </div>
                <span className="text-[9px] text-slate-400 font-bold">Hoje, 09:15</span>
              </div>
            ))}
         </div>
      </motion.div>

      {/* Admin Quick Action */}
      {isAdmin && (
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="md:col-span-2 md:row-span-2 bg-emerald-500 rounded-3xl p-8 text-white relative overflow-hidden group shadow-xl shadow-emerald-500/20"
        >
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <Send size={32} className="mb-4 opacity-80" />
                <h3 className="text-2xl font-bold leading-tight">Distribuir Novo Repertório</h3>
                <p className="text-emerald-50 text-xs mt-2 opacity-90 max-w-xs">
                  Envie arquivos PDF e instruções para naipes específicos instantaneamente.
                </p>
              </div>
              <Link 
                to="/servicos/distribuicao"
                className="mt-6 bg-white text-emerald-600 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-center hover:bg-emerald-50 transition-colors"
              >
                Começar agora
              </Link>
           </div>
           <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
        </motion.div>
      )}
    </div>
  );
}
