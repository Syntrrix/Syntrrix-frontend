import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { login as loginRequest } from '../api/auth';
import { clearAuthState, loadAuthState, persistAuthState } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    accessToken: null,
    refreshToken: null,
    loading: true,
  });

  useEffect(() => {
    const stored = loadAuthState();
    setState({
      user: stored.user,
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      loading: false,
    });
  }, []);

  const login = async (credentials) => {
    const response = await loginRequest(credentials);
    const authPayload = {
      user: response.user,
      accessToken: response.access,
      refreshToken: response.refresh,
    };
    persistAuthState(authPayload);
    setState((prev) => ({
      ...prev,
      ...authPayload,
      loading: false,
    }));
    return response;
  };

  const logout = () => {
    clearAuthState();
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
    });
  };

  const setUser = (updatedUser) => {
    persistAuthState({
      user: updatedUser,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
    });
    setState((prev) => ({
      ...prev,
      user: updatedUser,
    }));
  };

  const value = useMemo(
    () => ({
      user: state.user,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      loading: state.loading,
      isAuthenticated: Boolean(state.user && state.accessToken),
      login,
      logout,
      setUser,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



