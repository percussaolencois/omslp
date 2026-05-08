import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, Shield, CheckCircle2, XCircle, Loader2, Search, Trash2, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export function UserManagement() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const toggleStatus = async (memberId: string, currentStatus: boolean) => {
    if (memberId === profile?.uid) {
      alert("Você não pode desativar sua própria conta.");
      return;
    }

    setUpdatingId(memberId);
    try {
      const memberRef = doc(db, 'users', memberId);
      await updateDoc(memberRef, {
        ativo: !currentStatus,
        updatedAt: new Date().toISOString()
      });
      
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, ativo: !currentStatus } : m
      ));
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status.");
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
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
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                          disabled={updatingId === member.id || member.id === profile?.uid}
                          onClick={() => toggleStatus(member.id, member.ativo !== false)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            member.ativo !== false 
                              ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600" 
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          )}
                        >
                          {updatingId === member.id ? <Loader2 size={12} className="animate-spin" /> : (member.ativo !== false ? 'Bloquear' : 'Ativar')}
                        </button>
                        
                        <button 
                          disabled={deletingId === member.id || member.id === profile?.uid}
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          {deletingId === member.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
    </div>
  );
}
