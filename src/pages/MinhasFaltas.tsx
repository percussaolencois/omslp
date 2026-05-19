import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Calendar, FileText, Paperclip, Clock, CheckCircle2, XCircle, Edit2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export function MinhasFaltas() {
  const { user } = useAuth();
  const [faltas, setFaltas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isEditable = (dateStr: string) => {
    if (!dateStr) return false;
    
    // Parse "YYYY-MM-DD" robustly
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    
    const faltaDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    faltaDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return faltaDate > today;
  };

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'justificativas'),
      where('id_integrante', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side to avoid composite index requirements initially
      data.sort((a: any, b: any) => {
        const dateA = a.data_justificativa?.toMillis ? a.data_justificativa.toMillis() : 0;
        const dateB = b.data_justificativa?.toMillis ? b.data_justificativa.toMillis() : 0;
        return dateB - dateA;
      });

      setFaltas(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Validado':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-200">
            <CheckCircle2 size={12} />
            Validado
          </span>
        );
      case 'Não validado':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-200">
            <XCircle size={12} />
            N/ Validado
          </span>
        );
      case 'Cancelado':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-200">
            <XCircle size={12} />
            Cancelado
          </span>
        );
      case 'Recebido':
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-amber-200">
            <Clock size={12} />
            Recebido
          </span>
        );
    }
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '---';
    // 'data_falta' is usually YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '---';
    return timestamp.toDate().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand tracking-tight">Minhas Faltas</h1>
          <p className="text-sm font-medium text-slate-500 tracking-tight">Histórico de justificativas enviadas</p>
        </div>
        <Link 
          to="/perfil"
          className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-200 transition-all text-sm font-bold shrink-0 self-start md:self-auto"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </header>

      {loading ? (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-slate-500 font-medium">Carregando histórico...</p>
        </div>
      ) : faltas.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {faltas.map((falta, index) => (
            <motion.div 
              key={falta.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative overflow-hidden"
            >
              {/* Optional colored edge based on status */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${
                falta.status === 'Validado' ? 'bg-emerald-500' :
                falta.status === 'Não validado' ? 'bg-red-500' :
                falta.status === 'Cancelado' ? 'bg-slate-400' : 'bg-amber-400'
              }`}></div>

              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-brand shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight tracking-tight">
                      Falta: {formatDateString(falta.data_falta)}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      Enviada: {formatTimestamp(falta.data_justificativa)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 mt-1">
                  {getStatusBadge(falta.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Tipo</p>
                  <p className="font-bold text-slate-700 text-sm leading-tight">{falta.tipoEvento || '---'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Motivo</p>
                  <p className="font-bold text-slate-700 text-sm leading-tight truncate">{falta.motivo || '---'}</p>
                </div>
              </div>

              {falta.justificativa && (
                <div className="bg-blue-50/50 rounded-lg p-2.5 border border-blue-100/50">
                  <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-0.5">Motivo Detalhado</p>
                  <p className="text-xs text-slate-700 font-medium leading-normal">
                    "{falta.justificativa}"
                  </p>
                </div>
              )}

              {/* Action Buttons (Anexo, Editar) */}
              {(falta.anexo || isEditable(falta.data_falta)) && (
                <div className="pt-2 border-t border-slate-100 mt-1 flex items-center justify-between gap-3">
                  {falta.anexo ? (
                    <a 
                      href={falta.anexo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200 shrink-0"
                    >
                      <Paperclip size={14} className="text-brand" />
                      Ver Anexo
                    </a>
                  ) : <div></div>}
                  {isEditable(falta.data_falta) && falta.status === 'Recebido' && (
                    <button
                      onClick={() => navigate('/justificativas', { state: { editFalta: falta } })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white hover:bg-brand/90 text-xs font-bold rounded-lg transition-colors shrink-0"
                    >
                      <Edit2 size={12} />
                      Editar
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-slate-300 mb-3">
            <FileText size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">Nenhuma falta registrada</h3>
          <p className="text-xs text-slate-500 font-medium max-w-[250px] mx-auto">
            Você não enviou nenhuma justificativa de falta até o momento.
          </p>
          <Link 
            to="/justificativas" 
            className="mt-5 px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-md hover:bg-brand/90 transition-all"
          >
            Enviar Justificativa
          </Link>
        </div>
      )}
    </div>
  );
}
