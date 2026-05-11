import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Music, Bell, Calendar, FileText, Activity, MapPin, Clock, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendaEvent {
  id: string;
  titulo: string;
  data_evento: string; // YYYY-MM-DD
  hora: string;
  duracao: string;
  descricao: string;
  local: string;
  endereco: string;
  linkAddress?: string;
  tipoEvento: string;
  traje?: string;
  status: string;
  anexos?: string; 
  banner?: string;
}

interface Comunicado {
  id: string;
  titulo: string;
  descricao: string;
  anexo?: string;
  createdAt: any; 
  dataExpiracao: string; // YYYY-MM-DDTHH:mm
  prioridade: string; // "Normal" | "Urgente"
  status?: string;
}

export function Home() {
  const { profile, user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [upcomingEvents, setUpcomingEvents] = useState<AgendaEvent[]>([]);
  const [activeAvisos, setActiveAvisos] = useState<Comunicado[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Agenda
    const unsubAgenda = onSnapshot(collection(db, 'agenda'), (snapshot) => {
      const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgendaEvent));
      const today = startOfDay(new Date());
      const filtered = allEvents.filter(evt => {
        if (!evt.data_evento) return false;
        try {
          const evtDate = parseISO(evt.data_evento);
          return !isBefore(evtDate, today) || format(evtDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        } catch { return false; }
      });
      // Sort by date_evento ascending, then by hora
      filtered.sort((a, b) => {
        const da = a.data_evento + 'T' + (a.hora || '00:00');
        const dbTime = b.data_evento + 'T' + (b.hora || '00:00');
        return da.localeCompare(dbTime);
      });
      setUpcomingEvents(filtered.slice(0, 3)); // max 3 upcoming
    });

    // Fetch Comunicados
    const unsubComunicados = onSnapshot(collection(db, 'comunicados'), (snapshot) => {
      const allAvisos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comunicado));
      const now = new Date();
      const filtered = allAvisos.filter(c => {
         if (c.status === 'arquivado') return false;
         if (!c.dataExpiracao) return true;
         try {
           const expDate = parseISO(c.dataExpiracao);
           return isAfter(expDate, now);
         } catch { return true; }
      });
      filtered.sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return dateB - dateA;
      });
      setActiveAvisos(filtered.slice(0, 3)); // max 3 recent
    });

    setLoading(false);

    return () => {
      unsubAgenda();
      unsubComunicados();
    };
  }, [user]);

  const firstName = profile?.Nome?.split(' ')[0] || 'Músico';
  const roleDisplay = isAdmin ? 'Administrador' : (profile?.tipoAcesso || 'Músico');

  const quickLinks = [
    { name: 'Agenda', icon: Calendar, path: '/secretaria/agenda', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { name: 'Comunicados', icon: Bell, path: '/secretaria/comunicados', lightColor: 'bg-amber-50', textColor: 'text-amber-600' },
    { name: 'Documentos', icon: FileText, path: '/secretaria/documentos', lightColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { name: 'Minhas Partes', icon: Music, path: '/minhas-partituras', lightColor: 'bg-brand/10', textColor: 'text-brand' },
  ];

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand rounded-[2rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-white/20 text-white text-[10px] sm:text-xs font-black px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm">
                {roleDisplay}
              </span>
              <span className="bg-emerald-500/20 text-emerald-100 text-[10px] sm:text-xs font-black px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm border border-emerald-500/50 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Ativo
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight mb-2">
              Olá, {firstName}
            </h1>
            <p className="text-brand-100 font-medium text-sm md:text-base opacity-95 max-w-sm mt-3">
              Bem-vindo ao portal. Acompanhe os próximos eventos da orquestra, leia avisos da diretoria e estude o repertório.
            </p>
          </div>
          
          <div className="hidden lg:flex justify-end relative shrink-0 mr-4">
             <div className="w-36 h-36 bg-white/5 rounded-full flex items-center justify-center relative backdrop-blur-md border border-white/10 shadow-inner">
               <Music size={60} className="text-white/60" />
               <div className="absolute inset-0 bg-gradient-to-tr from-brand to-transparent opacity-50 rounded-full mix-blend-overlay"></div>
             </div>
          </div>
        </div>

        {/* Decorative background vectors */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
      </motion.div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {quickLinks.map((link, idx) => (
           <Link key={idx} to={link.path}>
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 * idx }}
               className={`h-full bg-white p-4 sm:p-5 text-center flex flex-col items-center justify-center rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all group hover:-translate-y-1`}
             >
                <div className={`p-4 rounded-2xl ${link.lightColor} ${link.textColor} mb-3 group-hover:scale-110 transition-transform`}>
                  <link.icon size={26} strokeWidth={2.5} />
                </div>
                <h3 className="text-[13px] font-black text-slate-800 tracking-tight uppercase whitespace-nowrap">{link.name}</h3>
             </motion.div>
           </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
        
        {/* Próximos Eventos */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-5">
             <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Calendar size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Próximos Eventos</h2>
             </div>
             <Link to="/secretaria/agenda" className="text-xs font-bold text-brand hover:underline flex items-center gap-1 bg-brand/5 px-2 py-1 rounded-lg">
               Ver todos <ChevronRight size={14} />
             </Link>
          </div>

          <div className="flex-1 flex flex-col gap-3">
             {upcomingEvents.length > 0 ? (
                upcomingEvents.map(evt => {
                  let parsedDate = new Date();
                  try { if(evt.data_evento) parsedDate = parseISO(evt.data_evento); } catch(e){}
                  const isConfirmed = evt.status === 'Confirmado';
                  
                  return (
                    <Link to="/secretaria/agenda" key={evt.id}>
                      <div className="p-3 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200 hover:shadow-sm transition-all flex gap-3 sm:gap-4 items-center group cursor-pointer h-full">
                         <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl min-w-[3.5rem] w-14 h-14 sm:h-14 shadow-sm shrink-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{format(parsedDate, 'MMM', { locale: ptBR })}</span>
                            <span className="text-xl font-black text-slate-800 leading-tight block mt-0.5">{format(parsedDate, 'dd')}</span>
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 truncate text-sm sm:text-[15px] group-hover:text-emerald-700 transition-colors">
                              {evt.titulo}
                            </h4>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] sm:text-xs font-medium text-slate-500">
                               <span className="flex items-center gap-1 whitespace-nowrap">
                                 <Clock size={12} /> {evt.hora || '--:--'}
                               </span>
                               <span className="flex items-center gap-1 truncate">
                                 <MapPin size={12} className="shrink-0" /> {evt.local || 'Local não definido'}
                               </span>
                            </div>
                         </div>
                      </div>
                    </Link>
                  );
                })
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                   <div className="w-12 h-12 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-3">
                     <Calendar size={24} />
                   </div>
                   <p className="text-slate-500 font-medium text-sm">Nenhum evento agendado.</p>
                </div>
             )}
          </div>
        </motion.div>

        {/* Últimos Comunicados */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-5">
             <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Bell size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Avisos Recentes</h2>
             </div>
             <Link to="/secretaria/comunicados" className="text-xs font-bold text-brand hover:underline flex items-center gap-1 bg-brand/5 px-2 py-1 rounded-lg">
               Ver todos <ChevronRight size={14} />
             </Link>
          </div>

          <div className="flex-1 flex flex-col gap-3">
             {activeAvisos.length > 0 ? (
                activeAvisos.map(aviso => {
                  const isUrgente = aviso.prioridade === 'Urgente';
                  return (
                    <Link to="/secretaria/comunicados" key={aviso.id}>
                      <div className={`p-3 sm:p-4 rounded-2xl border ${isUrgente ? 'border-red-100 bg-red-50/30 hover:bg-white hover:border-red-300 hover:shadow-sm' : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-amber-200 hover:shadow-sm'} transition-all flex gap-3 sm:gap-4 items-start group cursor-pointer h-full relative overflow-hidden`}>
                         
                         <div className="flex shrink-0 items-start mt-0.5">
                            <img 
                               src="https://cdn.pixabay.com/photo/2015/12/16/17/41/bell-1096280_1280.png" 
                               alt="Aviso"
                               className={`w-9 h-9 sm:w-11 sm:h-11 object-contain ${isUrgente ? 'opacity-90' : 'opacity-60'} grayscale`}
                               style={isUrgente ? { filter: 'sepia(100%) hue-rotate(-50deg) saturate(300%)' } : {}}
                            />
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className={`font-bold truncate text-sm sm:text-[15px] transition-colors pr-2 ${isUrgente ? 'text-red-700 group-hover:text-red-800' : 'text-slate-800 group-hover:text-amber-700'}`}>
                              {aviso.titulo}
                            </h4>
                            <p className="text-xs sm:text-[13px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {aviso.descricao}
                            </p>
                         </div>
                      </div>
                    </Link>
                  );
                })
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                   <div className="w-12 h-12 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-3">
                     <Bell size={24} />
                   </div>
                   <p className="text-slate-500 font-medium text-sm">Nenhum aviso ativo no momento.</p>
                </div>
             )}
          </div>
        </motion.div>

      </div>
      


    </div>
  );
}


