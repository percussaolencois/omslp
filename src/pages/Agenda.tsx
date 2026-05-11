import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, Edit2, Trash2, Calendar as CalendarIcon, MapPin, 
  Clock, Info, ChevronLeft, ChevronRight, X, Image as ImageIcon, Link as LinkIcon, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, getDay, isToday, parseISO,
  isAfter, isBefore, startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AgendaEvent {
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

export function Agenda() {
  const { user, profile } = useAuth();
  const canManageEvents = ['Administrativo', 'Diretoria', 'Maestro'].includes(profile?.tipoAcesso || '');
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals
  const [selectedDayEvents, setSelectedDayEvents] = useState<{date: Date, events: AgendaEvent[]} | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<AgendaEvent> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'agenda'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgendaEvent));
      setEvents(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  let daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for grid
  const startDay = getDay(monthStart);
  const paddingBefore = Array(startDay).fill(null);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Upcoming events
  const today = startOfDay(new Date());
  const upcomingEvents = events
    .filter(e => {
        const eventDate = parseISO(`${e.data_evento}T${e.hora || '00:00'}`);
        return isAfter(eventDate, today) || isSameDay(eventDate, today);
    })
    .sort((a, b) => {
        const dateA = parseISO(`${a.data_evento}T${a.hora || '00:00'}`).getTime();
        const dateB = parseISO(`${b.data_evento}T${b.hora || '00:00'}`).getTime();
        return dateA - dateB;
    })
    .slice(0, 5);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editingEvent.titulo || !editingEvent.data_evento) return;

    try {
      if (editingEvent.id) {
        await updateDoc(doc(db, 'agenda', editingEvent.id), {
          ...editingEvent,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'agenda'), {
          ...editingEvent,
          duracao: editingEvent.duracao || '3 horas',
          status: editingEvent.status || 'Confirmado',
          tipoEvento: editingEvent.tipoEvento || 'Ensaio',
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar evento.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await deleteDoc(doc(db, 'agenda', id));
        if (selectedDayEvents) {
            setSelectedDayEvents({
                ...selectedDayEvents,
                events: selectedDayEvents.events.filter(e => e.id !== id)
            });
            if (selectedDayEvents.events.length === 1) setSelectedDayEvents(null); // closed if last event
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const statusColors: Record<string, string> = {
    'Confirmado': 'bg-green-100 text-green-700',
    'A confirmar': 'bg-yellow-100 text-yellow-700',
    'Cancelado': 'bg-red-100 text-red-700',
    'Adiado': 'bg-orange-100 text-orange-700',
    'Concluído': 'bg-slate-100 text-slate-700',
  };

  const getDayEvents = (date: Date) => {
    return events.filter(e => e.data_evento === format(date, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand tracking-tight">Agenda</h1>
          <p className="text-slate-500 font-medium tracking-tight">Eventos, Ensaios e Concertos</p>
        </div>
        {canManageEvents && (
          <button 
            onClick={() => {
              setEditingEvent({ 
                tipoEvento: 'Ensaio', 
                status: 'Confirmado',
                duracao: '3 horas',
                data_evento: format(new Date(), 'yyyy-MM-dd'),
                hora: '19:00',
                local: 'Casa da Cultura',
                endereco: 'R. Sete de Setembro, 934 - Centro, Lençóis Paulista - SP, 18682-042',
                linkAddress: 'https://maps.app.goo.gl/AiisYGZZD75nDy678',
                banner: 'https://res.cloudinary.com/djuo9edyf/image/upload/v1778529783/Captura_de_tela_2026-05-11_170247_ra1nbm.png'
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl hover:bg-brand/90 transition-all shadow-md font-medium"
          >
            <Plus size={20} />
            Novo Evento
          </button>
        )}
      </header>

      {/* Calendar Section */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-brand capitalize">
             {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
           </h2>
           <div className="flex items-center gap-2">
             <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
               <ChevronLeft size={20} />
             </button>
             <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
               <ChevronRight size={20} />
             </button>
           </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-slate-400 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {paddingBefore.map((_, i) => (
             <div key={`pad-${i}`} className="aspect-square sm:aspect-video rounded-xl bg-slate-50/50" />
          ))}
          {daysInMonth.map((day, i) => {
            const dayEvents = getDayEvents(day);
            const hasEvents = dayEvents.length > 0;
            const isTodayDate = isToday(day);

            return (
              <div 
                key={day.toISOString()}
                onClick={() => hasEvents && setSelectedDayEvents({ date: day, events: dayEvents })}
                className={`
                  relative aspect-square sm:aspect-video p-1 sm:p-2 border rounded-xl flex flex-col transition-all cursor-${hasEvents ? 'pointer hover:border-brand/50 hover:shadow-sm' : 'default'}
                  border-slate-100 bg-white
                  ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                `}
              >
                <div className={`
                  w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold
                  ${isTodayDate ? 'bg-brand text-white' : 'text-slate-600'}
                `}>
                  {format(day, 'd')}
                </div>
                
                <div className="flex-1 flex gap-1 mt-1 flex-wrap content-start">
                  {dayEvents.map(evt => (
                    <div key={evt.id} className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand rounded-full"></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <CalendarIcon className="text-brand" size={24} />
          Próximos Eventos
        </h3>
        {upcomingEvents.length > 0 ? (
          <div className="grid gap-4">
            {upcomingEvents.map(evt => (
              <EventCard 
                key={evt.id} 
                event={evt} 
                isAdmin={canManageEvents} 
                onEdit={() => {
                  setEditingEvent(evt);
                  setIsModalOpen(true);
                }}
                onDelete={() => handleDelete(evt.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
             <p className="text-slate-500 font-medium">Nenhum evento próximo agendado.</p>
          </div>
        )}
      </div>

      {/* Selected Day Events Modal */}
      <AnimatePresence>
        {selectedDayEvents && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
             <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
             >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl sm:rounded-2xl z-10">
                   <div>
                     <h3 className="text-xl font-bold text-brand capitalize">
                        {format(selectedDayEvents.date, 'EEEE', { locale: ptBR })}
                     </h3>
                     <p className="text-sm font-medium text-slate-500">
                        {format(selectedDayEvents.date, "dd 'de' MMMM", { locale: ptBR })}
                     </p>
                   </div>
                   <button onClick={() => setSelectedDayEvents(null)} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-700 rounded-full">
                     <X size={20} />
                   </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                   {selectedDayEvents.events.map(evt => (
                     <EventCard 
                        key={evt.id} 
                        event={evt} 
                        isAdmin={canManageEvents}
                        onEdit={() => {
                          setEditingEvent(evt);
                          setIsModalOpen(true);
                          setSelectedDayEvents(null); // close day view
                        }}
                        onDelete={() => handleDelete(evt.id)}
                     />
                   ))}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <AnimatePresence>
        {isModalOpen && editingEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 shrink-0">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingEvent.id ? 'Editar Evento' : 'Novo Evento'}
                  </h2>
                  <button onClick={() => { setIsModalOpen(false); setEditingEvent(null); }} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm">
                    <X size={20} />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                 <form id="event-form" onSubmit={handleSaveEvent} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Título do Evento *</label>
                      <input 
                        type="text" required
                        value={editingEvent.titulo || ''} 
                        onChange={e => setEditingEvent({...editingEvent, titulo: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        placeholder="Ex: Ensaio Geral"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Evento</label>
                        <div className="flex gap-2">
                          <select
                            value={['Ensaio', 'Concerto', 'Masterclass', 'Workshop'].includes(editingEvent.tipoEvento || '') ? editingEvent.tipoEvento : 'Outro'}
                            onChange={e => {
                              if (e.target.value !== 'Outro') {
                                setEditingEvent({...editingEvent, tipoEvento: e.target.value});
                              } else {
                                setEditingEvent({...editingEvent, tipoEvento: ''});
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                          >
                            <option value="Ensaio">Ensaio</option>
                            <option value="Concerto">Concerto</option>
                            <option value="Masterclass">Masterclass</option>
                            <option value="Workshop">Workshop</option>
                            <option value="Outro">Outro</option>
                          </select>
                          {!['Ensaio', 'Concerto', 'Masterclass', 'Workshop'].includes(editingEvent.tipoEvento || 'Ensaio') && (
                            <input 
                              type="text"
                              value={editingEvent.tipoEvento || ''}
                              onChange={e => setEditingEvent({...editingEvent, tipoEvento: e.target.value})}
                              placeholder="Qual?"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                        <select
                          value={editingEvent.status || 'Confirmado'}
                          onChange={e => setEditingEvent({...editingEvent, status: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        >
                          <option value="A confirmar">A confirmar</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="Adiado">Adiado</option>
                          <option value="Cancelado">Cancelado</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Data *</label>
                        <input 
                          type="date" required
                          value={editingEvent.data_evento || ''} 
                          onChange={e => setEditingEvent({...editingEvent, data_evento: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Hora *</label>
                        <input 
                          type="time" required
                          value={editingEvent.hora || ''} 
                          onChange={e => setEditingEvent({...editingEvent, hora: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Duração</label>
                        <input 
                          type="text"
                          value={editingEvent.duracao || ''} 
                          onChange={e => setEditingEvent({...editingEvent, duracao: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                          placeholder="Ex: 3 horas"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Local (Nome do Espaço)</label>
                      <input 
                        type="text"
                        value={editingEvent.local || ''} 
                        onChange={e => setEditingEvent({...editingEvent, local: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        placeholder="Ex: Teatro Municipal"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Endereço Completo</label>
                      <input 
                        type="text"
                        value={editingEvent.endereco || ''} 
                        onChange={e => setEditingEvent({...editingEvent, endereco: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                        placeholder="Rua, Número, Bairro, Cidade"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Link Google Maps (Opcional)</label>
                      <input 
                        type="url"
                        value={editingEvent.linkAddress || ''} 
                        onChange={e => setEditingEvent({...editingEvent, linkAddress: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium placeholder:text-slate-300"
                        placeholder="https://maps.google.com/..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                       <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Traje</label>
                         <input 
                           type="text"
                           value={editingEvent.traje || ''} 
                           onChange={e => setEditingEvent({...editingEvent, traje: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                           placeholder="Ex: Passeio Completo, Farda, etc"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Banner (Link da Imagem)</label>
                         <input 
                           type="url"
                           value={editingEvent.banner || ''} 
                           onChange={e => setEditingEvent({...editingEvent, banner: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium placeholder:text-slate-300"
                           placeholder="https://..."
                         />
                       </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                      <textarea 
                        rows={3}
                        value={editingEvent.descricao || ''} 
                        onChange={e => setEditingEvent({...editingEvent, descricao: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium custom-scrollbar"
                        placeholder="Detalhes adicionais do evento..."
                      />
                    </div>
                 </form>
               </div>

               <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingEvent(null); }}
                    className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    form="event-form"
                    className="px-6 py-2.5 font-bold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Salvar Evento
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponent para Event Card
interface EventCardProps {
  event: AgendaEvent;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}
const EventCard: React.FC<EventCardProps> = ({ event, isAdmin, onEdit, onDelete }) => {
  const statusColors: Record<string, string> = {
    'Confirmado': 'bg-green-100 text-green-700 border-green-200',
    'A confirmar': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Cancelado': 'bg-red-100 text-red-700 border-red-200',
    'Adiado': 'bg-orange-100 text-orange-700 border-orange-200',
    'Concluído': 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group flex flex-col sm:flex-row">
      {event.banner && (
        <div className="w-full sm:w-48 h-32 sm:h-auto shrink-0 relative overflow-hidden">
           <img src={event.banner} alt={event.titulo} className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent sm:hidden" />
        </div>
      )}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
         <div>
            <div className="flex items-start justify-between gap-4 mb-2">
               <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                         {event.tipoEvento}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[event.status] || 'bg-slate-100 text-slate-600'}`}>
                         {event.status}
                      </span>
                  </div>
                  <h4 className="text-xl font-bold text-slate-800 leading-tight">
                    {event.titulo}
                  </h4>
               </div>
               {isAdmin && (
                 <div className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
               <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                  <CalendarIcon size={16} className="text-brand shrink-0" />
                  <span>
                    {format(parseISO(event.data_evento), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
               </div>
               <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                  <Clock size={16} className="text-brand shrink-0" />
                  <span>
                    {event.hora} <span className="text-slate-400 text-xs">(Duração: {event.duracao})</span>
                  </span>
               </div>
               {(event.local || event.endereco) && (
                 <div className="flex items-start gap-2 text-slate-600 font-medium text-sm sm:col-span-2 mt-1">
                    <MapPin size={16} className="text-brand shrink-0 mt-0.5" />
                    <div>
                       {event.local && <p className="text-slate-800 font-bold">{event.local}</p>}
                       {event.endereco && <p className="text-slate-500 text-xs">{event.endereco}</p>}
                       {event.linkAddress && (
                         <a href={event.linkAddress} target="_blank" rel="noopener noreferrer" className="text-brand text-xs hover:underline flex items-center gap-1 mt-1">
                           <ExternalLink size={12} /> Ver no Mapa
                         </a>
                       )}
                    </div>
                 </div>
               )}
            </div>
            
            {event.traje && event.traje.trim() !== '' && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Traje:</span>
                 <span className="text-sm font-bold text-slate-700">{event.traje}</span>
              </div>
            )}
            
            {event.descricao && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                 <p className="text-sm text-slate-600 whitespace-pre-wrap">{event.descricao}</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
