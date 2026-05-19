import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { MyMusic } from './pages/MyMusic';
import { Distribution } from './pages/Distribution';
import { ScoreDistribution } from './pages/ScoreDistribution';
import { PartituraManagement } from './pages/PartituraManagement';
import { GradesManagement } from './pages/GradesManagement';
import { MusicRequest } from './pages/MusicRequest';
import { NaipeManagement } from './pages/NaipeManagement';
import { UserManagement } from './pages/UserManagement';
import { MeuNaipe } from './pages/MeuNaipe';
import { Profile } from './pages/Profile';
import { Register } from './pages/Register';
import { Agenda } from './pages/Agenda';
import { Comunicados } from './pages/Comunicados';
import { Documentos } from './pages/Documentos';
import { Justificativas } from './pages/Justificativas';
import { MinhasFaltas } from './pages/MinhasFaltas';
import { GerenciamentoFaltas } from './pages/GerenciamentoFaltas';
import { AnaliseFaltas } from './pages/AnaliseFaltas';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/minhas-partituras" element={<PrivateRoute><MyMusic /></PrivateRoute>} />
          <Route path="/solicitacao-partitura" element={<PrivateRoute><MusicRequest /></PrivateRoute>} />
          <Route path="/servicos/distribuicao" element={<PrivateRoute><Distribution /></PrivateRoute>} />
          <Route path="/servicos/grades" element={<PrivateRoute><ScoreDistribution /></PrivateRoute>} />
          <Route path="/servicos/partituras" element={<PrivateRoute><PartituraManagement /></PrivateRoute>} />
          <Route path="/servicos/faltas" element={<PrivateRoute><GerenciamentoFaltas /></PrivateRoute>} />
          <Route path="/servicos/faltas/analise" element={<PrivateRoute><AnaliseFaltas /></PrivateRoute>} />
          <Route path="/gerenciamento-grades" element={<PrivateRoute><GradesManagement /></PrivateRoute>} />
          <Route path="/gerenciamento-naipes" element={<PrivateRoute><NaipeManagement /></PrivateRoute>} />
          <Route path="/gerenciamento-musicos" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="/meu-naipe" element={<PrivateRoute><MeuNaipe /></PrivateRoute>} />
          <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/minhas-faltas" element={<PrivateRoute><MinhasFaltas /></PrivateRoute>} />

          <Route path="/secretaria/agenda" element={<PrivateRoute><Agenda /></PrivateRoute>} />
          <Route path="/secretaria/comunicados" element={<PrivateRoute><Comunicados /></PrivateRoute>} />
          <Route path="/secretaria/documentos" element={<PrivateRoute><Documentos /></PrivateRoute>} />
          <Route path="/justificativas" element={<PrivateRoute><Justificativas /></PrivateRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
