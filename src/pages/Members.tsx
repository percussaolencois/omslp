import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchMembers = async () => {
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

    fetchMembers();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-brand tracking-tight">Gestão de Integrantes</h1>
        <p className="text-slate-500 font-medium">Visualize e gerencie o acesso de todos os membros da orquestra.</p>
      </header>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Naipe</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
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
                  <span className="text-xs font-bold text-slate-600">{member.naipe || '---'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-widest">
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
                      <span className="text-[10px] font-black uppercase tracking-widest">Inativo</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    disabled={updatingId === member.id || member.id === profile?.uid}
                    onClick={() => toggleStatus(member.id, member.ativo !== false)}
                    className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline disabled:opacity-50"
                  >
                    {updatingId === member.id ? (
                      <Loader2 size={14} className="animate-spin inline" />
                    ) : (
                      member.ativo !== false ? 'Bloquear' : 'Desbloquear'
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
