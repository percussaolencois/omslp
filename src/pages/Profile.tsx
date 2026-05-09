import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Shield, 
  Music2, 
  Mail, 
  Calendar, 
  Award,
  IdCard,
  Camera,
  ExternalLink,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { cn } from '../lib/utils';

export function Profile() {
  const { profile, updateProfileData, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    Nome: profile?.Nome || '',
    naipe: profile?.naipe || '',
    tipoAcesso: profile?.tipoAcesso || 'Músico',
    fotoUrl: profile?.fotoUrl || '',
    telefone: profile?.telefone || '',
    ativo: profile?.ativo ?? true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEditRoleAndStatus = profile?.tipoAcesso === 'Diretoria';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfileData(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      alert("Erro ao salvar dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const folderName = profile?.Nome || 'unkwown_user';
      const storageRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, fotoUrl: url }));
      // Auto-save photo URL
      await updateProfileData({ fotoUrl: url });
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar foto.");
    } finally {
      setIsSaving(false);
    }
  };

  const InfoCard = ({ icon: Icon, label, value, color = "text-brand" }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 group hover:border-brand/30 transition-all hover:shadow-md">
      <div className={`p-1.5 w-fit rounded-lg bg-slate-50 group-hover:bg-brand group-hover:text-white transition-colors ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-slate-800 font-bold text-base leading-tight tracking-tight">{value || 'Não definido'}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 font-sans">
      {/* Hero Profile Section */}
      <section className="relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-brand rounded-t-3xl -z-10 opacity-5 blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-6 px-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-xl overflow-hidden border-4 border-white shadow-2xl relative bg-slate-100">
              <img 
                src={formData.fotoUrl || profile?.fotoUrl || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&h=400&fit=crop'} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt={profile?.Nome}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {isSaving ? <Loader2 className="text-white animate-spin" /> : <Camera className="text-white" size={20} />}
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            {isAdmin && (
              <div className="absolute -top-2 -right-2 bg-brand text-white p-2 rounded-lg shadow-lg border-2 border-white">
                <Shield size={16} />
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2 pb-2">
            <div className="space-y-0.5">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {profile?.Nome || 'Músico'}
                </h1>
                <span className="hidden md:inline-flex px-2 py-0.5 bg-brand text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                  {profile?.tipoAcesso}
                </span>
              </div>
              <p className="text-slate-500 font-medium text-base tracking-tight max-w-lg">
                {profile?.naipe || 'Integrante da Orquestra'} — Orquestra Municipal de Sopros
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Details */}
        <div className="md:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.div 
                key="view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <InfoCard icon={IdCard} label="Nome Completo" value={profile?.Nome} />
                <InfoCard icon={Mail} label="E-mail Institucional" value={profile?.email} />
                <InfoCard icon={Music2} label="Naipe / Instrumento" value={profile?.naipe || 'A definir'} />
                <InfoCard icon={Award} label="Função no Sistema" value={profile?.tipoAcesso} />
                <InfoCard icon={Calendar} label="Integrante desde" value={formatDate(profile?.createdAt)} />
                
                <div className="bg-brand p-4 px-5 rounded-xl shadow-lg shadow-blue-900/10 flex flex-col justify-between text-white">
                   <div className="bg-white/20 p-1.5 w-fit rounded-lg">
                     <ExternalLink size={16} />
                   </div>
                   <div>
                     <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mb-0.5">Status Profissional</p>
                     <p className="font-bold text-base tracking-tight">{profile?.ativo !== false ? 'Ativo & Regularizado' : 'Inativo / Suspenso'}</p>
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-6 rounded-2xl border border-brand/20 shadow-xl space-y-5"
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-black text-brand uppercase tracking-tighter">Editar Perfil Profissional</h2>
                  <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text"
                      value={formData.Nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, Nome: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand/20 transition-all font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                    <input 
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 11) value = value.slice(0, 11);
                        let masked = value;
                        if (value.length > 2) masked = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        if (value.length > 7) masked = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                        setFormData(prev => ({ ...prev, telefone: masked }));
                      }}
                      placeholder="(xx) xxxxx-xxxx"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand/20 transition-all font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Naipe</label>
                    <input 
                      type="text"
                      value={formData.naipe}
                      onChange={(e) => setFormData(prev => ({ ...prev, naipe: e.target.value }))}
                      placeholder="Ex: Madeiras / Sax Altista"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand/20 transition-all font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Função (tipoAcesso)</label>
                    <select 
                      disabled={!canEditRoleAndStatus}
                      value={formData.tipoAcesso}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipoAcesso: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand/20 transition-all font-bold outline-none disabled:opacity-50"
                    >
                      <option value="Músico">Músico</option>
                      <option value="Chefe de Naipe">Chefe de Naipe</option>
                      <option value="Maestro">Maestro</option>
                      <option value="Diretoria">Diretoria</option>
                      <option value="Administrativo">Administrativo</option>
                    </select>
                    {!canEditRoleAndStatus && <p className="text-[9px] text-slate-400 mt-0.5">* Apenas Diretoria pode alterar funções.</p>}
                  </div>

                  {canEditRoleAndStatus && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Status da Conta</p>
                        <p className="text-[10px] text-slate-400">Usuários inativos não conseguem logar no sistema.</p>
                      </div>
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, ativo: !prev.ativo }))}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          formData.ativo ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}
                      >
                        {formData.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-brand text-white py-3 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-brand-light transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar dados</>}
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-5 bg-slate-100 text-slate-600 py-3 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Actions/Stats */}
        <div className="space-y-5">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/50 space-y-4">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-[0.2em]">Configurações</h3>
            <div className="space-y-2">
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full py-3 px-5 bg-white border border-slate-200 rounded-lg font-bold text-xs text-slate-700 hover:border-brand hover:text-brand transition-all flex items-center justify-between group"
                >
                  Editar Dados
                  <User size={14} className="text-slate-300 group-hover:text-brand transition-colors" />
                </button>
              )}
              <button className="w-full py-3 px-5 bg-white border border-slate-200 rounded-lg font-bold text-xs text-slate-700 hover:border-brand hover:text-brand transition-all flex items-center justify-between group opacity-50 cursor-not-allowed">
                Segurança
                <Shield size={14} className="text-slate-300 group-hover:text-brand transition-colors" />
              </button>
            </div>
          </div>

          {/* Artistic Status */}
          <div className="p-6 border-l-4 border-brand bg-white shadow-sm rounded-r-xl">
            <p className="font-bold text-slate-600 text-sm leading-tight tracking-tight">
              "A música exprime a mais alta filosofia numa linguagem que a razão não compreende."
            </p>
            <p className="text-[9px] font-black text-slate-400 mt-3 uppercase tracking-[0.2em]">Arthur Schopenhauer</p>
          </div>
        </div>
      </div>
    </div>
  );
}

