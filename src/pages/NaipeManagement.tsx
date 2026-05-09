import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Folder, Trash2, Edit2, ChevronLeft, Search, Loader2, Save, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface Naipe {
  id: string;
  naipe: string;
  repertorios?: string[];
  integrantes?: string[];
  icone?: string;
}

export function NaipeManagement() {
  const [naipes, setNaipes] = useState<Naipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcone, setNewIcone] = useState('');
  const [editIcone, setEditIcone] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNaipe, setSelectedNaipe] = useState<Naipe | null>(null);
  const [naipeDetails, setNaipeDetails] = useState<{members: any[], membersCount: number, partiturasCount: number, repertoriosCount: number}>({members: [], membersCount: 0, partiturasCount: 0, repertoriosCount: 0});
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchNaipes();
  }, []);

  const fetchNaipeDetails = async (naipe: Naipe) => {
    setSelectedNaipe(naipe);
    setLoadingDetails(true);
    setIsModalOpen(true);
    try {
      // 1. Members
      const membersRef = collection(db, 'config', 'naipes', 'lista', naipe.id, 'integrantes');
      const membersSnapshot = await getDocs(membersRef);
      const members = membersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      
      // 2. Repertorios count (assuming subcollection under naipe)
      const repertoiresRef = collection(db, 'config', 'naipes', 'lista', naipe.id, 'repertorios');
      const repertoiresSnapshot = await getDocs(repertoiresRef);

      // 3. Partituras count (summing across members)
      let totalPartituras = 0;
      for (const member of members) {
          totalPartituras += ((member as any).totalPartituras || 0);
      }


      setNaipeDetails({
          members: members,
          membersCount: members.length,
          partiturasCount: totalPartituras,
          repertoriosCount: repertoiresSnapshot.size
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }

  };

  const fetchNaipes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'config', 'naipes', 'lista'), orderBy('naipe', 'asc'));
      const querySnapshot = await getDocs(q);
      const naipesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Naipe[];
      setNaipes(naipesList);
    } catch (error) {
      console.error("Erro ao carregar naipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNaipes = naipes.filter(n => 
    n.naipe.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, 'config', 'naipes', 'lista', id));
      setNaipes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao excluir naipe.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateDoc(doc(db, 'config', 'naipes', 'lista', id), {
        naipe: editName,
        icone: editIcone,
        updatedAt: new Date().toISOString()
      });
      setNaipes(prev => prev.map(n => n.id === id ? { ...n, naipe: editName, icone: editIcone } : n));
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSavingNew(true);
    try {
      const docRef = await addDoc(collection(db, 'config', 'naipes', 'lista'), {
        naipe: newName,
        icone: newIcone,
        repertorios: [],
        integrantes: [],
        createdAt: new Date().toISOString()
      });
      
      const newNaipe: Naipe = {
        id: docRef.id,
        naipe: newName,
        icone: newIcone,
        repertorios: [],
        integrantes: []
      };
      
      setNaipes(prev => [...prev, newNaipe].sort((a, b) => a.naipe.localeCompare(b.naipe)));
      setNewName('');
      setNewIcone('');
      setIsAdding(false);
    } catch (error) {
      console.error("Erro ao criar naipe:", error);
    } finally {
      setIsSavingNew(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl text-brand transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-brand tracking-tight">Gerenciamento de Naipes</h1>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">Estrutura da Orquestra</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand/20 hover:scale-105 transition-all"
        >
          <Plus size={16} /> Novo Naipe
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por nome do naipe..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-brand/5 p-6 rounded-2xl border-2 border-dashed border-brand/20 space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[8px] font-black text-brand uppercase tracking-widest ml-1">Nome do Novo Naipe</label>
                <input 
                  autoFocus
                  type="text"
                  placeholder="EX: TUBAS, FLAUTAS..."
                  className="w-full bg-white border border-brand/20 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/10 transition-all"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-brand uppercase tracking-widest ml-1">URL do Ícone (Opcional)</label>
                <input 
                  type="url"
                  placeholder="https://..."
                  className="w-full bg-white border border-brand/20 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/10 transition-all"
                  value={newIcone}
                  onChange={(e) => setNewIcone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={isSavingNew || !newName.trim()}
                  onClick={handleCreate}
                  className="flex-1 bg-brand text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-brand/10 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSavingNew ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
                </button>
                <button 
                  onClick={() => { setIsAdding(false); setNewName(''); setNewIcone(''); }}
                  className="flex-1 bg-slate-200 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <X size={14} /> Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-brand/20" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Naipes...</p>
          </div>
        ) : filteredNaipes.length > 0 ? (
          filteredNaipes.map(naipe => (
            <motion.div 
              layout
              key={naipe.id}
              className={cn(
                "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all group",
                editingId === naipe.id ? "flex flex-col gap-4" : "flex flex-row items-center justify-between"
              )}
            >
              {editingId === naipe.id ? (
                <div className="w-full space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Editar Nome do Naipe</label>
                    <input 
                      autoFocus
                      type="text"
                      className="w-full bg-slate-50 border border-brand/20 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/10 transition-all"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Editar URL do Ícone</label>
                    <input 
                      type="url"
                      placeholder="https://..."
                      className="w-full bg-slate-50 border border-brand/20 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/10 transition-all"
                      value={editIcone}
                      onChange={(e) => setEditIcone(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdate(naipe.id)}
                      className="flex-1 bg-green-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-green-900/10 active:scale-[0.98] transition-all"
                    >
                      <Save size={14} /> Salvar
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 overflow-hidden flex-1 mr-4">
                    <div className="w-10 h-10 bg-brand/5 text-brand rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {naipe.icone ? (
                        <img src={naipe.icone} alt={naipe.naipe} className="w-full h-full object-cover" />
                      ) : (
                        <Folder size={20} />
                      )}
                    </div>
                      <div className="min-w-0" onClick={() => fetchNaipeDetails(naipe)}>
                         <h3 className="font-bold text-slate-700 text-sm truncate uppercase tracking-tight cursor-pointer hover:text-brand">{naipe.naipe}</h3>
                         
                      </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingId(naipe.id);
                        setEditName(naipe.naipe);
                        setEditIcone(naipe.icone || '');
                      }}
                      className="p-2.5 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded-xl transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      disabled={isDeleting === naipe.id}
                      onClick={() => {
                        if (window.confirm(`Deseja realmente excluir o naipe ${naipe.naipe}?`)) {
                          handleDelete(naipe.id);
                        }
                      }}
                      className="p-2.5 hover:bg-red-50 text-red-300 hover:text-red-500 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isDeleting === naipe.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
             <Folder size={40} className="mx-auto text-slate-200 mb-2" />
             <p className="text-sm font-bold text-slate-400">Nenhum naipe encontrado.</p>
          </div>
        )}
      </div>
      <AnimatePresence>
        {isModalOpen && selectedNaipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative z-10 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">{selectedNaipe.naipe}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
              </div>

              {loadingDetails ? (
                <div className="py-20 flex justify-center"><Loader2 size={32} className="animate-spin text-brand" /></div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-4 bg-slate-50 rounded-2xl text-center"><p className="text-xs font-bold text-slate-400">Integrantes</p><p className="text-lg font-black text-slate-800">{naipeDetails.membersCount}</p></div>
                        <div className="p-4 bg-slate-50 rounded-2xl text-center"><p className="text-xs font-bold text-slate-400">Partituras</p><p className="text-lg font-black text-slate-800">{naipeDetails.partiturasCount}</p></div>
                        <div className="p-4 bg-slate-50 rounded-2xl text-center"><p className="text-xs font-bold text-slate-400">Repertorios</p><p className="text-lg font-black text-slate-800">{naipeDetails.repertoriosCount}</p></div>
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-slate-700 mb-3">Integrantes</h4>
                        <div className="space-y-2">
                            {naipeDetails.members.map(m => (
                                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                                    <img src={m.fotoUrl} className="w-10 h-10 rounded-lg object-cover" alt={m.Nome}/>
                                    <span className="font-bold text-sm text-slate-700">{m.Nome}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
