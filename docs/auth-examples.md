# Exemplos de Uso - Autenticação

## 🎯 Casos de Uso Comuns

### 1. Login com Google

```typescript
// Frontend - Iniciar login
async function loginWithGoogle() {
  const response = await fetch('http://localhost:3000/auth/google/login');
  const { url } = await response.json();
  window.location.href = url;
}

// Frontend - Callback após autorização
async function handleGoogleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  const response = await fetch('http://localhost:3000/auth/google/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    credentials: 'include',
  });

  const { user, tokens } = await response.json();
  
  // Salvar no localStorage ou usar cookies
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  
  // Redirecionar para dashboard
  window.location.href = '/dashboard';
}
```

### 2. Acessar Rota Protegida

```typescript
// Frontend
async function createMatch(matchData) {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3000/matches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(matchData),
  });

  if (response.status === 401) {
    // Token expirado, tentar refresh
    await refreshToken();
    return createMatch(matchData); // Retry
  }

  return response.json();
}
```

### 3. Refresh Token Automático

```typescript
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('http://localhost:3000/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    credentials: 'include',
  });

  if (!response.ok) {
    // Refresh falhou, fazer logout
    logout();
    throw new Error('Session expired');
  }

  const { tokens } = await response.json();
  localStorage.setItem('accessToken', tokens.accessToken);
  
  return tokens.accessToken;
}
```

### 4. Logout

```typescript
async function logout() {
  const token = localStorage.getItem('accessToken');
  
  await fetch('http://localhost:3000/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
  });

  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  window.location.href = '/login';
}
```

### 5. Logout de Todos os Dispositivos

```typescript
async function logoutAllDevices() {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3000/auth/logout-all', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
  });

  const { count } = await response.json();
  console.log(`Deslogado de ${count} dispositivos`);
  
  // Limpar local storage
  localStorage.clear();
  window.location.href = '/login';
}
```

### 6. Verificar Sessão Atual

```typescript
async function checkSession() {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3000/auth/session', {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
```

### 7. Obter Dados do Usuário Logado

```typescript
async function getCurrentUser() {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3000/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
```

## 🎨 Exemplo de Context Provider (React)

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Tentar refresh
        await refreshToken();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    const response = await fetch('http://localhost:3000/auth/google/login');
    const { url } = await response.json();
    window.location.href = url;
  }

  async function logout() {
    const token = localStorage.getItem('accessToken');
    
    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
    });

    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  }

  async function refreshToken() {
    const refresh = localStorage.getItem('refreshToken');
    
    const response = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
      credentials: 'include',
    });

    if (response.ok) {
      const { user, tokens } = await response.json();
      localStorage.setItem('accessToken', tokens.accessToken);
      setUser(user);
    } else {
      localStorage.clear();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## 🛡️ Exemplo de Protected Route (React)

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Uso em App.tsx
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/matches/new"
            element={
              <ProtectedRoute>
                <CreateMatchPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

## 📡 Exemplo de Axios Interceptor

```typescript
// api/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

// Request interceptor - adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 e refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        const response = await axios.post(
          'http://localhost:3000/auth/refresh',
          { refreshToken },
          { withCredentials: true }
        );

        const { tokens } = response.data;
        localStorage.setItem('accessToken', tokens.accessToken);

        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## 🎯 Exemplo Completo de Página de Login

```typescript
// pages/LoginPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Sports Match Platform
        </h1>
        
        <p className="text-gray-600 mb-6 text-center">
          Entre com sua conta Google para continuar
        </p>

        <button
          onClick={login}
          className="w-full bg-white border border-gray-300 rounded-lg px-6 py-3 flex items-center justify-center gap-3 hover:bg-gray-50 transition"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            {/* Google Icon SVG */}
          </svg>
          <span className="font-medium">Entrar com Google</span>
        </button>
      </div>
    </div>
  );
}
```

## 🔄 Exemplo de Callback Page

```typescript
// pages/CallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const { user, tokens } = await response.json();
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Callback error:', error);
      navigate('/login');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Autenticando...</p>
      </div>
    </div>
  );
}
```
