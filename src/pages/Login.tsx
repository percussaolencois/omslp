import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Music2, Mail, Lock, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOGO_URL = "https://res.cloudinary.com/djuo9edyf/image/upload/v1768831128/logoOrqTransparente_gz39is.png";

export function Login() {
  const { loginWithGoogle, loginWithEmail, user, loading: authLoading, isAccountInactive, setIsAccountInactive } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError('');
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err: any) {
      setError('Credenciais inválidas ou erro no sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {/* Modal de Conta Inativa */}
      <AnimatePresence>
        {isAccountInactive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert size={32} />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Acesso Bloqueado</h2>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Sua conta está marcada como <span className="font-bold text-red-500">inativa</span>. 
                    Por favor, entre em contato com a diretoria para reativar seu acesso.
                  </p>
                </div>

                <button 
                  onClick={() => setIsAccountInactive(false)}
                  className="w-full bg-[#002B5B] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#003d82] transition-all"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col"
      >
        {/* Header com Bulge Azul - Ocupa largura total */}
        <div className="bg-[#002B5B] pt-16 pb-20 text-white text-center relative overflow-hidden shrink-0">
          <div className="max-w-[440px] mx-auto px-6 relative z-10">
            <img 
              src={LOGO_URL} 
              alt="Orquestra Logo" 
              className="w-28 h-auto mx-auto mb-8 brightness-0 invert opacity-90"
            />
            <h1 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-60 mb-1">
              Orquestra Municipal de Sopros de Lençóis Paulista
            </h1>
            <h2 className="text-lg font-semibold leading-tight text-blue-100">
              Maestro Agostinho Duarte Martins
            </h2>
          </div>
          
          {/* Arco que "bulge" para cima (concavidade no cabeçalho) */}
          <div className="absolute bottom-0 left-[-25%] right-[-25%] h-12 bg-white rounded-t-[100%]" />
        </div>
        
        {/* Formulário - Ocupa largura total mas centraliza conteúdo */}
        <div className="flex-1 bg-white">
          <div className="max-w-[440px] mx-auto px-10 py-4 space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg text-center uppercase tracking-widest">
                  {error}
                </div>
              )}
              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">E-mail</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002B5B]/60 group-focus-within:text-[#002B5B] transition-colors">
                    <Mail size={16} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-white border border-[#002B5B]/40 focus:border-[#002B5B] focus:ring-4 focus:ring-[#002B5B]/5 rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Senha</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002B5B]/60 group-focus-within:text-[#002B5B] transition-colors">
                    <Lock size={16} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-[#002B5B]/40 focus:border-[#002B5B] focus:ring-4 focus:ring-[#002B5B]/5 rounded-lg py-2.5 pl-10 pr-10 text-sm outline-none transition-all font-medium text-slate-900"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002B5B]/40 hover:text-[#002B5B] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#002B5B] hover:bg-[#004080] text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md shadow-blue-900/10 active:scale-[0.98] text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Acessar OMSLP'}
              </button>
            </form>

            {/* Divisor */}
            <div className="flex items-center justify-center gap-4 py-1">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Conectar com</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading || authLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3 px-6 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 text-xs shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31l3.57 2.77c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-2.03 0-3.83.74-5.21 1.95L3.13 0C5.35-1.91 8.28-3 12-3z"/>
              </svg>
              Acessar com o Google
            </button>

            {/* Links Adicionais */}
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <button className="text-[10px] font-bold text-slate-400 hover:text-[#002B5B] transition-colors uppercase tracking-widest">
                Esqueceu a senha?
              </button>
              <Link to="/register" className="text-[10px] font-black text-[#002B5B] hover:underline transition-colors uppercase tracking-[0.1em]">
                Não tem conta? Cadastre-se
              </Link>
            </div>

            {/* Footer OMSLP */}
            <div className="pt-4 flex flex-col items-center gap-6 border-t border-slate-50">
              <div className="flex items-center gap-2 text-slate-200">
                <Music2 size={14} />
                <span className="text-[10px] font-black tracking-[0.3em]">OMSLP</span>
              </div>
              
              <p className="text-center text-slate-300 text-[9px] uppercase tracking-widest font-black opacity-60">
                Sistema de Gestão Digital • Acesso Restrito
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
