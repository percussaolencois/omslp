import React, { useState, useEffect, useRef } from 'react';
import { FileStack, Upload, Plus, X, Search, FileText, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';

// Usar o worker local do pacote instalado
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Grade {
  id: string;
  titulo: string;
  repertorio: string;
  pdfUrl: string;
  createdAt: string;
}

const PDFThumbnail = ({ pageNumber, pdf, onSelect, isSelected }: { pageNumber: number, pdf: pdfjs.PDFDocumentProxy, onSelect: (n: number) => void, isSelected: boolean }) => {
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
        }).promise;
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
        "flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-all p-1 w-24 md:w-28 bg-white shadow-sm",
        isSelected ? "border-brand ring-4 ring-brand/5 scale-105 z-10" : "border-transparent hover:border-slate-200 hover:scale-102"
      )}
    >
      <canvas ref={canvasRef} className="rounded-lg w-full h-auto" />
      <p className={cn(
        "text-[8px] font-black text-center mt-1.5 uppercase tracking-tighter",
        isSelected ? "text-brand" : "text-slate-400"
      )}>
        Página {pageNumber}
      </p>
    </div>
  );
};

const PDFPageRenderer = ({ pageNumber, pdf }: { pageNumber: number, pdf: pdfjs.PDFDocumentProxy }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const renderPage = async () => {
      setLoading(true);
      try {
        const page = await pdf.getPage(pageNumber);
        
        // Use a default width if container is not yet measured (e.g. initial render)
        const containerWidth = containerRef.current?.clientWidth || (window.innerWidth > 768 ? 800 : window.innerWidth - 32);
        
        const initialViewport = page.getViewport({ scale: 1 });
        const scale = (containerWidth * 0.95) / initialViewport.width;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Support high DPI screens
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
        }).promise;
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

export function ScoreDistribution() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // PDF Viewer State
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [selectedPageNumber, setSelectedPageNumber] = useState(1);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Form states
  const [isUploading, setIsUploading] = useState(false);
  const [newGradeTitle, setNewGradeTitle] = useState('');
  const [newGradeRepertorio, setNewGradeRepertorio] = useState('');
  const [newGradeFile, setNewGradeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'grades'), orderBy('titulo', 'asc'));
      const querySnapshot = await getDocs(q);
      const gradesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Grade[];
      setGrades(gradesList);
    } catch (error) {
      console.error("Erro ao carregar grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPdf = async (url: string) => {
    setLoadingPdf(true);
    setPdfDoc(null);
    try {
      // Tentar buscar o arquivo primeiro para verificar CORS
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erro ao buscar PDF: ${response.statusText}`);
      
      const data = await response.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setSelectedPageNumber(1);
    } catch (error) {
      console.error("Erro ao carregar PDF:", error);
      if (error instanceof Error && error.message.includes('CORS')) {
        alert("Erro de acesso (CORS). Por favor, siga as instruções no console do Firebase para permitir o acesso ao storage.");
      }
    } finally {
      setLoadingPdf(false);
    }
  };

  useEffect(() => {
    const selectedGrade = grades.find(g => g.id === selectedGradeId);
    if (selectedGrade) {
      loadPdf(selectedGrade.pdfUrl);
    } else {
      setPdfDoc(null);
    }
  }, [selectedGradeId, grades]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewGradeFile(file);
      if (!newGradeTitle) {
        setNewGradeTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeFile || !newGradeTitle) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `Grades/${newGradeTitle}.pdf`);
      await uploadBytes(storageRef, newGradeFile);
      const pdfUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'grades'), {
        titulo: newGradeTitle,
        repertorio: newGradeRepertorio,
        pdfUrl,
        uploadedBy: profile?.uid,
        createdAt: new Date().toISOString()
      });

      setNewGradeFile(null);
      setNewGradeTitle('');
      setNewGradeRepertorio('');
      setIsModalOpen(false);
      await fetchGrades();
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao salvar grade.");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredGrades = grades.filter(g => 
    g.titulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedGrade = grades.find(g => g.id === selectedGradeId);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand tracking-tight">Distribuidor de Grades</h1>
          <p className="text-[11px] md:text-sm text-slate-500 font-medium">Gerenciamento e organização dos PDFs de Grade da orquestra.</p>
        </div>
      </header>

      {/* Main Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
        {/* Selection Area */}
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 md:space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar música</label>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => navigate('/gerenciamento-grades')}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand transition-colors"
                >
                  <FileStack size={14} className="md:w-4 md:h-4" />
                </button>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-brand transition-colors flex items-center gap-1 group"
                >
                  <Plus size={14} className="md:w-4 md:h-4" />
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tighter md:opacity-0 md:group-hover:opacity-100 transition-opacity">Nova Grade</span>
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar ou selecionar música..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-inner"
              />
              
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto overflow-x-hidden">
                  {filteredGrades.length > 0 ? (
                    filteredGrades.map(grade => (
                      <button
                        key={grade.id}
                        onClick={() => {
                          setSelectedGradeId(grade.id);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-5 py-3 md:px-6 md:py-4 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                      >
                        <FileText size={16} className="text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-700 text-sm truncate">{grade.titulo}</p>
                          <p className="text-[8px] md:text-[9px] text-slate-400 uppercase font-black">Disponível</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <p className="text-xs font-bold text-slate-400">Nenhuma música encontrada.</p>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="mt-2 text-[10px] font-black text-brand uppercase tracking-widest hover:underline"
                      >
                        Adicionar "{searchQuery}" agora?
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedGrade && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 md:p-6 bg-brand/5 border border-brand/10 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm shrink-0">
                  <FileText size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-slate-800 tracking-tight text-sm md:text-base truncate">{selectedGrade.titulo}</h3>
                  <p className="text-[8px] md:text-[9px] font-black text-brand uppercase tracking-widest leading-none">Selecionada</p>
                </div>
              </div>
              <button 
                 onClick={() => setSelectedGradeId('')}
                 className="p-1.5 md:p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0"
              >
                <X size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </motion.div>
          )}
        </div>

        {/* Second Area - Instructions or Actions */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-dashed border-slate-300 text-center space-y-3 md:space-y-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-slate-300">
              <FileStack size={24} className="md:w-8 md:h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 text-sm md:text-base">Manipulação de Páginas</h3>
              <p className="text-[10px] md:text-xs text-slate-500 max-w-[200px] md:max-w-xs mx-auto">Selecione uma partitura para visualizar e distribuir as páginas para os instrumentos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Manipulation Section */}
      {selectedGrade && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {loadingPdf ? (
            <div className="bg-slate-50 py-20 rounded-[32px] border border-slate-200 flex flex-col items-center justify-center gap-4">
               <Loader2 size={32} className="animate-spin text-brand/20" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando PDF...</p>
            </div>
          ) : pdfDoc ? (
            <div className="space-y-6">
               {/* Thumbnail Navigation */}
               <div className="bg-white p-4 rounded-[28px] border border-slate-200 shadow-sm relative">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Páginas da Grade</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">{selectedPageNumber} de {pdfDoc.numPages}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => setSelectedPageNumber(prev => Math.max(1, prev - 1))}
                       disabled={selectedPageNumber === 1}
                       className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 disabled:opacity-30 shrink-0"
                     >
                       <ChevronLeft size={20} />
                     </button>

                     <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-4 py-2">
                        {Array.from({ length: pdfDoc.numPages }).map((_, i) => (
                          <PDFThumbnail 
                            key={i + 1}
                            pageNumber={i + 1}
                            pdf={pdfDoc}
                            isSelected={selectedPageNumber === (i + 1)}
                            onSelect={setSelectedPageNumber}
                          />
                        ))}
                     </div>

                     <button 
                       onClick={() => setSelectedPageNumber(prev => Math.min(pdfDoc.numPages, prev + 1))}
                       disabled={selectedPageNumber === pdfDoc.numPages}
                       className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 disabled:opacity-30 shrink-0"
                     >
                       <ChevronRight size={20} />
                     </button>
                  </div>
               </div>

               {/* Large Preview */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualização da Página</h3>
                    <div className="bg-brand/5 border border-brand/10 px-3 py-1 rounded-full">
                       <p className="text-[9px] font-black text-brand uppercase tracking-widest">Página {selectedPageNumber}</p>
                    </div>
                  </div>
                  <PDFPageRenderer 
                    pdf={pdfDoc} 
                    pageNumber={selectedPageNumber} 
                  />
               </div>
            </div>
          ) : (
            <div className="bg-red-50 p-8 rounded-[32px] border border-red-100 text-center">
              <p className="text-sm font-bold text-red-500">Erro ao carregar pré-visualização do PDF.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Modal - Nova Grade */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-sm md:max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight uppercase">Nova Grade</h2>
                    <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">Inserir PDF no Arquivo</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                  >
                    <X size={18} className="md:w-5 md:h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpload} className="space-y-5 md:space-y-6">
                  {/* File Upload Zone */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "group cursor-pointer aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 md:gap-3 transition-all",
                      newGradeFile 
                        ? "bg-green-50 border-green-200 text-green-600" 
                        : "bg-slate-50 border-slate-200 hover:border-brand/40 text-slate-400"
                    )}
                  >
                    {newGradeFile ? (
                      <>
                        <CheckCircle2 size={28} className="md:w-8 md:h-8" />
                        <div className="text-center px-4">
                          <p className="text-xs font-bold truncate max-w-[180px]">{newGradeFile.name}</p>
                          <p className="text-[8px] md:text-[10px] font-black uppercase opacity-60">PDF Carregado</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload size={28} className="group-hover:-translate-y-1 transition-transform md:w-8 md:h-8" />
                        <div className="text-center">
                          <p className="text-xs md:text-sm font-bold">Selecionar PDF</p>
                          <p className="text-[8px] md:text-[10px] font-black uppercase opacity-60">Clique aqui</p>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden" 
                      accept="application/pdf"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Música</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Sinfonia n. 5"
                      value={newGradeTitle}
                      onChange={(e) => setNewGradeTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Repertório</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Natal 2024"
                      value={newGradeRepertorio}
                      onChange={(e) => setNewGradeRepertorio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isUploading || !newGradeFile}
                    className="w-full bg-[#002B5B] text-white py-3.5 md:py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-[#003d82] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Upload size={14} /> Salvar no Arquivo
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

