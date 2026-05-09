import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, deleteDoc, where, setDoc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, Loader2, Search, Trash2, ChevronLeft, Plus, Check, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

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
      
      const naipeId = naipeSnapshot.docs[0].id;
      
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
          
          const repertorios = currentMember.repertorios || [];
          const partiturasByRepertorio: any = {};
          
          for (const rep of repertorios) {
              const repRef = collection(db, 'config', 'naipes', 'lista', naipeId, 'integrantes', member.id, rep);
              const snapshot = await getDocs(repRef);
              partiturasByRepertorio[rep] = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
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
          <div>
            <h1 className="text-3xl font-bold text-brand tracking-tight">Integrantes do Naipe: {profile?.naipe}</h1>
            <p className="text-slate-500 font-medium">Gerencie os músicos do seu naipe.</p>
          </div>
        </div>
        <button onClick={fetchAllUsers} className="bg-brand text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20">
          <Plus size={18} />
          Adicionar Membro
        </button>
      </header>

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
                                        <div className="space-y-1">
                                            {partituras.map((p: any) => (
                                                <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                                                    <FileText size={16} className="text-brand"/>
                                                    <span className="text-sm text-slate-700 flex-1">{p.titulo}</span>
                                                    <button onClick={() => handleDeletePartitura(repertorio, p.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                                                      <Trash2 size={14}/>
                                                    </button>
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
                className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
             >
                <img 
                  src={member.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop'} 
                  className="w-12 h-12 rounded-lg object-cover bg-slate-100"
                  alt={member.Nome}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{member.Nome || 'Sem Nome'}</p>
                  <p className="text-xs text-slate-400 font-medium truncate">{member.telefone || 'Sem telefone'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
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
