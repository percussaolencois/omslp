import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  Calendar, CheckCircle2, Clock, XCircle, FileText, 
  Paperclip, Search, Filter, BarChart3
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export function GerenciamentoFaltas() {
  const { profile } = useAuth();
  const [faltas, setFaltas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterData, setFilterData] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterIntegrante, setFilterIntegrante] = useState('');

  // Protect route if not admin/diretoria
  const isDocOrAdmin = profile?.tipoAcesso === 'Administrativo' || profile?.tipoAcesso === 'Diretoria';

  useEffect(() => {
    if (!isDocOrAdmin) return;
    
    // Listen to all justificativas
    const q = query(collection(db, 'justificativas'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side by data_justificativa descending
      data.sort((a: any, b: any) => {
        const dateA = a.data_justificativa?.toMillis ? a.data_justificativa.toMillis() : 0;
        const dateB = b.data_justificativa?.toMillis ? b.data_justificativa.toMillis() : 0;
        return dateB - dateA;
      });

      setFaltas(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDocOrAdmin]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const justificativaRef = doc(db, 'justificativas', id);
      await updateDoc(justificativaRef, { status: newStatus });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status. Tente novamente.");
    }
  };

  const updateObs = async (id: string, newObs: string) => {
    try {
      const justificativaRef = doc(db, 'justificativas', id);
      await updateDoc(justificativaRef, { obsADM: newObs });
    } catch (error) {
       console.error("Erro ao atualizar observação:", error);
       alert("Erro ao salvar observação.");
    }
  };

  const filteredFaltas = useMemo(() => {
    return faltas.filter(falta => {
      // Filter by Data
      if (filterData && falta.data_falta !== filterData) return false;
      
      // Filter by Status
      if (filterStatus && falta.status !== filterStatus) return false;

      // Filter by Integrante (name)
      if (filterIntegrante && falta.nome_integrante && !falta.nome_integrante.toLowerCase().includes(filterIntegrante.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [faltas, filterData, filterStatus, filterIntegrante]);


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Validado':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-200">
            <CheckCircle2 size={14} />
            Validado
          </span>
        );
      case 'Não validado':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-widest border border-red-200">
            <XCircle size={14} />
            Não validado
          </span>
        );
      case 'Cancelado':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-widest border border-slate-200">
            <XCircle size={14} />
            Cancelado
          </span>
        );
      case 'Recebido':
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-200">
            <Clock size={14} />
            Recebido
          </span>
        );
    }
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '---';
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

  if (!isDocOrAdmin && !loading) {
     return <Navigate to="/" />;
  }

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand tracking-tight">Gerenciamento de Faltas</h1>
          <p className="text-sm font-medium text-slate-500 tracking-tight">Controle de justificativas enviadas pelos integrantes</p>
        </div>
        <Link 
          to="/servicos/faltas/analise"
          className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl hover:bg-brand/90 transition-all text-sm font-bold shrink-0 self-start md:self-auto shadow-md"
        >
          <BarChart3 size={16} />
          Análise de Faltas
        </Link>
      </header>

      {/* Filters Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row flex-wrap gap-4 items-end">
         <div className="w-full sm:flex-1">
           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
             <Filter size={12} className="inline mr-1" />
             Integrantes
           </label>
           <div className="relative">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
                type="text" 
                placeholder="Buscar por nome..."
                value={filterIntegrante}
                onChange={(e) => setFilterIntegrante(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium text-sm text-slate-700 hover:bg-slate-100 transition-colors"
             />
           </div>
         </div>
         
         <div className="w-full sm:w-48">
           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
             Data da Falta
           </label>
           <input 
              type="date" 
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium text-sm text-slate-700 hover:bg-slate-100 transition-colors"
           />
         </div>

         <div className="w-full sm:w-48">
           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
             Status
           </label>
           <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium text-sm text-slate-700 hover:bg-slate-100 transition-colors appearance-none cursor-pointer"
           >
              <option value="">Todos</option>
              <option value="Recebido">Recebido</option>
              <option value="Validado">Validado</option>
              <option value="Não validado">Não validado</option>
              <option value="Cancelado">Cancelado</option>
           </select>
         </div>
      </div>

      {loading ? (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-slate-500 font-medium">Carregando histórico...</p>
        </div>
      ) : filteredFaltas.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredFaltas.map((falta, index) => (
            <motion.div 
              key={falta.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden"
            >
              {/* Optional colored edge based on status */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${
                falta.status === 'Validado' ? 'bg-emerald-500' :
                falta.status === 'Não validado' ? 'bg-red-500' :
                falta.status === 'Cancelado' ? 'bg-slate-400' : 'bg-amber-400'
              }`}></div>

              <div className="flex flex-col md:flex-row justify-between items-start gap-4 pl-1">
                <div className="flex items-start gap-3 w-full md:w-auto">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-brand shrink-0 block hidden md:block">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight tracking-tight flex items-center gap-2">
                       {falta.nome_integrante || 'Desconhecido'}
                       <span className="text-xs font-normal bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-slate-600 truncate max-w-[120px] sm:max-w-none">
                         {falta.telefone || 'Sem telefone'}
                       </span>
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm font-medium text-slate-500 mt-1">
                       <span className="flex items-center gap-1 text-brand/80 font-bold">
                         <Calendar size={14} className="md:hidden" />
                         Data Falta: {formatDateString(falta.data_falta)}
                       </span>
                       <span className="hidden sm:inline text-slate-300">•</span>
                       <span className="text-xs">
                         Enviada: {formatTimestamp(falta.data_justificativa)}
                       </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                  <select
                     value={falta.status}
                     onChange={(e) => updateStatus(falta.id, e.target.value)}
                     className={`w-full sm:w-auto px-3 py-1.5 border rounded-lg text-xs font-bold outline-none cursor-pointer ${
                        falta.status === 'Validado' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 focus:ring-emerald-500/20' :
                        falta.status === 'Não validado' ? 'bg-red-50 border-red-200 text-red-700 focus:ring-red-500/20' :
                        falta.status === 'Cancelado' ? 'bg-slate-50 border-slate-200 text-slate-700 focus:ring-slate-500/20' : 
                        'bg-amber-50 border-amber-200 text-amber-700 focus:ring-amber-500/20'
                     } focus:ring-2`}
                  >
                     <option value="Recebido">Recebido</option>
                     <option value="Validado">Validado</option>
                     <option value="Não validado">Não validado</option>
                     <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                   <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Tipo Evento</p>
                     <p className="font-bold text-slate-700 text-sm">{falta.tipoEvento || '---'}</p>
                   </div>
                   {falta.tipoEvento === 'Ensaio' ? <FileText size={18} className="text-slate-300"/> : <Calendar size={18} className="text-slate-300" />}
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Motivo</p>
                  <p className="font-bold text-slate-700 text-sm truncate">{falta.motivo || '---'}</p>
                </div>
              </div>

              {falta.justificativa && (
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50 pl-1 mx-1">
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-0.5">Justificativa do Integrante</p>
                  <p className="text-xs text-slate-700 font-medium leading-normal">
                    "{falta.justificativa}"
                  </p>
                </div>
              )}

              <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/50 pl-1 mx-1 flex flex-col">
                 <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1.5 flex justify-between items-center">
                    Observação da Administração 
                    <span className="text-[9px] text-amber-500 font-normal normal-case tracking-normal">Apenas admin vê isso</span>
                 </p>
                 <textarea
                    defaultValue={falta.obsADM || ''}
                    onBlur={(e) => updateObs(falta.id, e.target.value)}
                    placeholder="Adicionar observação..."
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-medium text-amber-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 min-h-[60px] resize-none whitespace-pre-wrap"
                 />
              </div>

              {falta.anexo && (
                <div className="pt-2 border-t border-slate-100 mt-1 flex px-1">
                  <a 
                    href={falta.anexo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                  >
                    <Paperclip size={14} className="text-brand" />
                    Abrir Anexo de {falta.nome_integrante?.split(' ')[0] || 'Integrante'}
                  </a>
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
          <h3 className="text-base font-bold text-slate-700 mb-1">Nenhuma falta encontrada</h3>
          <p className="text-xs text-slate-500 font-medium max-w-[250px] mx-auto">
             Não há justificativas que correspondam aos filtros selecionados.
          </p>
        </div>
      )}
    </div>
  );
}
