import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { 
  Plus, Edit2, Trash2, X, AlertTriangle, Info, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, parseISO, isAfter, isBefore
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Comunicado {
  id: string;
  titulo: string;
  descricao: string;
  createdAt: any; 
  dataExpiracao: string; // YYYY-MM-DDTHH:mm
  prioridade: string; // "Normal" | "Urgente"
}

export function Comunicados() {
  const { user, profile } = useAuth();
  const canManageComunicados = ['Administrativo', 'Diretoria', 'Maestro'].includes(profile?.tipoAcesso || '');
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editingComunicado, setEditingComunicado] = useState<Partial<Comunicado> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'comunicados'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comunicado));
      setComunicados(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSaveComunicado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComunicado || !editingComunicado.titulo || !editingComunicado.descricao || !editingComunicado.dataExpiracao) return;

    try {
      if (editingComunicado.id) {
        await updateDoc(doc(db, 'comunicados', editingComunicado.id), {
          ...editingComunicado,
        });
      } else {
        await addDoc(collection(db, 'comunicados'), {
          ...editingComunicado,
          prioridade: editingComunicado.prioridade || 'Normal',
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingComunicado(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar comunicado.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este aviso?')) {
      try {
        await deleteDoc(doc(db, 'comunicados', id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const now = new Date();
  const activeComunicados = comunicados
    .filter(c => {
      if (!c.dataExpiracao) return true;
      const expDate = parseISO(c.dataExpiracao);
      return isAfter(expDate, now);
    })
    .sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA; // newest first
    });

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand tracking-tight">Comunicados</h1>
          <p className="text-slate-500 font-medium tracking-tight">Mural de recados e avisos gerais</p>
        </div>
        {canManageComunicados && (
          <button 
            onClick={() => {
              setEditingComunicado({ 
                prioridade: 'Normal',
                dataExpiracao: format(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm") // default +7 days
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl hover:bg-brand/90 transition-all shadow-md font-medium"
          >
            <Plus size={20} />
            Novo Aviso
          </button>
        )}
      </header>

      {/* Lista de Comunicados */}
      <div>
        {loading ? (
           <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-medium animate-pulse">
              Carregando comunicados...
           </div>
        ) : activeComunicados.length > 0 ? (
          <div className="flex flex-col gap-4">
            {activeComunicados.map(aviso => (
              <ComunicadoCard 
                key={aviso.id} 
                comunicado={aviso} 
                canManage={canManageComunicados} 
                onEdit={() => {
                  setEditingComunicado(aviso);
                  setIsModalOpen(true);
                }}
                onDelete={() => handleDelete(aviso.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-medium">
             Nenhum comunicado no momento.
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isModalOpen && editingComunicado && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 shrink-0">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingComunicado.id ? 'Editar Aviso' : 'Novo Aviso'}
                  </h2>
                  <button onClick={() => { setIsModalOpen(false); setEditingComunicado(null); }} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                 <form id="comunicado-form" onSubmit={handleSaveComunicado} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Título do Aviso *</label>
                      <input 
                        type="text" required
                        value={editingComunicado.titulo || ''} 
                        onChange={e => setEditingComunicado({...editingComunicado, titulo: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        placeholder="Ex: Novo agendamento de ensaio"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Prioridade</label>
                        <select
                          value={editingComunicado.prioridade || 'Normal'}
                          onChange={e => setEditingComunicado({...editingComunicado, prioridade: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Data de Expiração *</label>
                        <input 
                          type="datetime-local" required
                          value={editingComunicado.dataExpiracao || ''} 
                          onChange={e => setEditingComunicado({...editingComunicado, dataExpiracao: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Descrição *</label>
                      <textarea 
                        rows={5} required
                        value={editingComunicado.descricao || ''} 
                        onChange={e => setEditingComunicado({...editingComunicado, descricao: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium custom-scrollbar"
                        placeholder="Detalhes completos do aviso..."
                      />
                    </div>
                 </form>
               </div>

               <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingComunicado(null); }}
                    className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    form="comunicado-form"
                    className="px-6 py-2.5 font-bold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Salvar Aviso
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ComunicadoCardProps {
  comunicado: Comunicado;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const ComunicadoCard: React.FC<ComunicadoCardProps> = ({ comunicado, canManage, onEdit, onDelete }) => {
  const isUrgente = comunicado.prioridade === 'Urgente';
  let creationDateStr = '';
  if (comunicado.createdAt) {
      if (comunicado.createdAt.toDate) {
          creationDateStr = format(comunicado.createdAt.toDate(), "dd/MM/yy HH:mm");
      } else {
          creationDateStr = format(new Date(comunicado.createdAt), "dd/MM/yy HH:mm");
      }
  }

  let expDateStr = '';
  if (comunicado.dataExpiracao) {
      expDateStr = format(parseISO(comunicado.dataExpiracao), "dd/MM/yy HH:mm");
  }


  return (
    <div className={`bg-white rounded-2xl border ${isUrgente ? 'border-red-200' : 'border-slate-200'} shadow-sm overflow-hidden group p-5 sm:p-6 transition-all hover:shadow-md relative`}>
      {isUrgente && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-bl-xl flex items-center gap-1">
             <AlertTriangle size={12} /> Urgente
          </div>
      )}
      
      <div className="flex gap-4 sm:gap-5">
         <div className="flex shrink-0 items-start">
            <img 
               src="https://cdn.pixabay.com/photo/2015/12/16/17/41/bell-1096280_1280.png" 
               alt="Notificação"
               className={`w-10 h-10 sm:w-14 sm:h-14 object-contain ${isUrgente ? 'opacity-90' : 'opacity-70'} grayscale`}
               style={isUrgente ? { filter: 'sepia(100%) hue-rotate(-50deg) saturate(300%)' } : {}}
            />
         </div>
         
         <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
               <h4 className={`text-xl font-bold leading-tight ${isUrgente ? 'text-red-700' : 'text-slate-800'}`}>
                 {comunicado.titulo}
               </h4>
               
               {canManage && (
                 <div className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                 </div>
               )}
            </div>
            
            <p className="text-slate-600 whitespace-pre-wrap mt-2">{comunicado.descricao}</p>
            
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-400 pt-3 border-t border-slate-100">
               {creationDateStr && (
                   <span className="flex items-center gap-1">
                     Publicado em {creationDateStr}
                   </span>
               )}
               {expDateStr && (
                   <span className="flex items-center gap-1">
                     <Clock size={12} />
                     Expira em: {expDateStr}
                   </span>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
