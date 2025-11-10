import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role?: 'user' | 'artisan') => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profileData: any) => Promise<void>;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
          
          // Check if user has completed onboarding
          if (typeof window !== 'undefined') {
            const onboardingStatus = localStorage.getItem(`onboarding_completed_${currentUser?.id}`);
            setHasCompletedOnboarding(onboardingStatus === 'true');
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login({ email, password });
      setUser(loggedInUser);
      
      // Check onboarding status
      if (typeof window !== 'undefined') {
        const onboardingStatus = localStorage.getItem(`onboarding_completed_${loggedInUser.id}`);
        setHasCompletedOnboarding(onboardingStatus === 'true');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, role: 'user' | 'artisan' = 'user') => {
    setIsLoading(true);
    try {
      const newUser = await authService.register({ username, email, password, role });
      setUser(newUser);
      setHasCompletedOnboarding(false); // New users need onboarding
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      setHasCompletedOnboarding(false);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, []);

  const updateUserProfile = useCallback(async (profileData: any) => {
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }, []);

  const handleSetOnboardingComplete = useCallback((completed: boolean) => {
    setHasCompletedOnboarding(completed);
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, completed.toString());
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUserProfile,
    hasCompletedOnboarding,
    setHasCompletedOnboarding: handleSetOnboardingComplete,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

