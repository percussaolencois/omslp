import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { FileText, Trash2, Edit2, ChevronLeft, Search, Loader2, Save, X, FileStack } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface Grade {
  id: string;
  titulo: string;
  repertorio: string;
  pdfUrl: string;
  createdAt: string;
}

export function GradesManagement() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editRepertorio, setEditRepertorio] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedRepertorio, setSelectedRepertorio] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'grades'), orderBy('titulo', 'asc'));
      const querySnapshot = await getDocs(q);
      const gradesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Grade[];
      setGrades(gradesList);
    } catch (error) {
      console.error("Erro ao carregar grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const allRepertories = Array.from(new Set(grades.map(g => g.repertorio || 'Sem Repertório'))).sort();

  const filteredGrades = grades.filter(g => {
    const matchesSearch = g.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (g.repertorio || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRepertorio = !selectedRepertorio || (g.repertorio || 'Sem Repertório') === selectedRepertorio;
    return matchesSearch && matchesRepertorio;
  });

  // Grouping logic
  const groupedGrades = filteredGrades.reduce((acc, grade) => {
    const key = grade.repertorio || 'Sem Repertório';
    if (!acc[key]) acc[key] = [];
    acc[key].push(grade);
    return acc;
  }, {} as Record<string, Grade[]>);

  const activeRepertories = Object.keys(groupedGrades).sort();

  const handleDelete = async (grade: Grade) => {
    setIsDeleting(grade.id);
    try {
      await deleteDoc(doc(db, 'grades', grade.id));
      const storageRef = ref(storage, `Grades/${grade.titulo}.pdf`);
      try {
        await deleteObject(storageRef);
      } catch (err) {
        console.warn("PDF não encontrado no storage ou erro ao deletar:", err);
      }
      setGrades(prev => prev.filter(g => g.id !== grade.id));
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao excluir grade.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'grades', id), {
        titulo: editTitle,
        repertorio: editRepertorio,
        updatedAt: new Date().toISOString()
      });
      setGrades(prev => prev.map(g => g.id === id ? { ...g, titulo: editTitle, repertorio: editRepertorio } : g));
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-xl text-brand transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-brand tracking-tight">Gerenciamento de Grades</h1>
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">Biblioteca de Partituras</p>
        </div>
      </header>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por título ou repertório..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
          />
        </div>

        {/* Repertorio Chips */}
        {!loading && allRepertories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            <button
              onClick={() => setSelectedRepertorio(null)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                !selectedRepertorio 
                  ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                  : "bg-white text-slate-400 border-slate-200 hover:border-brand/40"
              )}
            >
              Todos
            </button>
            {allRepertories.map(rep => (
              <button
                key={rep}
                onClick={() => setSelectedRepertorio(rep === selectedRepertorio ? null : rep)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                  rep === selectedRepertorio 
                    ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" 
                    : "bg-white text-slate-400 border-slate-200 hover:border-brand/40"
                )}
              >
                {rep}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-brand/20" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Grades...</p>
          </div>
        ) : activeRepertories.length > 0 ? (
          activeRepertories.map(repertorio => (
            <div key={repertorio} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{repertorio}</h2>
                <div className="h-px bg-slate-100 flex-1" />
                <span className="text-[9px] font-bold text-slate-300">{groupedGrades[repertorio].length} itens</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {groupedGrades[repertorio].map(grade => (
                  <motion.div 
                    layout
                    key={grade.id}
                    className={cn(
                      "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all group",
                      editingId === grade.id ? "flex flex-col gap-4" : "flex flex-row items-center justify-between"
                    )}
                  >
                    {editingId === grade.id ? (
                      <div className="w-full space-y-3">
                        {/* Linha 1: Título */}
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Música</label>
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Título"
                            className="w-full bg-slate-50 border border-brand/20 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/10 transition-all"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        </div>
                        
                        {/* Linha 2: Repertório */}
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Repertório</label>
                          <input 
                            type="text"
                            placeholder="Repertório"
                            className="w-full bg-slate-50 border border-brand/20 rounded-xl px-4 py-3 text-sm font-bold outline-none uppercase tracking-wide focus:ring-2 focus:ring-brand/10 transition-all"
                            value={editRepertorio}
                            onChange={(e) => setEditRepertorio(e.target.value)}
                          />
                        </div>

                        {/* Linha 3: Botões de Ações */}
                        <div className="flex items-center gap-2 pt-1">
                          <button 
                            onClick={() => handleUpdate(grade.id)}
                            className="flex-1 bg-green-500 text-white py-3 md:py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-green-900/10 active:scale-[0.98] transition-all"
                          >
                            <Save size={14} /> Salvar
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="flex-1 bg-slate-100 text-slate-500 py-3 md:py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                          >
                            <X size={14} /> Cancelar
                          </button>
                          <button 
                            disabled={isDeleting === grade.id}
                            onClick={() => {
                              if (window.confirm('Deseja realmente excluir esta grade? Esta ação removerá o PDF permanentemente.')) {
                                handleDelete(grade);
                              }
                            }}
                            className="p-3 bg-red-50 text-red-500 rounded-xl active:bg-red-100 transition-colors shrink-0"
                          >
                            {isDeleting === grade.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4 overflow-hidden flex-1 mr-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-700 text-sm truncate">{grade.titulo}</h3>
                            <div className="flex items-center gap-2">
                               <p className="text-[9px] font-black text-brand uppercase tracking-widest shrink-0">
                                 {grade.repertorio}
                               </p>
                               <span className="text-[8px] text-slate-300">•</span>
                               <p className="text-[9px] font-bold text-slate-400 truncate">
                                 {new Date(grade.createdAt).toLocaleDateString('pt-BR')}
                               </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingId(grade.id);
                              setEditTitle(grade.titulo);
                              setEditRepertorio(grade.repertorio || '');
                            }}
                            className="p-2.5 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded-xl transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            disabled={isDeleting === grade.id}
                            onClick={() => {
                              if (window.confirm('Deseja realmente excluir esta grade? Esta ação também removerá o PDF do arquivo.')) {
                                handleDelete(grade);
                              }
                            }}
                            className="p-2.5 hover:bg-red-50 text-red-300 hover:text-red-500 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {isDeleting === grade.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
             <FileText size={40} className="mx-auto text-slate-200 mb-2" />
             <p className="text-sm font-bold text-slate-400">Nenhuma grade encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
