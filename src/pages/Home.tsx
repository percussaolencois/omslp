import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Music2, Send, Bell, ArrowRight, Activity, Users, BookOpen, Layers, MonitorSmartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Home() {
  const { profile, user, isAdmin } = useAuth();
  
  const [totalAcervo, setTotalAcervo] = useState<number>(0);
  const [totalRepertorios, setTotalRepertorios] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Fetch Total Acervo (Grades)
        const gradesSnapshot = await getDocs(collection(db, 'grades'));
        setTotalAcervo(gradesSnapshot.size);

        if (isAdmin) {
          // Fetch Total Users
          const usersSnapshot = await getDocs(collection(db, 'users'));
          setTotalUsers(usersSnapshot.size);
        }

        // Fetch User's Repertorios
        if (profile?.naipe && user?.uid) {
          const naipesRef = collection(db, 'config', 'naipes', 'lista');
          const naipeQuery = query(naipesRef, where('naipe', '==', profile.naipe));
          const naipeSnapshot = await getDocs(naipeQuery);

          if (!naipeSnapshot.empty) {
            const currentNaipeId = naipeSnapshot.docs[0].id;
            const integranteRef = doc(db, 'config', 'naipes', 'lista', currentNaipeId, 'integrantes', user.uid);
            const integranteSnap = await getDoc(integranteRef);
            
            if (integranteSnap.exists()) {
              const data = integranteSnap.data();
              setTotalRepertorios(data.repertorios?.length || 0);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [profile, user, isAdmin]);

  const firstName = profile?.Nome?.split(' ')[0] || 'Músico';
  const roleDisplay = isAdmin ? 'Administrador' : 'Músico';

  return (
    <div className="space-y-6 pb-20">
      {/* Header Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-brand/20"
      >
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-white/20 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm">
                {roleDisplay}
              </span>
              <span className="bg-emerald-500/20 text-emerald-100 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm border border-emerald-500/50 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Ativo
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight mb-2">
              Olá, {firstName}
            </h1>
            <p className="text-brand-100 font-medium text-lg mb-6 opacity-90 max-w-lg">
              Pronto para tocar? Veja o resumo do seu {profile?.naipe ? `naipe (${profile.naipe})` : 'estúdio'} e descubra novos repertórios.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/minhas-partituras" 
                className="bg-white text-brand px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Acessar Minhas Partituras
              </Link>
              {profile?.tipoAcesso !== 'Músico' && (
                <Link 
                  to="/meu-naipe" 
                  className="bg-brand-light/30 border border-white/20 text-white backdrop-blur-md px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-light/50 transition-all"
                >
                  Detalhes do Naipe
                </Link>
              )}
            </div>
          </div>
          
          <div className="hidden md:flex justify-end relative">
             <div className="w-64 h-64 bg-white/5 rounded-full flex items-center justify-center relative backdrop-blur-3xl border border-white/10 shadow-2xl">
               <Music2 size={100} className="text-white/80" />
               <div className="absolute inset-0 bg-gradient-to-tr from-brand to-transparent opacity-50 rounded-full mix-blend-overlay"></div>
             </div>
          </div>
        </div>

        {/* Decorative background vectors */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-brand/30 transition-all group"
        >
          <div className="flex justify-between items-start mb-6">
             <div className="p-3 bg-blue-50 text-brand rounded-2xl group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all">
               <Layers size={24} />
             </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-1">
              {loading ? <span className="animate-pulse bg-slate-200 text-transparent rounded">--</span> : totalRepertorios}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meus Repertórios</p>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-brand/30 transition-all group"
        >
          <div className="flex justify-between items-start mb-6">
             <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all">
               <BookOpen size={24} />
             </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-1">
              {loading ? <span className="animate-pulse bg-slate-200 text-transparent rounded">--</span> : totalAcervo}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obras no Acervo Geral</p>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-brand/30 transition-all group relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-6 relative z-10">
             <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
               <MonitorSmartphone size={24} />
             </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1">
              Multi-plataforma
            </h3>
            <p className="text-[11px] font-bold text-slate-500 leading-tight">
              Anote no tablet, leia no celular. Suas grades estão sempre com você.
            </p>
          </div>
          {/* subtle decorative blur */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-100 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
        </motion.div>

        {isAdmin && profile?.tipoAcesso !== 'Músico' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900 p-6 rounded-3xl shadow-xl flex flex-col justify-between hover:scale-[1.02] transition-all group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6 relative z-10">
               <div className="p-3 bg-white/10 text-white rounded-2xl backdrop-blur-md">
                 <Users size={24} />
               </div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Admin Stats</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-black text-white tracking-tight mb-1">
                {loading ? <span className="animate-pulse bg-white/20 text-transparent rounded">--</span> : totalUsers}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Músicos Ativos</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Admin Operations Section */}
      {isAdmin && profile?.tipoAcesso !== 'Músico' && (
        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.5 }}
           className="mt-8 bg-white border border-slate-200 rounded-3xl p-8 overflow-hidden relative shadow-sm"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Activity size={20} className="text-brand" /> 
                Ações Rápidas de Gestão
              </h2>
              <p className="text-slate-500 font-medium text-sm mt-1">
                Gerencie o acervo, aprove novos músicos ou configure naipes rapidamente.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/gerenciamento-grades" className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                Gerir Grades
              </Link>
              <Link to="/servicos/partituras" className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                Distribuir a Naipes
              </Link>
              <Link to="/gerenciamento-musicos" className="bg-brand text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-light shadow-lg hover:shadow-brand/30 transition-all">
                Aprovar Músicos
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Informative Tips / Latest Update section */}
      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.5 }}
             className="bg-slate-50 border border-slate-200 rounded-3xl p-8 flex gap-6 items-start"
           >
              <div className="p-4 bg-white shadow-sm border border-slate-100 rounded-2xl shrink-0 text-brand">
                 <ArrowRight size={24} />
              </div>
              <div>
                 <h4 className="font-black text-slate-800 text-lg mb-2">Solicitar Partitura</h4>
                 <p className="text-slate-500 text-sm font-medium mb-4">
                   Não encontrou a partitura que precisava no seu repertório? Solicite à diretoria da orquestra diretamente pelo sistema.
                 </p>
                 <Link to="/solicitacao-partitura" className="text-xs font-black text-brand uppercase tracking-widest hover:underline inline-flex items-center gap-1">
                   Abrir Solicitação
                 </Link>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.6 }}
             className="bg-slate-50 border border-slate-200 rounded-3xl p-8 flex gap-6 items-start"
           >
              <div className="p-4 bg-white shadow-sm border border-slate-100 rounded-2xl shrink-0 text-brand">
                 <Send size={24} />
              </div>
              <div>
                 <h4 className="font-black text-slate-800 text-lg mb-2">Avisos da Diretoria</h4>
                 <p className="text-slate-500 text-sm font-medium mb-4">
                   Fique atento a esta página. Em breve o sistema de notificações enviará alertas diretos do seu naipe para cá!
                 </p>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 px-2 py-1 rounded inline-block">
                   Em breve
                 </span>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}

