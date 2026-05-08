import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Music2, Search, Filter, Download, ExternalLink, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SheetMusic {
  id: string;
  title: string;
  composer: string;
  category: string;
  instrument: string;
}

const MOCK_MUSIC: SheetMusic[] = [
  { id: '1', title: 'Sinfonia No. 9', composer: 'Beethoven', category: 'Clássico', instrument: 'Clarinet' },
  { id: '2', title: 'O Guarani (Abertura)', composer: 'Carlos Gomes', category: 'Nacional', instrument: 'Clarinet' },
  { id: '3', title: 'Double Toil and Trouble', composer: 'John Williams', category: 'Trilha Sonora', instrument: 'Clarinet' },
  { id: '4', title: 'Bolero', composer: 'Maurice Ravel', category: 'Clássico', instrument: 'Clarinet' },
];

export function MyMusic() {
  const [search, setSearch] = useState('');

  const filteredMusic = MOCK_MUSIC.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase()) || 
    m.composer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand tracking-tight">Minhas Partituras</h1>
          <p className="text-slate-500 font-medium tracking-tight">Toda a sua biblioteca digital em um só lugar.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por título ou compositor..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
             />
          </div>
          <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600">
             <Filter size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMusic.map((music) => (
          <motion.div
            key={music.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all"
          >
            <div className="aspect-[4/5] bg-slate-100 flex items-center justify-center p-8 relative overflow-hidden group">
               <FileText className="w-24 h-24 text-slate-300 transition-transform group-hover:scale-110 duration-500" />
               <div className="absolute inset-0 bg-brand/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity duration-300">
                  <button className="p-4 bg-white text-brand rounded-full hover:scale-110 transition-transform">
                     <ExternalLink size={24} />
                  </button>
                  <button className="p-4 bg-white text-brand rounded-full hover:scale-110 transition-transform">
                     <Download size={24} />
                  </button>
               </div>
            </div>
            <div className="p-5 border-t border-slate-100">
              <h3 className="font-bold text-brand truncate group-hover:text-blue-600 transition-colors tracking-tight">
                {music.title}
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1 italic">
                {music.composer}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                  {music.category}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Ver instrumentação
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredMusic.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="inline-flex p-4 bg-slate-100 rounded-full text-slate-300 mb-2">
            <Search size={48} />
          </div>
          <h2 className="text-xl font-bold opacity-50 tracking-tight">Nenhuma partitura encontrada</h2>
          <p className="text-slate-400 text-sm">Tente mudar os termos da busca.</p>
        </div>
      )}
    </div>
  );
}
