import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, Edit2, Trash2, X, ExternalLink, Link as LinkIcon, FileText, ToggleLeft, ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Documento {
  id: string;
  titulo: string;
  url: string;
  ativo: boolean;
  tipo: string;
  createdAt: any;
}

export function Documentos() {
  const { user, profile } = useAuth();
  const canManageDocumentos = ['Administrativo', 'Diretoria', 'Maestro'].includes(profile?.tipoAcesso || '');
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editingDoc, setEditingDoc] = useState<Partial<Documento> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'documentos'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Documento));
      // Sort by active first, then creation date
      data.sort((a, b) => {
        if (a.ativo === b.ativo) {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return dateB - dateA;
        }
        return a.ativo ? -1 : 1;
      });
      setDocumentos(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSaveDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.titulo || !editingDoc.url || !editingDoc.tipo) return;

    try {
      if (editingDoc.id) {
        await updateDoc(doc(db, 'documentos', editingDoc.id), {
          titulo: editingDoc.titulo,
          url: editingDoc.url,
          ativo: editingDoc.ativo,
          tipo: editingDoc.tipo,
        });
      } else {
        await addDoc(collection(db, 'documentos'), {
          titulo: editingDoc.titulo,
          url: editingDoc.url,
          ativo: editingDoc.ativo ?? true,
          tipo: editingDoc.tipo,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingDoc(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar documento.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      try {
        await deleteDoc(doc(db, 'documentos', id));
      } catch (err) {
        console.error(err);
      }
    }
  };
  
  const handleToggleAtivo = async (docItem: Documento) => {
    try {
      await updateDoc(doc(db, 'documentos', docItem.id), { ativo: !docItem.ativo });
    } catch (err) {
      console.error(err);
    }
  };

  const visibleDocs = canManageDocumentos ? documentos : documentos.filter(d => d.ativo);

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand tracking-tight">Documentos</h1>
          <p className="text-slate-500 font-medium tracking-tight">Estatutos, arquivos, atas e formulários</p>
        </div>
        {canManageDocumentos && (
          <button 
            onClick={() => {
              setEditingDoc({ 
                ativo: true,
                tipo: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl hover:bg-brand/90 transition-all shadow-md font-medium shrink-0"
          >
            <Plus size={20} />
            Adicionar
          </button>
        )}
      </header>

      {/* Lista de Documentos */}
      <div>
        {loading ? (
           <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-medium animate-pulse">
              Carregando documentos...
           </div>
        ) : visibleDocs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {visibleDocs.map(docItem => (
              <div key={docItem.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-5 flex items-center justify-between gap-4 transition-all hover:shadow-md ${!docItem.ativo ? 'opacity-60 bg-slate-50' : ''}`}>
                 <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                    <div className={`p-3 rounded-full shrink-0 ${docItem.ativo ? 'bg-blue-50 text-brand' : 'bg-slate-100 text-slate-400'}`}>
                      <LinkIcon size={20} />
                    </div>
                    <div className="min-w-0">
                       <a href={docItem.url} target="_blank" rel="noopener noreferrer" className="text-base sm:text-lg font-bold text-slate-800 hover:text-brand transition-colors block truncate">
                          {docItem.titulo}
                       </a>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                            {docItem.tipo}
                          </span>
                          {!docItem.ativo && (
                            <span className="text-xs font-bold text-red-500 uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded-md">
                              Inativo
                            </span>
                          )}
                       </div>
                    </div>
                 </div>
                 
                 {canManageDocumentos && (
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                       <button 
                         onClick={() => handleToggleAtivo(docItem)} 
                         className={`p-2 rounded-lg transition-colors ${docItem.ativo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                         title={docItem.ativo ? "Desativar" : "Ativar"}
                       >
                         {docItem.ativo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                       </button>
                       <button onClick={() => { setEditingDoc(docItem); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors" title="Editar">
                         <Edit2 size={18} />
                       </button>
                       <button onClick={() => handleDelete(docItem.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                         <Trash2 size={18} />
                       </button>
                    </div>
                 )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-medium flex flex-col items-center justify-center">
             <FileText size={48} className="text-slate-300 mb-4" />
             <p>Nenhum documento cadastrado</p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isModalOpen && editingDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 shrink-0">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingDoc.id ? 'Editar Documento' : 'Adicionar Documento'}
                  </h2>
                  <button onClick={() => { setIsModalOpen(false); setEditingDoc(null); }} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                 <form id="documento-form" onSubmit={handleSaveDocumento} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Título do Link *</label>
                      <input 
                        type="text" required
                        value={editingDoc.titulo || ''} 
                        onChange={e => setEditingDoc({...editingDoc, titulo: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        placeholder="Ex: Estatuto da Orquestra 2024"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">URL (Link) *</label>
                      <input 
                        type="url" required
                        value={editingDoc.url || ''} 
                        onChange={e => setEditingDoc({...editingDoc, url: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Tipo *</label>
                      <input 
                        type="text" required list="tipos-documento"
                        value={editingDoc.tipo || ''} 
                        onChange={e => setEditingDoc({...editingDoc, tipo: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        placeholder="Selecione ou digite um tipo"
                      />
                      <datalist id="tipos-documento">
                        <option value="Arquivo" />
                        <option value="Formulário" />
                        <option value="Declaração" />
                        <option value="Ata" />
                        <option value="Estatuto" />
                      </datalist>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                       <input 
                         type="checkbox" 
                         id="ativo-checkbox"
                         checked={editingDoc.ativo ?? true}
                         onChange={e => setEditingDoc({...editingDoc, ativo: e.target.checked})}
                         className="w-5 h-5 rounded border-slate-300 text-brand focus:ring-brand"
                       />
                       <label htmlFor="ativo-checkbox" className="text-sm font-bold text-slate-700 select-none cursor-pointer">
                         Documento Ativo (visível para músicos)
                       </label>
                    </div>
                 </form>
               </div>

               <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingDoc(null); }}
                    className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    form="documento-form"
                    className="px-6 py-2.5 font-bold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Salvar
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

