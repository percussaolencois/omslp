import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, deleteDoc, where, setDoc, getDoc, writeBatch, increment, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, Loader2, Search, Trash2, ChevronLeft, Plus, Check, X, FileText, Edit2, Save, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { MusicNotebook } from '../components/MusicNotebook';
import { Partitura, NotebookPage } from '../types';

export function MeuNaipe() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<any>(null);
  const [memberPartituras, setMemberPartituras] = useState<any>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentNaipeId, setCurrentNaipeId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [currentNaipeDetails, setCurrentNaipeDetails] = useState<any>(null);
  const [isEditingNaipe, setIsEditingNaipe] = useState(false);
  const [editNaipeName, setEditNaipeName] = useState('');
  const [editNaipeIcone, setEditNaipeIcone] = useState('');
  const [savingNaipe, setSavingNaipe] = useState(false);
  const [activeNotebook, setActiveNotebook] = useState<{ pages: NotebookPage[], title: string, id: string } | null>(null);

  const openPartitura = (part: any) => {
    if (!part.pdfUrl || !part.pagSelecionadas || part.pagSelecionadas.length === 0) {
      alert('Esta partitura não possui páginas configuradas.');
      return;
    }

    const notebookPages: NotebookPage[] = part.pagSelecionadas.map((pageNum: number, idx: number) => ({
       id: `${part.id}-p${pageNum}-${idx}`,
       pdfUrl: part.pdfUrl!,
       originalPageNumber: pageNum,
       annotationKey: `${part.id}-p${pageNum}`
    }));

    setActiveNotebook({
      pages: notebookPages,
      title: part.titulo || 'Partitura',
      id: part.id
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentNaipeId) return;
    if (!confirm('Deseja realmente remover este músico do naipe? Ele perderá acesso às partituras deste naipe.')) return;
    
    try {
      const integranteRef = doc(db, 'config', 'naipes', 'lista', currentNaipeId, 'integrantes', memberId);
      await deleteDoc(integranteRef);
      fetchMembers();
    } catch (error) {
      console.error("Erro ao remover integrante:", error);
      alert('Erro ao remover integrante. Tente novamente.');
    }
  };

  const handleDeletePartitura = async (repertorio: string, partituraId: string) => {
    if (!selectedMemberDetail || !currentNaipeId) return;

    if (!confirm('Deseja realmente excluir esta partitura?')) return;

    try {
        const batch = writeBatch(db);
        const partituraRef = doc(db, 'config', 'naipes', 'lista', currentNaipeId, 'integrantes', selectedMemberDetail.id, repertorio, partituraId);
        const integranteRef = doc(db, 'config', 'naipes', 'lista', currentNaipeId, 'integrantes', selectedMemberDetail.id);

        batch.delete(partituraRef);
        batch.update(integranteRef, {
            totalPartituras: increment(-1)
        });

        await batch.commit();

        await fetchMemberDetails(selectedMemberDetail);
    } catch (e) {
        console.error(e);
        alert('Erro ao excluir partitura.');
    }
  };
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.naipe) {
      fetchMembers();
    }
  }, [profile?.naipe]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // 1. Achar ID do Naipe
      const naipesRef = collection(db, 'config', 'naipes', 'lista');
      const naipeQuery = query(naipesRef, where('naipe', '==', profile?.naipe));
      const naipeSnapshot = await getDocs(naipeQuery);
      
      if (naipeSnapshot.empty) {
        console.error("Naipe não encontrado");
        setLoading(false);
        return;
      }
      
      const naipeDoc = naipeSnapshot.docs[0];
      const naipeId = naipeDoc.id;
      setCurrentNaipeId(naipeId);
      setCurrentNaipeDetails({ id: naipeId, ...naipeDoc.data() });
      
      // 2. Fetch Integrantes
      const integrantesRef = collection(db, 'config', 'naipes', 'lista', naipeId, 'integrantes');
      const querySnapshot = await getDocs(integrantesRef);
      
      const membersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMembers(membersList);
    } catch (error) {
      console.error("Erro ao carregar integrantes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetails = async (member: any) => {
      setSelectedMemberDetail(member);
      setLoadingDetails(true);
      setIsDetailModalOpen(true);
      setMemberPartituras({});
      
      try {
          const naipesRef = collection(db, 'config', 'naipes', 'lista');
          const naipeQuery = query(naipesRef, where('naipe', '==', profile?.naipe));
          const naipeSnapshot = await getDocs(naipeQuery);
          if (naipeSnapshot.empty) return;
          const naipeId = naipeSnapshot.docs[0].id;
          setCurrentNaipeId(naipeId);
          
          // Fetch the freshest version of the integrante document
          const integranteDoc = await getDoc(doc(db, 'config', 'naipes', 'lista', naipeId, 'integrantes', member.id));
          const currentMember = integranteDoc.exists() ? { id: integranteDoc.id, ...integranteDoc.data() } : member;
          
          // 1. Array list that might be on the member doc:
          const memberReps = currentMember.repertorios || [];
          
          // 2. Fetch all known repertorios from the Naipe
          const naipeRepertoriosRef = collection(db, 'config', 'naipes', 'lista', naipeId, 'repertorios');
          const naipeRepsSnap = await getDocs(naipeRepertoriosRef);
          const naipeReps = naipeRepsSnap.docs.map(d => d.data().repertorio).filter(Boolean);
          
          // 3. Fetch from global grades to get all repertorio names
          const gradesSnap = await getDocs(collection(db, 'grades'));
          const gradesReps = gradesSnap.docs.map(d => d.data().repertorio).filter(Boolean);
          
          // 4. Combine all to ensure we check every possible subcollection name
          const allPossibleSubcollections = Array.from(new Set([
              ...memberReps, 
              ...naipeReps, 
              ...gradesReps, 
              'partituras', 
              'repertorio', 
              'Partituras'
          ]));
          
          const partiturasByRepertorio: any = {};
          
          for (const rep of allPossibleSubcollections) {
              if (typeof rep !== 'string' || !rep.trim()) continue;
              const repRef = collection(db, 'config', 'naipes', 'lista', naipeId, 'integrantes', member.id, rep);
              const snapshot = await getDocs(repRef);
              if (!snapshot.empty) {
                  partiturasByRepertorio[rep] = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
              }
          }
          
          setMemberPartituras(partiturasByRepertorio);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingDetails(false);
      }
  };

  const fetchAllUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('ativo', '==', true));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllUsers(usersList);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;
    setAdding(true);
    try {
      const naipesRef = collection(db, 'config', 'naipes', 'lista');
      const naipeQuery = query(naipesRef, where('naipe', '==', profile?.naipe));
      const naipeSnapshot = await getDocs(naipeQuery);
      if (naipeSnapshot.empty) return;
      
      const naipeId = naipeSnapshot.docs[0].id;

      for (const userId of selectedUserIds) {
        const user = allUsers.find(u => u.id === userId);
        if (user) {
          const integranteRef = doc(db, 'config', 'naipes', 'lista', naipeId, 'integrantes', userId);
          await setDoc(integranteRef, {
            Nome: user.Nome || '',
            telefone: user.telefone || '',
            email: user.email || '',
            fotoUrl: user.fotoUrl || '',
          });
        }
      }
      
      setSelectedUserIds([]);
      setIsModalOpen(false);
      fetchMembers();
    } catch (error) {
      console.error("Erro ao adicionar integrantes:", error);
    } finally {
      setAdding(false);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.Nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditNaipeClick = () => {
    if (currentNaipeDetails) {
      setEditNaipeName(currentNaipeDetails.naipe || '');
      setEditNaipeIcone(currentNaipeDetails.icone || '');
      setIsEditingNaipe(true);
    }
  };

  const handleUpdateNaipe = async () => {
    if (!currentNaipeId || !editNaipeName.trim()) return;
    setSavingNaipe(true);
    try {
      await updateDoc(doc(db, 'config', 'naipes', 'lista', currentNaipeId), {
        naipe: editNaipeName,
        icone: editNaipeIcone,
        updatedAt: new Date().toISOString()
      });
      setCurrentNaipeDetails((prev: any) => ({
        ...prev,
        naipe: editNaipeName,
        icone: editNaipeIcone
      }));
      setIsEditingNaipe(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar naipe.');
    } finally {
      setSavingNaipe(false);
    }
  };

  if (activeNotebook) {
    // Collect all partituras from memberPartituras
    let allParts: any[] = [];
    Object.values(memberPartituras).forEach((parts: any) => {
      allParts = [...allParts, ...parts];
    });

    return (
      <MusicNotebook 
        initialPages={activeNotebook.pages}
        availablePartituras={allParts.filter(p => !activeNotebook.pages.some(ap => ap.pdfUrl === p.pdfUrl && p.pagSelecionadas?.includes(ap.originalPageNumber)))}
        title={activeNotebook.title}
        notebookId={activeNotebook.id}
        onClose={() => setActiveNotebook(null)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl text-brand transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand/5 text-brand rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              {currentNaipeDetails?.icone ? (
                <img src={currentNaipeDetails.icone} alt={currentNaipeDetails.naipe} className="w-full h-full object-cover" />
              ) : (
                <Folder size={32} />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-brand tracking-tight">
                {currentNaipeDetails?.naipe || profile?.naipe || 'Carregando...'}
              </h1>
              <p className="text-slate-500 font-medium tracking-tight">Gerencie os detalhes e os músicos do seu naipe.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleEditNaipeClick}
            className="bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-all"
          >
            <Edit2 size={18} />
            Editar
          </button>
          <button onClick={fetchAllUsers} className="bg-brand text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20">
            <Plus size={18} />
            Adicionar Membro
          </button>
        </div>
      </header>

      {/* Modal para Editar Naipe */}
      <AnimatePresence>
        {isEditingNaipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsEditingNaipe(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative z-10 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Detalhes do Naipe</h2>
                <button onClick={() => setIsEditingNaipe(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Naipe</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    value={editNaipeName}
                    onChange={(e) => setEditNaipeName(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 font-medium px-2 pt-1 line-clamp-2 leading-tight">
                    Aviso: O nome deve continuar batendo com o perfil dos músicos para não perderem o acesso.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL do Ícone (Foto)</label>
                  <input 
                    type="url"
                     placeholder="https://..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    value={editNaipeIcone}
                    onChange={(e) => setEditNaipeIcone(e.target.value)}
                  />
                </div>
              </div>
              
              <button 
                onClick={handleUpdateNaipe}
                disabled={savingNaipe || !editNaipeName.trim()}
                className="w-full bg-brand disabled:opacity-50 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand/90 transition-all"
              >
                {savingNaipe ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                Salvar Alterações
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Adicionar */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative z-10 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Tornar Integrante</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mb-6">
                 {allUsers.map((user) => (
                    <div 
                      key={user.id} 
                      onClick={() => setSelectedUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all",
                        selectedUserIds.includes(user.id) ? "bg-brand/5 border-brand" : "border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <img 
                        src={user.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop'} 
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                        alt={user.Nome}
                      />
                      <span className="font-bold text-sm text-slate-700 flex-1">{user.Nome}</span>
                      {selectedUserIds.includes(user.id) && <Check size={16} className="text-brand" />}
                    </div>
                 ))}
              </div>
              
              <button 
                onClick={handleAddMembers}
                disabled={selectedUserIds.length === 0 || adding}
                className="w-full bg-brand disabled:opacity-50 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand/90 transition-all"
              >
                {adding && <Loader2 size={16} className="animate-spin"/>}
                Tornar Integrante ({selectedUserIds.length})
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para detalhes */}
      <AnimatePresence>
        {isDetailModalOpen && selectedMemberDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative z-10 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Detalhes do Integrante</h2>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
              </div>

              {loadingDetails ? (
                <div className="flex-1 flex justify-center items-center py-20"><Loader2 size={32} className="animate-spin text-brand" /></div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <img src={selectedMemberDetail.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop'} className="w-16 h-16 rounded-xl object-cover bg-slate-100" alt={selectedMemberDetail.Nome}/>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{selectedMemberDetail.Nome}</h3>
                            <p className="text-sm text-slate-500">{selectedMemberDetail.email}</p>
                            <p className="text-sm text-slate-500 font-medium">{selectedMemberDetail.telefone}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-700 mb-3">Partituras</h4>
                        {Object.keys(memberPartituras).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(memberPartituras).map(([repertorio, partituras]: [string, any]) => (
                                    <div key={repertorio} className="border border-slate-100 rounded-xl p-3">
                                        <h5 className="font-bold text-slate-600 text-xs uppercase tracking-widest mb-2">{repertorio}</h5>
                                        <div className="space-y-2">
                                            {partituras.map((p: any) => (
                                                <div key={p.id} className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand/20 transition-all">
                                                    <div className="flex items-start gap-3">
                                                      <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
                                                        <FileText size={16} />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-slate-800 line-clamp-1">{p.titulo}</p>
                                                        {p.pagSelecionadas && p.pagSelecionadas.length > 0 && (
                                                          <p className="text-xs text-slate-500 font-medium tracking-tight mt-0.5">
                                                            Páginas: <span className="font-bold text-brand">{p.pagSelecionadas.join(', ')}</span>
                                                          </p>
                                                        )}
                                                        {p.pdfUrl && (
                                                          <button onClick={() => openPartitura(p)} className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-brand mt-2 hover:bg-brand/5 px-2 py-1 rounded-md transition-colors">
                                                            Ver partitura
                                                          </button>
                                                        )}
                                                      </div>
                                                      <button 
                                                        onClick={() => handleDeletePartitura(repertorio, p.id)} 
                                                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Remover partitura"
                                                      >
                                                        <Trash2 size={16}/>
                                                      </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                           <p className="text-sm text-slate-400">Nenhuma partitura encontrada.</p>
                        )}
                    </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar integrante..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
             <div className="py-20 text-center">
                <Loader2 size={32} className="animate-spin text-brand/20 mx-auto mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando integrantes...</p>
             </div>
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
             <div 
                key={member.id} 
                onClick={() => fetchMemberDetails(member)}
                className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm hover:border-brand/30 hover:shadow-md transition-all cursor-pointer group"
             >
                <img 
                  src={member.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop'} 
                  className="w-12 h-12 rounded-lg object-cover bg-slate-100"
                  alt={member.Nome}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate group-hover:text-brand transition-colors">{member.Nome || 'Sem Nome'}</p>
                  <p className="text-xs text-slate-400 font-medium truncate">{member.telefone || 'Sem telefone'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMember(member.id);
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                </div>
             </div>
          ))
        ) : (
          <div className="py-20 text-center">
            <User size={40} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm font-bold text-slate-400">Nenhum integrante encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
