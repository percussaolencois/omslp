import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, BarChart3, TrendingUp, Users, Calendar, AlertTriangle, PieChart as PieChartIcon, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export function AnaliseFaltas() {
  const { profile } = useAuth();
  const [faltas, setFaltas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(-1); // -1 means all year
  const [isExporting, setIsExporting] = useState(false);

  const isDocOrAdmin = profile?.tipoAcesso === 'Administrativo' || profile?.tipoAcesso === 'Diretoria';

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('dashboard-content');
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`analise-faltas-${selectedYear}${selectedMonth !== -1 ? `-${selectedMonth + 1}` : ''}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!isDocOrAdmin) return;
    
    // Listen to all justificativas
    const q = query(collection(db, 'justificativas'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
       const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setFaltas(data);
       setLoading(false);
    });

    return () => unsubscribe();
  }, [isDocOrAdmin]);

  // Derive charts data
  const { 
    filteredFaltas,
    totalFaltas,
    totalValidadas,
    totalNaoValidadas,
    totalCanceladas,
    chartDataByMonth,
    chartDataByMotivo,
    chartDataByStatus,
    availableYears
  } = useMemo(() => {
     let filtered = faltas;
     
     // Extract unique years for filter
     const yearsSet = new Set<number>();
     faltas.forEach(f => {
       if (f.data_falta) {
          const parts = f.data_falta.split('-');
          if (parts.length === 3) yearsSet.add(parseInt(parts[0], 10));
       }
     });
     let availableYears = Array.from(yearsSet).sort((a, b) => b - a);
     if (availableYears.length === 0) availableYears = [new Date().getFullYear()];

     // Filter by Year
     filtered = filtered.filter(f => {
       if (!f.data_falta) return false;
       const parts = f.data_falta.split('-');
       if (parts.length !== 3) return false;
       return parseInt(parts[0], 10) === selectedYear;
     });

     // Filter by Month if selected
     if (selectedMonth !== -1) {
       filtered = filtered.filter(f => {
         if (!f.data_falta) return false;
         const parts = f.data_falta.split('-');
         if (parts.length !== 3) return false;
         return parseInt(parts[1], 10) - 1 === selectedMonth;
       });
     }

     const total = filtered.length;
     const validadas = filtered.filter(f => f.status === 'Validado').length;
     const naoValidadas = filtered.filter(f => f.status === 'Não validado').length;
     const canceladas = filtered.filter(f => f.status === 'Cancelado').length;
     const recebidas = filtered.filter(f => f.status === 'Recebido').length;

     // By Status (Pie)
     const chartDataByStatus = [
       { name: 'Recebido', value: recebidas, color: '#f59e0b' },
       { name: 'Validado', value: validadas, color: '#10b981' },
       { name: 'Não validado', value: naoValidadas, color: '#ef4444' },
       { name: 'Cancelado', value: canceladas, color: '#94a3b8' }
     ].filter(c => c.value > 0);

     // By Month (Bar) - only relevant if showing whole year
     const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
     let chartDataByMonth = months.map(m => ({ name: m, faltas: 0 }));
     
     // By Motivo (Bar)
     const motivoCounts: { [key: string]: number } = {};

     filtered.forEach(f => {
       if (f.data_falta) {
          const parts = f.data_falta.split('-');
          if (parts.length === 3) {
             const mIndex = parseInt(parts[1], 10) - 1;
             if (mIndex >= 0 && mIndex < 12) {
               chartDataByMonth[mIndex].faltas++;
             }
          }
       }
       if (f.tipoEvento) {
          motivoCounts[f.tipoEvento] = (motivoCounts[f.tipoEvento] || 0) + 1;
       }
     });

     const chartDataByMotivo = Object.entries(motivoCounts)
       .map(([name, value]) => ({ name, faltas: value }))
       .sort((a, b) => b.faltas - a.faltas);

     return {
       filteredFaltas: filtered,
       totalFaltas: total,
       totalValidadas: validadas,
       totalNaoValidadas: naoValidadas,
       totalCanceladas: canceladas,
       chartDataByMonth,
       chartDataByMotivo,
       chartDataByStatus,
       availableYears
     };
  }, [faltas, selectedYear, selectedMonth]);

  if (!isDocOrAdmin && !loading) {
     return <Navigate to="/" />;
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6'];

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand tracking-tight">Análise de Faltas</h1>
          <p className="text-sm font-medium text-slate-500 tracking-tight">Dashboard de justificativas e ausências</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          {!loading && totalFaltas > 0 && (
            <button 
              onClick={exportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-all text-sm font-bold disabled:opacity-50"
            >
              {isExporting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Download size={16} />
              )}
              {isExporting ? 'Gerando...' : 'Exportar'}
            </button>
          )}
          <Link 
            to="/servicos/faltas"
            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-200 transition-all text-sm font-bold"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full mb-4"></div>
          <p className="text-sm text-slate-500 font-medium">Carregando dados de análise...</p>
        </div>
      ) : (
        <div id="dashboard-content" className="space-y-6 pt-2 bg-transparent p-2 -m-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-600 font-bold shrink-0">
               <Calendar size={18} />
               Período:
            </div>
            <select 
               value={selectedYear}
               onChange={(e) => setSelectedYear(Number(e.target.value))}
               className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand text-sm font-bold text-slate-700 cursor-pointer"
            >
               {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
               ))}
            </select>
            <select 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(Number(e.target.value))}
               className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand text-sm font-bold text-slate-700 cursor-pointer"
            >
               <option value={-1}>Ano Inteiro</option>
               {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
               ))}
            </select>

            <div className="ml-auto bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
               Total no Período: <span className="text-brand text-base ml-1">{totalFaltas}</span>
            </div>
          </div>

          {totalFaltas === 0 ? (
             <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                <AlertTriangle size={32} className="text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Sem dados no período</h3>
                <p className="text-slate-500 font-medium">Não há justificativas lançadas para o período selecionado.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* Summary Cards */}
               <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border text-center border-slate-200 rounded-2xl p-5 shadow-sm">
                     <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Total</p>
                     <p className="text-3xl font-bold text-slate-800">{totalFaltas}</p>
                  </div>
                  <div className="bg-white border text-center border-emerald-100 rounded-2xl p-5 shadow-sm">
                     <p className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-1">Validadas</p>
                     <p className="text-3xl font-bold text-emerald-600">{totalValidadas}</p>
                  </div>
                  <div className="bg-white border text-center border-red-100 rounded-2xl p-5 shadow-sm">
                     <p className="text-xs font-black uppercase text-red-600 tracking-widest mb-1">Ñ Validadas</p>
                     <p className="text-3xl font-bold text-red-600">{totalNaoValidadas}</p>
                  </div>
                  <div className="bg-white border text-center border-slate-100 rounded-2xl p-5 shadow-sm">
                     <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Canceladas</p>
                     <p className="text-3xl font-bold text-slate-500">{totalCanceladas}</p>
                  </div>
               </div>

               {/* By Status Pie Chart */}
               <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                  <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
                     <PieChartIcon size={16} /> Status das Justificativas
                  </h3>
                  <div className="flex-1 w-full min-h-[250px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={chartDataByStatus}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                           >
                              {chartDataByStatus.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                           </Pie>
                           <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                           />
                           <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* By Month Bar Chart */}
               {selectedMonth === -1 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:col-span-2">
                     <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp size={16} /> Faltas por Mês ({selectedYear})
                     </h3>
                     <div className="flex-1 w-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartDataByMonth}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} allowDecimals={false} />
                              <Tooltip
                                 cursor={{fill: '#f1f5f9'}}
                                 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                              />
                              <Bar dataKey="faltas" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               )}

               {/* By Event Type Bar Chart */}
               <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col ${selectedMonth !== -1 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                  <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
                     <BarChart3 size={16} /> Tipo de Evento da Falta
                  </h3>
                  <div className="flex-1 w-full min-h-[250px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataByMotivo} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                           <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                           <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 'bold'}} width={100} />
                           <Tooltip
                              cursor={{fill: '#f1f5f9'}}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                           />
                           <Bar dataKey="faltas" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
                             {
                               chartDataByMotivo.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))
                             }
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

             </div>
          )}
        </div>
      )}
    </div>
  );
}
