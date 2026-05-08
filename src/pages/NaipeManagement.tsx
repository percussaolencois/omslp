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
  const [isSavingNew, setIsSavingNew] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchNaipes();
  }, []);

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
        updatedAt: new Date().toISOString()
      });
      setNaipes(prev => prev.map(n => n.id === id ? { ...n, naipe: editName } : n));
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
        repertorios: [],
        integrantes: [],
        createdAt: new Date().toISOString()
      });
      
      const newNaipe: Naipe = {
        id: docRef.id,
        naipe: newName,
        repertorios: [],
        integrantes: []
      };
      
      setNaipes(prev => [...prev, newNaipe].sort((a, b) => a.naipe.localeCompare(b.naipe)));
      setNewName('');
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
                  onClick={() => { setIsAdding(false); setNewName(''); }}
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
                    <div className="w-10 h-10 bg-brand/5 text-brand rounded-lg flex items-center justify-center shrink-0">
                      <Folder size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-700 text-sm truncate uppercase tracking-tight">{naipe.naipe}</h3>
                      <div className="flex items-center gap-2">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                           {naipe.integrantes?.length || 0} Integrantes
                         </p>
                         <span className="text-[8px] text-slate-300">•</span>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                           {naipe.repertorios?.length || 0} Repertórios
                         </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingId(naipe.id);
                        setEditName(naipe.naipe);
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
    </div>
  );
}
