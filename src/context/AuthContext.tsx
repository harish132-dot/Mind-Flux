import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsGuest(false);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              photoURL: user.photoURL || undefined,
              role: 'user',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (e) {
          console.warn('Could not sync user profile in Firestore:', e);
          // Set fallback profile from auth
          setProfile({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error('Email Login Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (cred.user && name) {
        await updateProfile(cred.user, { displayName: name });
      }
    } catch (err) {
      console.error('Sign-Up Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    const mockGuest: UserProfile = {
      uid: 'guest-demo-user',
      email: 'demo@aiinsightengine.internal',
      displayName: 'Guest Analyst',
      role: 'guest',
      createdAt: new Date().toISOString(),
    };
    setProfile(mockGuest);
  };

  const logout = async () => {
    if (isGuest) {
      setIsGuest(false);
      setProfile(null);
      return;
    }
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        isGuest,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
