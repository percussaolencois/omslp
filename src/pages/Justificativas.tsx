import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, ArrowLeft, Send, Calendar, FileText, Paperclip, CheckCircle2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function Justificativas() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const editFalta = location.state?.editFalta;

  const [dataFalta, setDataFalta] = useState(editFalta?.data_falta || '');
  const [tipoEvento, setTipoEvento] = useState(editFalta?.tipoEvento || '');
  const [motivo, setMotivo] = useState(editFalta?.motivo || '');
  const [justificativa, setJustificativa] = useState(editFalta?.justificativa || '');
  const [file, setFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dataFalta || !tipoEvento || !motivo) return;
    if (motivo === 'Outros' && !justificativa) return;

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      let anexoUrl = editFalta?.anexo || '';

      if (file) {
        // Safe folder name avoiding invalid characters
        const safeName = (profile?.Nome || user.uid).replace(/[^a-zA-Z0-9-]/g, '_');
        const fileExt = file.name.split('.').pop() || 'file';
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const storageRef = ref(storage, `${safeName}/justificativas/${fileName}`);
        await uploadBytes(storageRef, file);
        anexoUrl = await getDownloadURL(storageRef);
      }

      // We cast profile to any to avoid TypeScript errors if telefone is not in the type definition yet
      const telefone = (profile as any)?.telefone || (profile as any)?.whatsapp || '';

      if (editFalta) {
        await updateDoc(doc(db, 'justificativas', editFalta.id), {
          data_falta: dataFalta,
          data_justificativa: serverTimestamp(),
          tipoEvento,
          motivo,
          justificativa,
          anexo: anexoUrl,
          status: 'Recebido'
        });
        setSuccessMessage('Sua justificativa foi atualizada com sucesso e será analisada pela diretoria.');
      } else {
        await addDoc(collection(db, 'justificativas'), {
          id_integrante: user.uid,
          nome_integrante: profile?.Nome || 'Músico',
          telefone: telefone,
          data_falta: dataFalta,
          data_justificativa: serverTimestamp(),
          tipoEvento,
          motivo,
          justificativa,
          anexo: anexoUrl,
          status: 'Recebido',
          obsADM: ''
        });
        setSuccessMessage('Sua justificativa foi enviada com sucesso e será analisada pela diretoria.');
      }
      
      if (!editFalta) {
        setDataFalta('');
        setTipoEvento('');
        setMotivo('');
        setJustificativa('');
        setFile(null);
      }
    } catch (error) {
      console.error('Erro ao enviar justificativa:', error);
      alert('Ocorreu um erro ao enviar sua justificativa. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-2xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand tracking-tight">{editFalta ? 'Editar Justificativa' : 'Justificativa de Falta'}</h1>
          <p className="text-slate-500 font-medium tracking-tight">{editFalta ? 'Atualize as informações da sua justificativa' : 'Envie sua justificativa de ausência'}</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-all font-medium shrink-0"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
      </header>

      <motion.div 
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm"
      >
        {successMessage ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Enviado!</h2>
            <p className="text-slate-600">{successMessage}</p>
            <button 
              onClick={() => {
                if (editFalta) {
                  navigate(-1);
                } else {
                  setSuccessMessage('');
                }
              }}
              className="mt-6 font-bold text-brand hover:underline"
            >
              {editFalta ? 'Voltar para minhas faltas' : 'Enviar nova justificativa'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Data da Falta */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-brand" />
                Data da falta *
              </label>
              <input 
                type="date" 
                required
                value={dataFalta}
                onChange={(e) => setDataFalta(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              />
            </div>

            {/* Tipo de Evento */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Tipo de Evento *
              </label>
              <div className="flex flex-wrap gap-3">
                {['Ensaio', 'Concerto'].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoEvento(tipo)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                      tipoEvento === tipo 
                        ? 'bg-brand text-white border-brand shadow-md transform scale-105' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo da Falta */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Motivo da falta *
              </label>
              <div className="flex flex-wrap gap-3">
                {['Saúde', 'Trabalho', 'Outros'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                      motivo === m 
                        ? 'bg-brand text-white border-brand shadow-md transform scale-105' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Justificativa (Texto) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-brand" />
                Justificativa {motivo === 'Outros' && <span className="text-red-500">*</span>}
              </label>
              <textarea 
                required={motivo === 'Outros'}
                rows={4}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder={motivo === 'Outros' ? "Por favor, detalhe o motivo da sua ausência..." : "Adicione detalhes (opcional)..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium text-slate-700 resize-none hover:bg-slate-100 transition-colors"
              ></textarea>
            </div>

            {/* Anexo */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Paperclip size={16} className="text-brand" />
                Anexo (Atestado, declaração, etc)
              </label>
              <label className={`w-full flex-col flex items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-brand hover:bg-slate-50'}`}>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                />
                {file ? (
                  <div className="flex flex-col items-center text-emerald-600">
                    <CheckCircle2 size={32} className="mb-2" />
                    <span className="font-bold text-sm text-center">{file.name}</span>
                    <span className="text-xs mt-1 text-emerald-600/70">Clique para trocar de arquivo</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <Paperclip size={20} className="text-slate-400" />
                    </div>
                    <span className="font-bold text-sm text-center text-slate-700">Clique para anexar um arquivo</span>
                    <span className="text-xs mt-1 text-slate-400">PDF, Imagens ou Documentos</span>
                  </div>
                )}
              </label>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !tipoEvento || !motivo}
              className="w-full bg-brand text-white font-bold py-4 px-6 rounded-xl hover:bg-brand/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand/20 text-lg mt-4"
            >
              {isSubmitting ? (
                <span className="animate-pulse">{editFalta ? 'Atualizando justificativa...' : 'Enviando justificativa...'}</span>
              ) : (
                <>
                  <Send size={20} />
                  {editFalta ? 'Atualizar Justificativa' : 'Enviar Justificativa'}
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

