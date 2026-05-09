import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Music2, Search, ExternalLink, BookOpen, ArrowLeft, FileText, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Partitura {
  id: string;
  titulo?: string;
  pdfUrl?: string;
  pagSelecionadas?: number[];
}

export function MyMusic() {
  const { profile, user } = useAuth();
  const [repertorios, setRepertorios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [naipeId, setNaipeId] = useState<string | null>(null);
  const [selectedRepertorio, setSelectedRepertorio] = useState<string | null>(null);
  const [partituras, setPartituras] = useState<Partitura[]>([]);
  const [loadingPartituras, setLoadingPartituras] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;

    async function fetchRepertorios() {
        if (!profile?.naipe || !user?.uid) {
            setLoading(false);
            return;
        }

        try {
            // Find naipeId
            const naipesRef = collection(db, 'config', 'naipes', 'lista');
            const naipeQuery = query(naipesRef, where('naipe', '==', profile.naipe));
            const naipeSnapshot = await getDocs(naipeQuery);

            if (naipeSnapshot.empty) {
                console.error("Naipe não encontrado para o usuário");
                setLoading(false);
                return;
            }

            const currentNaipeId = naipeSnapshot.docs[0].id;
            setNaipeId(currentNaipeId);
            
            // Path: config/naipes/lista/[naipeId]/integrantes/[userId]
            const integranteRef = doc(db, 'config', 'naipes', 'lista', currentNaipeId, 'integrantes', user.uid);
            
            unsubscribe = onSnapshot(integranteRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    const repList = data.repertorios || [];
                    if (Array.isArray(repList)) {
                        setRepertorios(repList);
                    } else {
                        setRepertorios([]);
                    }
                } else {
                    console.log("Documento do integrante não encontrado!");
                    setRepertorios([]);
                }
                setLoading(false);
            });
        } catch (error) {
            console.error("Erro ao buscar repertórios:", error);
            setLoading(false);
        }
    }

    fetchRepertorios();

    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, [profile?.naipe, user?.uid]);

  useEffect(() => {
    if (!selectedRepertorio || !user?.uid || !naipeId) {
        setPartituras([]);
        return;
    }

    setLoadingPartituras(true);
    const partsRef = collection(db, 'config', 'naipes', 'lista', naipeId, 'integrantes', user.uid, selectedRepertorio);
    
    const unsubscribe = onSnapshot(partsRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Partitura[];
        setPartituras(data);
        setLoadingPartituras(false);
    });

    return () => unsubscribe();
  }, [selectedRepertorio, user?.uid, naipeId]);

  const filteredRepertorios = repertorios.filter(m => 
    typeof m === 'string' && m.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPartituras = partituras.filter(p => 
    p.titulo?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedRepertorio) {
    return (
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setSelectedRepertorio(null);
                setSearch('');
              }}
              className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-brand tracking-tight">{selectedRepertorio}</h1>
              <p className="text-slate-500 font-medium tracking-tight">Suas partituras neste repertório</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group flex-1 md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar partitura..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
               />
            </div>
          </div>
        </header>

        {loadingPartituras ? (
          <div className="flex justify-center p-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredPartituras.map((part) => (
              <motion.a
                  key={part.id}
                  href={part.pdfUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full"
              >
                  <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden group/cover border-b border-slate-200 shrink-0">
                     <FileText className="w-12 h-12 text-slate-300 transition-transform group-hover/cover:scale-110 duration-500" />
                     <div className="absolute inset-0 bg-brand/80 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                        <button className="max-sm:hidden p-3 bg-white text-brand rounded-full hover:scale-110 transition-transform" onClick={(e) => e.stopPropagation()}>
                           <ExternalLink size={20} />
                        </button>
                     </div>
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-brand truncate group-hover:text-blue-600 transition-colors tracking-tight text-sm mb-1">
                      {part.titulo}
                    </h3>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded uppercase">
                        {part.pagSelecionadas?.length || 0} Pág.
                      </span>
                    </div>
                  </div>
              </motion.a>
              ))}
          </div>
        )}

        {!loadingPartituras && filteredPartituras.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="inline-flex p-4 bg-slate-100 rounded-full text-slate-300 mb-2">
              <FileText size={48} />
            </div>
            <h2 className="text-xl font-bold opacity-50 tracking-tight">Nenhuma partitura encontrada</h2>
            <p className="text-slate-400 text-sm">Este repertório não possui partituras atribuídas ou sua busca não retornou resultados.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand tracking-tight">Minhas Partituras</h1>
          <p className="text-slate-500 font-medium tracking-tight">Suas partituras organizadas por repertório.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" size={18} />
             <input 
               type="text" 
               placeholder="Buscar repertório..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
             />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRepertorios.map((rep, index) => (
            <motion.div
                key={index}
                onClick={() => {
                  setSelectedRepertorio(rep);
                  setSearch('');
                }}
                whileHover={{ y: -2 }}
                className="group relative bg-white rounded-r-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-4 border-l-4 border-l-brand cursor-pointer"
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-brand/10 text-brand rounded-lg">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-brand uppercase tracking-tight leading-tight line-clamp-2 text-sm">
                        {rep}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        Repertório
                        </p>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                        Abrir partituras &rarr;
                    </span>
                </div>
            </motion.div>
            ))}
        </div>
      )}

      {!loading && filteredRepertorios.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="inline-flex p-4 bg-slate-100 rounded-full text-slate-300 mb-2">
            <Music2 size={48} />
          </div>
          <h2 className="text-xl font-bold opacity-50 tracking-tight">Nenhum repertório encontrado</h2>
          <p className="text-slate-400 text-sm">Aguarde a distribuição da diretoria.</p>
        </div>
      )}
    </div>
  );
}
