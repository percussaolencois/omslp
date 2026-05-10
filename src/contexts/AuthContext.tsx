import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, pass: string, data: any) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAccountInactive, setIsAccountInactive] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (data.ativo === false) {
            await signOut(auth);
            setIsAccountInactive(true);
            setProfile(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          setIsAccountInactive(false);
          if (!data.createdAt) {
            const now = new Date().toISOString();
            await setDoc(docRef, { createdAt: now }, { merge: true });
            data.createdAt = now;
          }
          setProfile(data);
        } else {
          // Create initial profile
          const now = new Date().toISOString();
          const newProfile = {
            uid: user.uid,
            Nome: user.displayName || '',
            email: user.email,
            naipe: '',
            fotoUrl: user.photoURL || "https://cdn-icons-png.flaticon.com/512/767/767455.png",
            tipoAcesso: 'Músico',
            ativo: true,
            createdAt: now,
            updatedAt: now
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const registerWithEmail = async (email: string, pass: string, extraData: any) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    const newProfile = {
      uid: user.uid,
      Nome: extraData.nome,
      email: email,
      naipe: '',
      fotoUrl: extraData.fotoUrl || "https://cdn-icons-png.flaticon.com/512/767/767455.png",
      tipoAcesso: 'Músico',
      ativo: true,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', user.uid), newProfile);
    setProfile(newProfile);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfileData = async (data: any) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    setProfile((prev: any) => ({ ...prev, ...data }));
  };

  const isAdmin = ['Administrativo', 'Diretoria', 'Maestro'].includes(profile?.tipoAcesso || '') || user?.email === 'percussaolencois@gmail.com';

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      loginWithGoogle, 
      registerWithEmail,
      loginWithEmail,
      logout,
      updateProfileData,
      isAccountInactive,
      setIsAccountInactive
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
