// Authentication hook and context
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserData } from '@/lib/auth';
import type { User } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user data from Firestore with retry logic
        // This handles the case where Cloud Function hasn't finished creating the doc yet
        let data = await getCurrentUserData(firebaseUser.uid);

        if (!data) {
          // Retry a few times with exponential backoff
          const maxRetries = 5;
          const baseDelay = 500; // Start with 500ms

          for (let i = 0; i < maxRetries && !data; i++) {
            const delay = baseDelay * Math.pow(2, i); // 500, 1000, 2000, 4000, 8000
            await new Promise(resolve => setTimeout(resolve, delay));
            data = await getCurrentUserData(firebaseUser.uid);
          }
        }

        setUserData(data);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    const { signOut: firebaseSignOut } = await import('@/lib/auth');
    await firebaseSignOut();
    setUser(null);
    setUserData(null);
  };

  const contextValue: AuthContextType = { user, userData, loading, signOut };

  return (
    <AuthContext.Provider value={contextValue}>
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

