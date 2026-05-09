import React, { useState, useEffect, useRef } from 'react';
import { FileStack, FileText, Loader2, CheckCircle2, Folder, ChevronDown } from 'lucide-react';
import { collection, getDocs, query, where, doc, setDoc, writeBatch, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import * as pdfjs from 'pdfjs-dist';

// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Partitura {
  id: string;
  titulo: string;
  repertorio: string;
  pdfUrl?: string; // New field
  partituras?: string; // Base64 (legacy)
  pagSelecionadas?: number[]; // New field
  assignedAt: string;
}

interface NaipeFolder {
    id: string;
    nome: string;
}

interface PDFThumbnailProps {
  pageNumber: number;
  pdf: pdfjs.PDFDocumentProxy;
  onSelect: (n: number) => void;
  isSelected: boolean;
}

const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ pageNumber, pdf, onSelect, isSelected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderThumbnail = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        } as any).promise;
      } catch (error) {
        console.error("Error rendering thumbnail:", error);
      }
    };

    renderThumbnail();
  }, [pdf, pageNumber]);

  return (
    <div 
      onClick={() => onSelect(pageNumber)}
      className={cn(
        "flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-all p-1 w-16 md:w-20 bg-white shadow-sm relative",
        isSelected ? "border-brand ring-4 ring-brand/5 scale-105 z-10" : "border-transparent hover:border-slate-200 hover:scale-102"
      )}
    >
      <canvas ref={canvasRef} className="rounded-lg w-full h-auto" />
      {isSelected && (
        <div className="absolute top-1 right-1 bg-brand text-white rounded-full p-0.5 shadow-sm transform scale-75 md:scale-90 origin-top-right">
          <CheckCircle2 size={12} strokeWidth={4} />
        </div>
      )}
      <p className={cn(
        "text-[7px] font-black text-center mt-1 uppercase tracking-tighter",
        isSelected ? "text-brand" : "text-slate-400"
      )}>
        Pág {pageNumber}
      </p>
    </div>
  );
};

interface PDFPageRendererProps {
  pageNumber: number;
  pdf: pdfjs.PDFDocumentProxy;
}

const PDFPageRenderer: React.FC<PDFPageRendererProps> = ({ pageNumber, pdf }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const renderPage = async () => {
      setLoading(true);
      try {
        const page = await pdf.getPage(pageNumber);
        
        const containerWidth = containerRef.current?.clientWidth || (window.innerWidth > 768 ? 800 : window.innerWidth - 32);
        
        const initialViewport = page.getViewport({ scale: 1 });
        const scale = (containerWidth * 0.95) / initialViewport.width;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = outputScale !== 1
          ? [outputScale, 0, 0, outputScale, 0, 0]
          : null;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          transform: transform as any
        } as any).promise;
      } catch (error) {
        console.error("Error rendering page:", error);
      } finally {
        setLoading(false);
      }
    };

    renderPage();
  }, [pdf, pageNumber]);

  return (
    <div ref={containerRef} className="relative bg-slate-900 rounded-[32px] p-2 md:p-10 flex items-center justify-center min-h-[500px] overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm">
          <Loader2 className="animate-spin text-white/40" size={40} />
        </div>
      )}
      <motion.div 
        key={pageNumber}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="max-w-full rounded-xl shadow-2xl bg-white overflow-hidden"
      >
        <canvas ref={canvasRef} className="max-w-full h-auto block" />
      </motion.div>
    </div>
  );
};

export function PartituraManagement() {
  const { profile } = useAuth();
  const [partituras, setPartituras] = useState<Partitura[]>([]);
  const [integrantes, setIntegrantes] = useState<any[]>([]);
  const [selectedPartituraId, setSelectedPartituraId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingIntegrantes, setLoadingIntegrantes] = useState(true);
  const [atribuindo, setAtribuindo] = useState(false);
  const [selectedIntegranteId, setSelectedIntegranteId] = useState<string | null>(null);

  const selectedPartitura = partituras.find(p => p.id === selectedPartituraId);

  // PDF Viewer State
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [currentViewPage, setCurrentViewPage] = useState(1);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (profile?.naipe) {
      fetchPartituras();
      fetchIntegrantes();
    }
  }, [profile]);

  const fetchPartituras = async () => {
    setLoading(true);
    try {
      // 1. Achar ID do Naipe
      const naipesRef = collection(db, 'config', 'naipes', 'lista');
      const naipeQuery = query(naipesRef, where('naipe', '==', profile?.naipe));
      const naipeSnapshot = await getDocs(naipeQuery);
      
      if (naipeSnapshot.empty) {
        console.error("Naipe não encontrado");
        setLoading(false);
        return;
      }
      
      const naipeId = naipeSnapshot.docs[0].id;
      
      // 2. Fetch Partituras
      const repertorioRef = collection(db, 'config', 'naipes', 'lista', naipeId, 'repertorios');
      const querySnapshot = await getDocs(repertorioRef);
      
      const partiturasList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Partitura[];
      
      setPartituras(partiturasList);
    } catch (error) {
      console.error("Erro ao carregar partituras:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrantes = async () => {
    setLoadingIntegrantes(true);
    try {
      // 1. Achar ID do Naipe
      const naipesRef = collection(db, 'config', 'naipes', 'lista');
      const naipeQuery = query(naipesRef, where('naipe', '==', profile?.naipe));
      const naipeSnapshot = await getDocs(naipeQuery);
      
      if (!naipeSnapshot.empty) {
        const naipeId = naipeSnapshot.docs[0].id;
        
        // 2. Fetch Integrantes
        const integrantesRef = collection(db, 'config', 'naipes', 'lista', naipeId, 'integrantes');
        const querySnapshot = await getDocs(integrantesRef);
        
        const integrantesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setIntegrantes(integrantesList);
      }
    } catch (error) {
      console.error("Erro ao carregar integrantes:", error);
    } finally {
      setLoadingIntegrantes(false);
    }
  };

  const loadPdf = async (partitura: Partitura) => {
    setLoadingPdf(true);
    setPdfDoc(null);
    setSelectedPages(partitura.pagSelecionadas || []);
    setCurrentViewPage(partitura.pagSelecionadas?.[0] || 1);
    try {
      const url = partitura.pdfUrl || partitura.partituras; // fallback
      if (!url) throw new Error("PDF URL não encontrado");

      let data;
      if (partitura.pdfUrl) {
          const response = await fetch(url);
          data = await response.arrayBuffer();
      } else {
          const base64Data = url.includes('base64,') ? url.split('base64,')[1] : url;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          data = bytes;
      }
      
      const pdf = await pdfjs.getDocument({ data }).promise;
      setPdfDoc(pdf);
    } catch (error: any) {
      console.error("Erro ao carregar PDF:", error);
      alert("Erro ao carregar o PDF.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleAtribuirPartitura = async () => {
    if (!selectedIntegranteId || selectedPages.length === 0 || !selectedPartituraId) return;
    setAtribuindo(true);
    try {
      const selectedPartitura = partituras.find(p => p.id === selectedPartituraId);
      if (!selectedPartitura) return;
      
      const { pdfUrl, titulo, repertorio } = selectedPartitura;
      if (!pdfUrl) throw new Error("PDF URL não encontrado na partitura");
      
      // Salvar no Firestore
      const naipesRef = collection(db, 'config', 'naipes', 'lista');
      const naipeQuery = query(naipesRef, where('naipe', '==', profile?.naipe));
      const naipeSnapshot = await getDocs(naipeQuery);
      if (naipeSnapshot.empty) return;
      const naipeId = naipeSnapshot.docs[0].id;
      
      const batch = writeBatch(db);
      const integranteRef = doc(db, 'config', 'naipes', 'lista', naipeId, 'integrantes', selectedIntegranteId);
      const repertorioCollectionRef = collection(db, 'config', 'naipes', 'lista', naipeId, 'integrantes', selectedIntegranteId, repertorio);
      const path = doc(repertorioCollectionRef);
      
      batch.set(path, {
        titulo: titulo,
        pdfUrl: pdfUrl,
        pagSelecionadas: selectedPages.sort((a, b) => a - b),
        partituraOriginalId: selectedPartituraId,
        createdAt: new Date().toISOString()
      });
      batch.update(integranteRef, {
        totalPartituras: increment(1),
        repertorios: arrayUnion(repertorio)
      });
      
      await batch.commit();
      alert('Partitura atribuída com sucesso!');
      setSelectedIntegranteId(null);
      setSelectedPages([]);
      setSelectedPartituraId('');
    } catch (error) {
      console.error(error);
      alert('Erro ao atribuir partitura.');
    } finally {
      setAtribuindo(false);
    }
  };

  const togglePageSelection = (pageNumber: number) => {
    setCurrentViewPage(pageNumber);
    setSelectedPages(prev => 
      prev.includes(pageNumber) 
        ? prev.filter(p => p !== pageNumber) 
        : [...prev, pageNumber]
    );
  };

  useEffect(() => {
    const selected = partituras.find(p => p.id === selectedPartituraId);
    if (selected) {
      loadPdf(selected);
    } else {
      setPdfDoc(null);
    }
  }, [selectedPartituraId, partituras]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand tracking-tight">Gerenciador de Partituras</h1>
          <p className="text-[11px] md:text-sm text-slate-500 font-medium">Visualização de partituras atribuídas ao seu naipe ({profile?.naipe}).</p>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna da Esquerda - Seleção e PDF */}
        <div className="lg:col-span-8 space-y-6">
          {/* Selecionar Música */}
          <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/5 text-brand rounded-xl flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none ml-1">Partituras do Naipe</h3>
                <div className="relative group mt-1">
                  <select 
                    value={selectedPartituraId}
                    onChange={(e) => setSelectedPartituraId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white rounded-xl py-2 px-3 pr-8 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand/20 transition-all text-sm appearance-none cursor-pointer truncate"
                  >
                    <option value="">Selecione uma partitura...</option>
                    {partituras.map((p) => (
                      <option key={p.id} value={p.id}>{p.titulo}</option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>
            {loading && <p className="text-xs text-slate-400 ml-12">Carregando...</p>}
          </div>

          {/* Manipulação do PDF */}
          {selectedPartituraId !== '' && pdfDoc ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {loadingPdf ? (
                <div className="bg-slate-50 py-20 rounded-[32px] border border-slate-200 flex flex-col items-center justify-center gap-4">
                   <Loader2 size={32} className="animate-spin text-brand/20" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando PDF...</p>
                </div>
              ) : (
                <div className="space-y-6">
                   {/* Thumbnail Navigation */}
                   <div className="bg-white p-4 rounded-[28px] border border-slate-200 shadow-sm relative">
                       <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Páginas</h3>
                        <div className="flex items-center gap-2">
                          {selectedPages.length > 0 && (
                            <span className="bg-brand text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                              {selectedPages.length} Selecionada{selectedPages.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <div 
                            className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-4 py-2 px-1 cursor-grab active:cursor-grabbing select-none"
                         >
                            {(selectedPartitura?.pagSelecionadas || Array.from({ length: pdfDoc.numPages }).map((_, i) => i + 1)).map((pageNumber) => (
                              <PDFThumbnail 
                                key={pageNumber}
                                pageNumber={pageNumber}
                                pdf={pdfDoc}
                                isSelected={selectedPages.includes(pageNumber)}
                                onSelect={togglePageSelection}
                              />
                            ))}
                         </div>
                      </div>
                   </div>
    
                   {/* Large Preview */}
                   <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualização</h3>
                        <div className="bg-brand/5 border border-brand/10 px-3 py-1 rounded-full">
                           <p className="text-[9px] font-black text-brand uppercase tracking-widest">Página {currentViewPage}</p>
                        </div>
                      </div>
                      <PDFPageRenderer 
                        pdf={pdfDoc} 
                        pageNumber={currentViewPage} 
                      />
                   </div>
                </div>
              )}
            </motion.div>
          ) : !loading && selectedPartituraId && (
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 text-center">
              <p className="text-sm font-bold text-slate-500">Selecione uma partitura válida.</p>
            </div>
          )}
        </div>

        {/* Coluna da Direita - Pastas e Info */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Integrantes do Naipe */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Integrantes do Naipe</h3>
              </div>
              
              <div className="p-4 space-y-3">
                {loadingIntegrantes ? (
                  <p className="text-xs text-slate-400">Carregando...</p>
                ) : integrantes.length > 0 ? (
                  integrantes.map((m) => (
                    <div 
                      key={m.id} 
                      onClick={() => setSelectedIntegranteId(m.id === selectedIntegranteId ? null : m.id)}
                      className={cn(
                          "flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all",
                          m.id === selectedIntegranteId ? "bg-brand/5 border-brand" : "border-transparent hover:bg-slate-50"
                      )}
                    >
                        <img 
                          src={m.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop'} 
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                          alt={m.Nome}
                        />
                        <p className={cn("font-bold text-sm", m.id === selectedIntegranteId ? "text-brand" : "text-slate-700")}>{m.Nome}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Nenhum integrante.</p>
                )}
              </div>
            </div>

            {/* Botão de Ação */}
            <button 
              disabled={!selectedIntegranteId || selectedPages.length === 0 || !selectedPartituraId || atribuindo}
              className="w-full bg-brand text-white py-4 rounded-2xl font-bold text-sm disabled:opacity-50 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
              onClick={handleAtribuirPartitura}
            >
                {atribuindo && <Loader2 size={16} className="animate-spin" />}
                {atribuindo ? 'Atribuindo...' : 'Atribuir partitura'}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
