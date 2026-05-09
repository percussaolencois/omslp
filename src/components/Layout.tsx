import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Music2, 
  Settings, 
  User, 
  Menu, 
  X, 
  ChevronDown,
  LayoutDashboard,
  Send,
  LogOut,
  PlusCircle,
  FileStack
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const LOGO_URL = "https://res.cloudinary.com/djuo9edyf/image/upload/v1768831128/logoOrqTransparente_gz39is.png";

export function Navbar() {
  const { profile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const location = useLocation();

  const userRole = profile?.tipoAcesso;
  
  // Regras de acesso baseadas APENAS no tipoAcesso
  const canSeeGrades = userRole === 'Administrativo' || userRole === 'Diretoria' || userRole === 'Maestro';
  const canSeePartsDist = userRole === 'Chefe de Naipe' || userRole === 'Diretoria';
  const isDocOrAdmin = userRole === 'Administrativo' || userRole === 'Diretoria';
  const isChefDeNaipe = userRole === 'Chefe de Naipe';
  const canSeeIntegrantes = isDocOrAdmin || isChefDeNaipe;

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { 
      label: 'Partituras', 
      path: '#', 
      icon: Music2,
      submenu: [
        { label: 'Minhas Partes', path: '/minhas-partituras', icon: User },
        { label: 'Solicitar Partitura', path: '/solicitacao-partitura', icon: PlusCircle }
      ]
    },
    { 
      label: 'Serviços', 
      path: '#', 
      icon: Settings,
      submenu: [
        { 
          label: 'Gerenciamento de Grades', 
          path: '/gerenciamento-grades', 
          icon: LayoutDashboard,
          visible: canSeeGrades
        },
        { 
          label: 'Distribuidor de Grades', 
          path: '/servicos/grades', 
          icon: FileStack,
          visible: canSeeGrades
        },
        { 
          label: 'Gerenciador de Partituras', 
          path: '/servicos/partituras', 
          icon: FileStack,
          visible: canSeePartsDist
        }
      ].filter(sub => sub.visible !== false)
    },
    { 
      label: 'Integrantes', 
      path: '#', 
      icon: User, 
      visible: canSeeIntegrantes,
      submenu: [
        { 
          label: 'Naipes', 
          path: '/gerenciamento-naipes', 
          icon: FileStack,
          visible: isDocOrAdmin 
        },
        { label: 'Músicos', path: '/gerenciamento-musicos', icon: User, visible: isDocOrAdmin },
        { label: 'Meu Naipe', path: '/meu-naipe', icon: User, visible: isChefDeNaipe }
      ].filter(sub => sub.visible !== false)
    },
    { label: 'Meu Perfil', path: '/perfil', icon: User },
  ].filter(item => (!item.submenu || item.submenu.length > 0) && item.visible !== false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-brand text-white shadow-lg transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4">
            <img src={LOGO_URL} alt="Logo" className="h-12 w-auto brightness-0 invert" />
            <div className="hidden md:block">
              <h1 className="text-[10px] uppercase tracking-widest font-extrabold opacity-70 leading-none">Orquestra Municipal de Sopros de Lençóis Paulista</h1>
              <h2 className="text-[11px] font-medium leading-tight text-white/90">Maestro Agostinho Duarte Martins</h2>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                {item.submenu ? (
                  <button 
                    onClick={() => setOpenSubmenu(openSubmenu === item.label ? null : item.label)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                      item.submenu.some(s => isActive(s.path)) || openSubmenu === item.label
                        ? "text-white bg-white/20"
                        : "text-blue-200 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <item.icon size={20} />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                      <ChevronDown size={12} className={cn("transition-transform", openSubmenu === item.label && "rotate-180")} />
                    </div>
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                      isActive(item.path)
                        ? "text-white bg-white/20"
                        : "text-blue-200 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <item.icon size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                  </Link>
                )}

                {item.submenu && openSubmenu === item.label && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-2 overflow-hidden">
                    {item.submenu.map((sub) => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        onClick={() => setOpenSubmenu(null)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                          isActive(sub.path)
                            ? "text-brand bg-brand/10"
                            : "text-slate-600 hover:bg-brand/5"
                        )}
                      >
                        <sub.icon size={16} />
                        <span className="font-bold">{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="h-6 w-px bg-slate-200 mx-2" />
            
            <button
              onClick={logout}
              className="p-2 rounded-full hover:bg-red-500/20 text-white/80 hover:text-white"
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-100">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-slate-200 overflow-y-auto max-h-[calc(100vh-80px)]"
            >
              <div className="px-4 py-4 space-y-3">
                {navItems.map((item) => (
                  <div key={item.label}>
                    {item.submenu ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 px-3 py-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                          {item.label}
                        </div>
                        {item.submenu.map((sub) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-medium",
                              isActive(sub.path)
                                ? "text-brand bg-brand/5"
                                : "text-slate-600"
                            )}
                          >
                            <sub.icon size={20} />
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg font-medium",
                          isActive(item.path)
                            ? "text-brand bg-brand/5"
                            : "text-slate-600"
                        )}
                      >
                        <item.icon size={20} />
                        {item.label}
                      </Link>
                    )}
                  </div>
                ))}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={20} />
                  Sair
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      {/* Background click to close submenus */}
      {openSubmenu && (
        <div className="fixed inset-0 z-30" onClick={() => setOpenSubmenu(null)} />
      )}
    </>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 mt-16 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
      <footer className="py-8 bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-serif text-slate-500 text-sm">
            Orquestra Municipal de Sopros de Lençóis Paulista - Maestro Agostinho Duarte Martins
          </p>
          <p className="text-slate-400 text-xs mt-2 font-bold tracking-widest uppercase">
            OMSLP • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
