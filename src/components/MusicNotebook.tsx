import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Document, pdfjs } from 'react-pdf';
import { 
  Pencil, 
  Highlighter, 
  Eraser, 
  Plus, 
  Save, 
  ChevronLeft, 
  ArrowLeft,
  ZoomIn, 
  ZoomOut,
  Maximize2,
  Minimize2,
  Trash2,
  List,
  MousePointer2,
  BookOpen,
  FileText
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { ScorePage } from './ScorePage';
import { Page } from 'react-pdf';
import { motion, AnimatePresence } from 'motion/react';
import { Partitura, NotebookPage, Stroke } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface PageAnnotation {
  [pageId: string]: Stroke[];
}

interface MusicNotebookProps {
  initialPages: NotebookPage[];
  availablePartituras: Partitura[];
  onClose: () => void;
  title: string;
}

interface SortableNavCardProps {
  id: string;
  page: NotebookPage;
  index: number;
  onRemove: () => void;
}

const SortableNavCard: React.FC<SortableNavCardProps> = ({ id, page, index, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-slate-900/40 backdrop-blur rounded-2xl p-2 flex items-center gap-3 group relative border transition-all select-none ${isDragging ? 'border-brand shadow-2xl scale-105 z-50' : 'border-white/5 hover:border-brand/30'}`}
    >
      <div {...attributes} {...listeners} className="p-2 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors touch-none">
        <List size={16} />
      </div>
      
      <div className="w-12 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-lg border border-white/10">
        <Document file={page.pdfUrl}>
          <Page 
            pageNumber={page.originalPageNumber} 
            width={48}
            renderTextLayer={false} 
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-brand uppercase tracking-widest leading-none mb-1">Pág {index + 1}</p>
        <p className="text-[10px] font-bold text-slate-400 truncate opacity-60">Orig: {page.originalPageNumber}</p>
      </div>

      <button 
        onClick={onRemove}
        className="p-2 text-slate-500 hover:text-red-400 transition-all active:scale-90"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export function MusicNotebook({ initialPages, availablePartituras, onClose, title }: MusicNotebookProps) {
  const [pages, setPages] = useState<NotebookPage[]>(initialPages);
  const [annotations, setAnnotations] = useState<PageAnnotation>({});
  const [tool, setTool] = useState<'pencil' | 'highlighter' | 'eraser' | 'none'>('none');
  const [activeColor, setActiveColor] = useState('#000000');
  const [activeWidth, setActiveWidth] = useState(3);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showOrganizer, setShowOrganizer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mainRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(mainRef.current);
    return () => resizeObserver.disconnect();
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: { active: { id: string } }) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Função para salvar o estado atual (páginas e anotações) no Nuvem (Firestore)
  const handleSave = async () => {
    if (!auth.currentUser) {
      alert('Você precisa estar logado para salvar na nuvem.');
      return;
    }

    setIsSaving(true);
    const saveId = `${auth.currentUser.uid}_${title.replace(/\s+/g, '_')}`;
    const path = `notebook_saves/${saveId}`;

    try {
      await setDoc(doc(db, 'notebook_saves', saveId), {
        userId: auth.currentUser.uid,
        notebookTitle: title,
        pages,
        annotations,
        updatedAt: serverTimestamp()
      });
      
      alert('Seu progresso foi salvo na nuvem e estará disponível em qualquer dispositivo!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  // Load from Firestore on mount
  useEffect(() => {
    const loadFromCloud = async () => {
      if (!auth.currentUser) return;

      const saveId = `${auth.currentUser.uid}_${title.replace(/\s+/g, '_')}`;
      const path = `notebook_saves/${saveId}`;

      try {
        const docSnap = await getDoc(doc(db, 'notebook_saves', saveId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pages) setPages(data.pages);
          if (data.annotations) setAnnotations(data.annotations);
        } else {
          // Fallback to local storage if no cloud save exists yet
          const saved = localStorage.getItem(`notebook_save_${title}`);
          if (saved) {
             const parsed = JSON.parse(saved);
             if (parsed.pages) setPages(parsed.pages);
             if (parsed.annotations) setAnnotations(parsed.annotations);
          }
        }
      } catch (e) {
        console.error('Erro ao carregar do Firestore:', e);
      }
    };

    // We might need to wait for auth state to initialize
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadFromCloud();
      }
    });

    return () => unsubscribe();
  }, [title]);

  const addAnnotation = (pageId: string, stroke: Stroke) => {
    setAnnotations(prev => ({
      ...prev,
      [pageId]: [...(prev[pageId] || []), stroke]
    }));
  };

  const removeAnnotation = (pageId: string, strokeId: string) => {
    setAnnotations(prev => ({
      ...prev,
      [pageId]: (prev[pageId] || []).filter(s => s.id !== strokeId)
    }));
  };

  const removePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const addPartituraToNotebook = (part: Partitura) => {
    if (!part.pdfUrl || !part.pagSelecionadas) return;

    const newPages: NotebookPage[] = part.pagSelecionadas.map((pageNum, idx) => ({
      id: `${part.id}-${Date.now()}-p${pageNum}-${idx}`,
      pdfUrl: part.pdfUrl!,
      originalPageNumber: pageNum
    }));

    setPages(prev => [...prev, ...newPages]);
    setShowAddMenu(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 z-50 flex flex-row h-screen overflow-hidden text-slate-900 font-sans">
      {/* LAYER 3: SIDEBAR CONTROLS (LEFT) - COMPACT FOR TABLET/MOBILE */}
      <AnimatePresence>
        {showControls && !isFullScreen && (
          <motion.aside 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="fixed left-0 top-0 bottom-0 w-12 sm:w-14 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col items-center py-4 shrink-0 z-[100] shadow-2xl"
          >
            <div className="flex flex-col gap-2 flex-1">
              {/* Modo de Navegação (Essencial para Scroll) */}
              <ToolButton 
                active={tool === 'none'} 
                onClick={() => setTool('none')}
                icon={<MousePointer2 size={18} />}
                compact
              />
              
              <div className="my-2 border-t border-slate-800/50 w-6 mx-auto" />

              {/* 1: Lápis */}
              <ToolButton 
                active={tool === 'pencil'} 
                onClick={() => setTool('pencil')}
                icon={<Pencil size={18} />}
                compact
              />
              {/* 2: Marcador */}
              <ToolButton 
                active={tool === 'highlighter'} 
                onClick={() => setTool('highlighter')}
                icon={<Highlighter size={18} />}
                compact
              />
              {/* 3: Borracha */}
              <ToolButton 
                active={tool === 'eraser'} 
                onClick={() => setTool('eraser')}
                icon={<Eraser size={18} />}
                compact
              />
              
              <div className="my-2 border-t border-slate-800/50 w-6 mx-auto" />

              {/* 4: Seletor de Cores */}
              <div className="flex flex-col gap-2 items-center">
                <ColorCircle color="#000000" active={activeColor === '#000000'} onClick={() => setActiveColor('#000000')} compact />
                <ColorCircle color="#ef4444" active={activeColor === '#ef4444'} onClick={() => setActiveColor('#ef4444')} compact />
                <ColorCircle color="#3b82f6" active={activeColor === '#3b82f6'} onClick={() => setActiveColor('#3b82f6')} compact />
                <div className="relative group/color-picker">
                   <div 
                    className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center overflow-hidden shadow-inner"
                    style={{ backgroundColor: activeColor }}
                   >
                     <input 
                      type="color" 
                      value={activeColor} 
                      onChange={(e) => setActiveColor(e.target.value)}
                      className="w-10 h-10 cursor-pointer border-none bg-transparent opacity-0 absolute inset-0" 
                     />
                   </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto pb-4">
              {/* 5: Zoom In/Out */}
              <button 
                onClick={() => setScale(s => Math.min(3.0, s + 0.1))}
                className="p-2 text-slate-500 hover:text-white transition-all active:scale-90"
              >
                <ZoomIn size={18} />
              </button>
              <button 
                onClick={() => setScale(s => Math.max(0.2, s - 0.1))}
                className="p-2 text-slate-500 hover:text-white transition-all active:scale-90"
              >
                <ZoomOut size={18} />
              </button>
              
              <div className="my-2 border-t border-slate-800/50 w-6 mx-auto" />

              {/* 6: Botão Voltar */}
              <button 
                onClick={onClose}
                className="p-2.5 bg-red-500 text-white hover:bg-red-600 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-90"
                title="Sair do Caderno"
              >
                <ArrowLeft size={18} />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* LAYER 3: ORGANIZER PANEL (DRAWER) - NOW ABSOLUTE OVERLAY */}
      <AnimatePresence>
        {showOrganizer && !isFullScreen && (
          <motion.div 
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: showControls ? (window.innerWidth < 640 ? 48 : 56) : 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className="fixed top-0 bottom-0 w-64 bg-slate-900/98 backdrop-blur-xl border-r border-slate-800 flex flex-col h-screen shrink-0 z-[90] shadow-2xl"
          >
            <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="font-black text-slate-200 uppercase text-[10px] tracking-[0.2em]">Páginas</h3>
                <p className="text-[10px] text-slate-500 font-bold">{pages.length} itens no caderno</p>
              </div>
              <button onClick={() => setShowAddMenu(true)} className="p-2 bg-brand text-white rounded-xl shadow-lg hover:brightness-110 active:scale-90 transition-all">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                  modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
              >
                  <SortableContext 
                      items={pages.map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                  >
                      <div className="space-y-4">
                        {pages.map((p, i) => (
                          <SortableNavCard 
                            key={p.id} 
                            id={p.id} 
                            page={p} 
                            index={i} 
                            onRemove={() => removePage(p.id)} 
                          />
                        ))}
                      </div>
                  </SortableContext>

                  <DragOverlay adjustScale={true}>
                    {activeId ? (
                      <div className="w-[224px]"> {/* Match current card width roughly */}
                        <SortableNavCard 
                          id={activeId} 
                          page={pages.find(p => p.id === activeId)!} 
                          index={pages.findIndex(p => p.id === activeId)}
                          onRemove={() => {}}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
              </DndContext>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LAYER 1 & 2: MAIN VIEWPORT (PDF + CANVAS) - ABSOLUTELY 100% WIDTH */}
      <main 
        ref={mainRef}
        className={`flex-1 w-full relative bg-slate-300 overflow-y-auto selection:bg-transparent scroll-smooth custom-scrollbar overflow-x-hidden ${showOrganizer && !isFullScreen ? 'select-none !overflow-hidden' : ''}`}
      >
        <style>{`
          .react-pdf__Page {
            margin: 0 !important;
            padding: 0 !important;
            background: rgba(255,255,255,1) !important;
            box-shadow: none !important;
          }
          .react-pdf__Page__canvas {
            margin: 0 !important;
            display: block !important;
          }
        `}</style>
        {/* TOP HUD (FLOATING) */}
        <div className="fixed top-0 left-0 right-0 p-4 pointer-events-none z-40 flex justify-between items-start">
             {!isFullScreen && (
               <div className="p-3 bg-white/80 backdrop-blur-md shadow-xl rounded-2xl border border-white/20 pointer-events-auto flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white shadow-brand/20 shadow-lg">
                     <BookOpen size={18} />
                  </div>
                  <div>
                     <h2 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">{title}</h2>
                     <p className="text-[9px] text-slate-500 font-bold uppercase">Caderno Ativo</p>
                  </div>
               </div>
             )}
             
             <div className="flex flex-col gap-2 pointer-events-auto">
                {!isFullScreen && (
                  <>
                    {/* 1: Adicionar Partitura */}
                    <button 
                      onClick={() => setShowAddMenu(true)}
                      className="p-3 bg-white/90 backdrop-blur text-slate-800 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all border border-white/20"
                      title="Adicionar Partitura"
                    >
                      <Plus size={20} />
                    </button>

                    {/* 2: Ordenador de Páginas */}
                    <button 
                      onClick={() => setShowOrganizer(!showOrganizer)}
                      className={`p-3 backdrop-blur rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all border ${showOrganizer ? 'bg-brand text-white border-brand/20' : 'bg-white/90 text-slate-800 border-white/20'}`}
                      title="Ordenar Páginas"
                    >
                      <List size={20} />
                    </button>

                    {/* 3: Mostrar/Esconder Ferramentas */}
                    <button 
                      onClick={() => setShowControls(!showControls)}
                      className="p-3 bg-slate-900/90 backdrop-blur text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all border border-slate-700"
                      title={showControls ? "Esconder Ferramentas" : "Mostrar Ferramentas"}
                    >
                      {showControls ? <ArrowLeft size={20} /> : <MousePointer2 size={20} />}
                    </button>

                    {/* 4: Salvar */}
                    <button 
                      disabled={isSaving}
                      className={`p-3 text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all border border-brand/20 shadow-brand/40 ${isSaving ? 'bg-brand/50 cursor-wait' : 'bg-brand'}`}
                      onClick={handleSave}
                      title="Salvar"
                    >
                      <Save size={20} className={isSaving ? 'animate-pulse' : ''} />
                    </button>
                  </>
                )}

                {/* 5: Tela Cheia */}
                <button 
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className={`p-3 backdrop-blur rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all border ${isFullScreen ? 'bg-brand text-white border-brand/20' : 'bg-slate-900/90 text-white border-slate-700'}`}
                  title={isFullScreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                   {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
             </div>
        </div>

        {/* PAGE CONTENT - TRUE FULL WIDTH */}
        <div className="flex flex-col items-center w-full min-h-full">
            <div className="w-full">
              {pages.map((page, index) => (
                  <Document key={page.id} file={page.pdfUrl}>
                      <ScorePage 
                          id={page.id}
                          pdfUrl={page.pdfUrl}
                          pageNumber={page.originalPageNumber}
                          index={index}
                          annotations={annotations[page.id] || []}
                          onAddAnnotation={(stroke) => addAnnotation(page.id, stroke)}
                          onRemoveAnnotation={(strokeId) => removeAnnotation(page.id, strokeId)}
                          tool={tool}
                          activeColor={activeColor}
                          activeWidth={activeWidth}
                          scale={scale}
                          containerWidth={containerWidth}
                      />
                  </Document>
              ))}
            </div>
        </div>

        {pages.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="p-8 bg-slate-200/50 rounded-full mb-6">
                <BookOpen size={80} className="opacity-10 text-slate-900" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-slate-400">Vazio</h2>
              <p className="max-w-xs mt-4 text-slate-500 font-medium">Seu caderno está sem páginas. Adicione partituras para começar.</p>
              <button 
                onClick={() => setShowAddMenu(true)}
                className="mt-8 px-8 py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
              >
                Adicionar Páginas
              </button>
           </div>
        )}
      </main>

      {/* LAYER 3: ADD MENU MODAL */}
      <AnimatePresence>
        {showAddMenu && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-xl shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden"
            >
              <div className="p-10 border-b border-slate-800 flex items-center justify-between bg-black/20">
                <div>
                   <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Biblioteca</h2>
                   <p className="text-slate-500 text-sm font-bold mt-1">Selecione partituras para o seu setlist</p>
                </div>
                <button 
                  onClick={() => setShowAddMenu(false)} 
                  className="p-3 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all hover:rotate-90 active:scale-90"
                >
                   <Plus size={32} className="rotate-45" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-8 space-y-4 custom-scrollbar">
                {availablePartituras.map(part => (
                  <button 
                    key={part.id}
                    onClick={() => addPartituraToNotebook(part)}
                    className="w-full text-left p-6 rounded-[2rem] bg-slate-800/30 hover:bg-brand/10 transition-all border border-slate-800 hover:border-brand/40 group flex items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-slate-800 rounded-2xl text-slate-500 group-hover:text-brand transition-colors">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-200 group-hover:text-white transition-colors text-lg">{part.titulo}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black tracking-widest">{part.pagSelecionadas?.length} PÁG.</span>
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Partitura Original</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-brand text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-90 translate-x-4 group-hover:translate-x-0">
                       <Plus size={24} />
                    </div>
                  </button>
                ))}
                {availablePartituras.length === 0 && (
                  <div className="py-20 text-center">
                     <BookOpen className="mx-auto mb-4 text-slate-800" size={48} />
                     <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Vazio</p>
                     <p className="text-slate-500 text-sm mt-2">Nenhuma outra partitura disponível.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label, compact }: { active: boolean, onClick: () => void, icon: React.ReactNode, label?: string, compact?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1 p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300
        ${active ? 'bg-brand text-white shadow-xl shadow-brand/30 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
        ${compact ? 'w-8 h-8 sm:w-10 sm:h-10' : ''}
      `}
    >
      {icon}
      {label && !compact && <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>}
    </button>
  );
}

function ColorCircle({ color, active, onClick, compact }: { color: string, active: boolean, onClick: () => void, compact?: boolean }) {
  const size = compact ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-8 h-8';
  return (
    <button 
      onClick={onClick}
      className={`${size} rounded-full border-2 border-slate-800 transition-all ${active ? 'scale-125 border-white shadow-lg' : 'hover:scale-110'}`}
      style={{ backgroundColor: color }}
    />
  );
}


