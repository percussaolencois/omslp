import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, Shield, CheckCircle2, XCircle, Loader2, Search, Trash2, ChevronLeft, X, Save, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export function UserManagement() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formState, setFormState] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const membersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMembers(membersList);
    } catch (error) {
      console.error("Erro ao carregar membros:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormState({ ...user });
    setEditModalOpen(true);
  };

  const saveUser = async () => {
    if (!editingUser) return;
    setUpdatingId(editingUser.id);
    try {
       const userRef = doc(db, 'users', editingUser.id);
       const updateData: any = {};
       
       if (editingUser.id === profile?.uid) {
           // Self
           updateData.Nome = formState.Nome;
           updateData.telefone = formState.telefone;
           updateData.naipe = formState.naipe;
           updateData.tipoAcesso = formState.tipoAcesso;
       } else {
           // Other
           updateData.telefone = formState.telefone;
           updateData.tipoAcesso = formState.tipoAcesso;
           updateData.ativo = formState.ativo;
       }
       updateData.updatedAt = new Date().toISOString();

       await updateDoc(userRef, updateData);
       
       setMembers(prev => prev.map(m => 
        m.id === editingUser.id ? { ...m, ...updateData } : m
       ));
       setEditModalOpen(false);
    } catch(e) {
        console.error(e);
        alert('Erro ao salvar');
    } finally {
        setUpdatingId(null);
    }
  };

  const handleDelete = async (memberId: string) => {
    if (memberId === profile?.uid) {
      alert("Você não pode excluir sua própria conta.");
      return;
    }

    if (!window.confirm("Deseja realmente excluir este músico permanentemente?")) return;

    setDeletingId(memberId);
    try {
      await deleteDoc(doc(db, 'users', memberId));
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      console.error("Erro ao deletar músico:", error);
      alert("Erro ao excluir músico.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.Nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.naipe || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-3xl font-bold text-brand tracking-tight">Gerenciamento de Músicos</h1>
            <p className="text-slate-500 font-medium">Controle de acesso e informações dos integrantes da orquestra.</p>
          </div>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome, email ou naipe..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Mobile: Cards View */}
        <div className="md:hidden">
          {loading ? (
             <div className="py-20 text-center">
                <Loader2 size={32} className="animate-spin text-brand/20 mx-auto mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando músicos...</p>
             </div>
          ) : filteredMembers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <img 
                          src={member.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop'} 
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100"
                          alt={member.Nome}
                        />
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{member.Nome || 'Sem Nome'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{member.email}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{member.telefone || '---'}</p>
                            <span className="inline-block px-2 py-0.5 mt-1 bg-brand/5 text-brand text-[9px] font-black rounded-md uppercase tracking-widest">
                                {member.naipe || '---'} • {member.tipoAcesso}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleEdit(member)}
                          className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-brand/5 text-brand hover:bg-brand/10 transition-all w-full"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(member.id)}
                          disabled={deletingId === member.id}
                          className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-100 transition-all w-full"
                        >
                          {deletingId === member.id ? <Loader2 size={12} className="animate-spin mx-auto"/> : "Excluir"}
                        </button>
                    </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="py-20 text-center">
                <User size={40} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm font-bold text-slate-400">Nenhum músico encontrado.</p>
             </div>
          )}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Naipe</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-brand/20 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando músicos...</p>
                  </td>
                </tr>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop'} 
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                          alt={member.Nome}
                        />
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{member.Nome || 'Sem Nome'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 font-medium">{member.telefone || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">{member.naipe || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 bg-brand/5 text-brand text-[9px] font-black rounded-full uppercase tracking-widest">
                        {member.tipoAcesso}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.ativo !== false ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Ativo</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <XCircle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Bloqueado</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(member)}
                          className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-brand/5 text-brand hover:bg-brand/10 transition-all transition-opacity"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(member.id)}
                          disabled={deletingId === member.id}
                          className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-100 transition-all transition-opacity"
                        >
                          {deletingId === member.id ? <Loader2 size={12} className="animate-spin mx-auto"/> : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <User size={40} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-sm font-bold text-slate-400">Nenhum músico encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal Edição */}
      <AnimatePresence>
        {editModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setEditModalOpen(false)}
             />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative z-10 max-h-[90vh] overflow-y-auto"
             >
                <div className="flex justify-between mb-6">
                    <h2 className="font-bold text-lg text-slate-800">Editar {editingUser.Nome}</h2>
                    <button onClick={() => setEditModalOpen(false)}><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div className="flex flex-col items-center mb-6">
                        <img 
                            src={editingUser.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop'} 
                            className="w-20 h-20 rounded-2xl object-cover mb-4"
                            alt={editingUser.Nome}
                        />
                        <h2 className="font-bold text-xl text-slate-800">{editingUser.Nome}</h2>
                    </div>
                
                    {/* Ativo Toggle - Below Name */}
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl mb-4">
                        <span className="text-sm font-bold text-slate-700">Ativo</span>
                        <button 
                            onClick={() => setFormState({...formState, ativo: !formState.ativo})}
                            className={cn("w-12 h-6 rounded-full transition-all relative", formState.ativo ? "bg-green-500" : "bg-slate-300")}
                        >
                            <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", formState.ativo ? "left-7" : "left-1")}/>
                        </button>
                    </div>

                    {editingUser.id === profile?.uid && (
                        <>
                            <input className="w-full p-3 rounded-xl border border-slate-200" value={formState.Nome || ''} placeholder="Nome" onChange={e => setFormState({...formState, Nome: e.target.value})}/>
                            <input className="w-full p-3 rounded-xl border border-slate-200" value={formState.naipe || ''} placeholder="Naipe" onChange={e => setFormState({...formState, naipe: e.target.value})}/>
                        </>
                    )}
                    <input className="w-full p-3 rounded-xl border border-slate-200" value={formState.telefone || ''} placeholder="Telefone (xx) xxxxx-xxxx" onChange={e => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 11) value = value.slice(0, 11);
                        let masked = value;
                        if (value.length > 2) masked = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        if (value.length > 7) masked = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                         
                        setFormState({...formState, telefone: masked})
                    }}/>
                    <select className="w-full p-3 rounded-xl border border-slate-200 bg-white" value={formState.tipoAcesso || 'Músico'} onChange={e => setFormState({...formState, tipoAcesso: e.target.value})}>
                        <option value="Administrativo">Administrativo</option>
                        <option value="Chefe de Naipe">Chefe de Naipe</option>
                        <option value="Diretoria">Diretoria</option>
                        <option value="Maestro">Maestro</option>
                        <option value="Músico">Músico</option>
                    </select>
                </div>
                <button onClick={saveUser} disabled={!!updatingId} className="w-full mt-6 bg-brand text-white font-bold py-3 rounded-xl">
                    {updatingId ? <Loader2 className="animate-spin mx-auto"/> : "Salvar"}
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
