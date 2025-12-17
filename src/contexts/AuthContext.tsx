import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import type { User, Organisation } from '@/types';

// User role type - matches Firestore user_roles collection
type UserRole = 'admin' | 'moderator' | 'standard';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  organisation: Organisation | null;
  loading: boolean;
  isOnboarded: boolean;
  userRole: UserRole;
  signUp: (email: string, password: string, displayName: string, organisationData: Omit<Organisation, 'id' | 'verified'>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('standard');
  const [loading, setLoading] = useState(true);

  // Computed property: user is onboarded if they have completed status AND have ID document
  const isOnboarded = userData?.onboardingStatus === 'completed' && !!userData?.idDocumentUrl;

  const fetchUserData = useCallback(async (user: FirebaseUser) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Exclude role from user document - roles come from separate collection
      const { role: _ignoredRole, ...userData } = userSnap.data();
      const data = { id: user.uid, ...userData } as User;
      setUserData(data);
      
      // Fetch role from separate protected collection
      const roleRef = doc(db, 'user_roles', user.uid);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        const roleData = roleSnap.data();
        setUserRole((roleData.role as UserRole) || 'standard');
      } else {
        setUserRole('standard');
      }
      
      // Fetch organisation data
      if (data.organisationId) {
        const orgRef = doc(db, 'organisations', data.organisationId);
        const orgSnap = await getDoc(orgRef);
        
        if (orgSnap.exists()) {
          setOrganisation({ id: orgSnap.id, ...orgSnap.data() } as Organisation);
        }
      }
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  }, [currentUser, fetchUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
        setOrganisation(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserData]);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    organisationData: Omit<Organisation, 'id' | 'verified'>
  ) => {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create organisation document
    const orgRef = doc(db, 'organisations', `org_${user.uid}`);
    await setDoc(orgRef, {
      ...organisationData,
      verified: false,
    });

    // Create user document with pending onboarding status
    // NOTE: role is NOT stored here - it's in user_roles collection
    // Role creation should be handled server-side via Cloud Function
    // The fetchUserData function defaults to 'standard' if no role exists
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      displayName,
      email,
      organisationId: orgRef.id,
      onboardingStatus: 'pending', // New users start with pending onboarding
    });
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value = {
    currentUser,
    userData,
    organisation,
    loading,
    isOnboarded,
    userRole,
    signUp,
    signIn,
    signOut,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
