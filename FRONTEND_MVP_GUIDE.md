# Guía de Implementación del MVP - Frontend MundialPro

## Índice
1. [Visión General del MVP](#visión-general-del-mvp)
2. [Arquitectura del Frontend](#arquitectura-del-frontend)
3. [Configuración Inicial](#configuración-inicial)
4. [Módulos a Implementar](#módulos-a-implementar)
5. [Integración con Backend](#integración-con-backend)
6. [Componentes Reutilizables](#componentes-reutilizables)
7. [Guía de Desarrollo](#guía-de-desarrollo)

---

## Visión General del MVP

### Objetivo
Crear una aplicación web funcional que permita a los empleados participar en prodes empresariales, hacer predicciones y ver rankings.

### Alcance del MVP
El MVP debe cubrir los siguientes flujos principales:

1. **Autenticación**
   - Login de empleados
   - Registro de empleados
   - Logout

2. **Dashboard de Empleado**
   - Ver prodes disponibles
   - Unirse a prodes
   - Ver mis prodes activos

3. **Prode - Predicciones**
   - Ver partidos del prode
   - Hacer predicciones (goles, tarjetas)
   - Editar predicciones (antes del bloqueo)
   - Ver estado de predicciones

4. **Rankings**
   - Ver ranking general
   - Ver ranking de mi área (si aplica)
   - Ver mi posición

### Usuarios del MVP
- **Empleados**: Usuarios finales que participan en los prodes

> **Nota**: Los módulos de Admin Global y Admin de Empresa se implementarán en fases posteriores.

---

## Arquitectura del Frontend

### Stack Tecnológico Actual
```
- React 19.2.0
- TypeScript 5.9.3
- React Router DOM 7.10.1
- Axios 1.13.2
- date-fns 4.1.0
- Tailwind CSS 4.1.18
- Vite 7.2.4
```

### Estructura de Carpetas

```
prode-frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes UI base (Button, Card, Input, etc.)
│   │   ├── layout/          # Layout, Navbar
│   │   └── employee/        # Componentes específicos de empleado
│   ├── pages/
│   │   ├── employee/        # Páginas de empleado
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProdePage.tsx
│   │   │   └── Rankings.tsx
│   │   └── admin/           # (Fase posterior)
│   ├── services/
│   │   └── api.ts           # Cliente HTTP + servicios
│   ├── types/
│   │   └── index.ts         # Tipos TypeScript
│   ├── data/
│   │   └── mockData.ts      # Datos mock (temporal)
│   ├── hooks/               # Custom hooks
│   ├── utils/               # Utilidades
│   └── App.tsx
├── public/
└── index.html
```

---

## Configuración Inicial

### 1. Variables de Entorno

Crear `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=MundialPro
```

### 2. Configuración de Axios

**Archivo**: `src/services/api.ts`

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Cliente HTTP base
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido, redirigir a login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 3. Context de Autenticación

**Archivo**: `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Cargar usuario del localStorage
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('accessToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## Módulos a Implementar

### Módulo 1: Autenticación

#### 1.1 Login (`pages/employee/Login.tsx`)

**Funcionalidades**:
- Formulario de email/password
- Validación de campos
- Llamada a API de login
- Guardar token y usuario
- Redirección a dashboard

**Endpoint Backend**:
```typescript
POST /api/auth/login
Body: { email: string, password: string }
Response: { success: true, data: { accessToken: string, user: User } }
```

**Implementación**:
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      login(response.data.accessToken, response.data.user);
      navigate('/employee/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Iniciar Sesión</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Input
            type="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" isLoading={loading} className="w-full mt-4">
            Iniciar Sesión
          </Button>
        </form>

        <p className="text-center mt-4 text-white/60">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-blue-400 hover:underline">
            Regístrate
          </a>
        </p>
      </Card>
    </div>
  );
};
```

#### 1.2 Registro (`pages/employee/Register.tsx`)

**Funcionalidades**:
- Formulario con: email, password, firstName, lastName, phone, companyAreaId
- Cargar áreas de la empresa desde API
- Validación de dominio corporativo
- Llamada a API de registro
- Auto-login después del registro

**Endpoint Backend**:
```typescript
GET /api/company/areas  // Para cargar las áreas
POST /api/auth/register
Body: {
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone?: string,
  companyAreaId: string
}
```

---

### Módulo 2: Dashboard de Empleado

#### 2.1 Dashboard (`pages/employee/Dashboard.tsx`)

**Funcionalidades**:
- Mostrar prodes donde ya participo
- Mostrar prodes disponibles para unirse
- Botón "Unirse" para prodes disponibles
- Botón "Ver Prode" para prodes activos
- Estadísticas básicas (partidos predichos, puntos totales)

**Endpoints Backend**:
```typescript
GET /api/prodes              // Mis prodes
GET /api/prodes/available    // Prodes disponibles
POST /api/prodes/:id/join    // Unirse a prode
```

**Estructura de Datos**:
```typescript
interface Prode {
  id: string;
  name: string;
  description?: string;
  competition: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  participationMode: 'general' | 'by_area' | 'both';
  variableConfigs: ProdeVariableConfig[];
  isActive: boolean;
}
```

**Implementación**:
```typescript
export const Dashboard = () => {
  const [myProdes, setMyProdes] = useState<Prode[]>([]);
  const [availableProdes, setAvailableProdes] = useState<Prode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProdes();
  }, []);

  const loadProdes = async () => {
    try {
      const [myProdesData, availableProdesData] = await Promise.all([
        prodeService.getMyProdes(),
        prodeService.getAvailableProdes(),
      ]);
      setMyProdes(myProdesData);
      setAvailableProdes(availableProdesData);
    } catch (error) {
      console.error('Error loading prodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProde = async (prodeId: string) => {
    try {
      await prodeService.joinProde(prodeId);
      await loadProdes(); // Recargar
    } catch (error) {
      console.error('Error joining prode:', error);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Mi Dashboard</h1>

      {/* Mis Prodes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Mis Prodes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myProdes.map((prode) => (
            <ProdeCard key={prode.id} prode={prode} />
          ))}
        </div>
      </section>

      {/* Prodes Disponibles */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Prodes Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableProdes.map((prode) => (
            <ProdeCard
              key={prode.id}
              prode={prode}
              onJoin={() => handleJoinProde(prode.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
```

---

### Módulo 3: Prode - Predicciones

#### 3.1 Página de Prode (`pages/employee/ProdePage.tsx`)

**Funcionalidades**:
- Mostrar información del prode
- Mostrar sistema de puntuación
- Listar partidos agrupados por etapa
- Formulario de predicción por partido
- Indicador de predicción guardada
- Indicador de partido bloqueado
- Botón "Guardar Predicción"

**Endpoints Backend**:
```typescript
GET /api/prodes/:id                    // Detalle del prode
GET /api/prodes/:id/matches            // Partidos del prode
GET /api/predictions/my?prodeId=:id    // Mis predicciones
POST /api/predictions                  // Crear/actualizar predicción
```

**Estructura de Match**:
```typescript
interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  matchDate: string;
  stage?: string;
  location?: string;
  status: 'scheduled' | 'in_progress' | 'finished';
  result?: MatchResult;
}

interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl?: string;
  flagEmoji?: string;
}
```

**Componente de Predicción**:
```typescript
interface PredictionFormProps {
  match: Match;
  prediction?: Prediction;
  variableConfigs: ProdeVariableConfig[];
  onSave: (prediction: PredictionInput) => Promise<void>;
}

export const PredictionForm: React.FC<PredictionFormProps> = ({
  match,
  prediction,
  variableConfigs,
  onSave
}) => {
  const [goalsTeamA, setGoalsTeamA] = useState(prediction?.predictedGoalsTeamA || 0);
  const [goalsTeamB, setGoalsTeamB] = useState(prediction?.predictedGoalsTeamB || 0);
  const [yellowCardsTeamA, setYellowCardsTeamA] = useState(prediction?.predictedYellowCardsTeamA || 0);
  const [yellowCardsTeamB, setYellowCardsTeamB] = useState(prediction?.predictedYellowCardsTeamB || 0);
  const [redCardsTeamA, setRedCardsTeamA] = useState(prediction?.predictedRedCardsTeamA || 0);
  const [redCardsTeamB, setRedCardsTeamB] = useState(prediction?.predictedRedCardsTeamB || 0);
  const [saving, setSaving] = useState(false);

  const isPastMatch = new Date(match.matchDate) < new Date();
  const isLocked = prediction?.lockedAt || isPastMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSave({
        matchId: match.id,
        predictedGoalsTeamA: goalsTeamA,
        predictedGoalsTeamB: goalsTeamB,
        predictedYellowCardsTeamA: yellowCardsTeamA,
        predictedYellowCardsTeamB: yellowCardsTeamB,
        predictedRedCardsTeamA: redCardsTeamA,
        predictedRedCardsTeamB: redCardsTeamB,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Equipos con banderas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <TeamDisplay team={match.teamA} />
        <div className="text-center">
          <span className="text-2xl font-bold">VS</span>
        </div>
        <TeamDisplay team={match.teamB} />
      </div>

      {/* Inputs de predicción */}
      {!isLocked && (
        <div className="space-y-4">
          <PredictionInput
            label="⚽ Goles"
            teamA={match.teamA}
            teamB={match.teamB}
            valueA={goalsTeamA}
            valueB={goalsTeamB}
            onChangeA={setGoalsTeamA}
            onChangeB={setGoalsTeamB}
          />

          <PredictionInput
            label="🟨 Tarjetas Amarillas"
            teamA={match.teamA}
            teamB={match.teamB}
            valueA={yellowCardsTeamA}
            valueB={yellowCardsTeamB}
            onChangeA={setYellowCardsTeamA}
            onChangeB={setYellowCardsTeamB}
          />

          <PredictionInput
            label="🟥 Tarjetas Rojas"
            teamA={match.teamA}
            teamB={match.teamB}
            valueA={redCardsTeamA}
            valueB={redCardsTeamB}
            onChangeA={setRedCardsTeamA}
            onChangeB={setRedCardsTeamB}
          />

          <Button type="submit" isLoading={saving} className="w-full">
            Guardar Predicción
          </Button>
        </div>
      )}

      {isLocked && (
        <div className="text-center py-4 text-yellow-400">
          <Lock className="w-8 h-8 mx-auto mb-2" />
          <p>Este partido está bloqueado</p>
        </div>
      )}
    </form>
  );
};
```

---

### Módulo 4: Rankings

#### 4.1 Página de Rankings (`pages/employee/Rankings.tsx`)

**Funcionalidades**:
- Tabs para diferentes tipos de ranking
- Ranking General (todos los participantes)
- Ranking de Mi Área (si aplica)
- Ranking de Áreas (si aplica)
- Destacar mi posición
- Mostrar top 10 + mi posición

**Endpoints Backend**:
```typescript
GET /api/prodes/:id/rankings/general
GET /api/prodes/:id/rankings/my-area
GET /api/prodes/:id/rankings/areas
```

**Estructura de Datos**:
```typescript
interface RankingEntry {
  position: number;
  employeeId?: string;
  employeeName?: string;
  areaId?: string;
  areaName?: string;
  totalPoints: number;
  matchesPlayed: number;
  exactResults: number;
  partialResults: number;
}
```

**Implementación**:
```typescript
export const Rankings = () => {
  const { prodeId } = useParams();
  const [activeTab, setActiveTab] = useState<'general' | 'area' | 'areas'>('general');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadRankings();
  }, [activeTab, prodeId]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      let data;
      switch (activeTab) {
        case 'general':
          data = await rankingService.getGeneralRanking(prodeId!);
          break;
        case 'area':
          data = await rankingService.getAreaRanking(prodeId!);
          break;
        case 'areas':
          data = await rankingService.getAreasRanking(prodeId!);
          break;
      }
      setRankings(data);
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Rankings</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === 'general' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('general')}
        >
          General
        </Button>
        <Button
          variant={activeTab === 'area' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('area')}
        >
          Mi Área
        </Button>
        <Button
          variant={activeTab === 'areas' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('areas')}
        >
          Entre Áreas
        </Button>
      </div>

      {/* Tabla de Rankings */}
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4">Pos</th>
              <th className="text-left p-4">Nombre</th>
              <th className="text-left p-4">Área</th>
              <th className="text-right p-4">Puntos</th>
              <th className="text-right p-4">Partidos</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((entry) => (
              <RankingRow
                key={entry.employeeId || entry.areaId}
                entry={entry}
                isCurrentUser={entry.employeeId === user?.employee?.id}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
```

---

## Integración con Backend

### Servicios API

**Archivo**: `src/services/api.ts`

```typescript
// Auth Service
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterInput) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },
};

// Prode Service
export const prodeService = {
  getMyProdes: async () => {
    const response = await apiClient.get('/prodes');
    return response.data.data;
  },

  getAvailableProdes: async () => {
    const response = await apiClient.get('/prodes/available');
    return response.data.data;
  },

  getProdeById: async (id: string) => {
    const response = await apiClient.get(`/prodes/${id}`);
    return response.data.data;
  },

  joinProde: async (id: string) => {
    const response = await apiClient.post(`/prodes/${id}/join`);
    return response.data.data;
  },
};

// Match Service
export const matchService = {
  getMatches: async (prodeId?: string) => {
    const params = prodeId ? { prodeId } : {};
    const response = await apiClient.get('/prodes/:id/matches', { params });
    return response.data.data;
  },
};

// Prediction Service
export const predictionService = {
  getMyPredictions: async (prodeId: string) => {
    const response = await apiClient.get('/predictions/my', {
      params: { prodeId },
    });
    return response.data.data;
  },

  createPrediction: async (data: PredictionInput) => {
    const response = await apiClient.post('/predictions', data);
    return response.data.data;
  },
};

// Ranking Service
export const rankingService = {
  getGeneralRanking: async (prodeId: string) => {
    const response = await apiClient.get(`/prodes/${prodeId}/rankings/general`);
    return response.data.data;
  },

  getAreaRanking: async (prodeId: string) => {
    const response = await apiClient.get(`/prodes/${prodeId}/rankings/my-area`);
    return response.data.data;
  },

  getAreasRanking: async (prodeId: string) => {
    const response = await apiClient.get(`/prodes/${prodeId}/rankings/areas`);
    return response.data.data;
  },
};
```

---

## Componentes Reutilizables

### Ya Implementados ✅
- `Button` - Botón con variantes y loading
- `Card` - Tarjeta con glassmorphism
- `Input` - Input con label y validación
- `Select` - Select personalizado
- `Modal` - Modal reutilizable

### Por Implementar

#### ProdeCard
```typescript
interface ProdeCardProps {
  prode: Prode;
  onJoin?: () => void;
}

export const ProdeCard: React.FC<ProdeCardProps> = ({ prode, onJoin }) => {
  return (
    <Card>
      <h3 className="text-xl font-bold mb-2">{prode.name}</h3>
      <p className="text-white/70 mb-4">{prode.competition.name}</p>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">
          {prode.participationMode === 'general' ? 'General' : 'Por Área'}
        </span>
        
        {onJoin ? (
          <Button onClick={onJoin} size="sm">
            Unirse
          </Button>
        ) : (
          <Button href={`/employee/prode/${prode.id}`} size="sm">
            Ver Prode
          </Button>
        )}
      </div>
    </Card>
  );
};
```

#### MatchCard
```typescript
interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  onSave: (prediction: PredictionInput) => Promise<void>;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  prediction,
  onSave
}) => {
  return (
    <Card className="match-card">
      {/* Header con fecha y ubicación */}
      <MatchHeader match={match} />
      
      {/* Equipos */}
      <TeamsDisplay teamA={match.teamA} teamB={match.teamB} />
      
      {/* Formulario de predicción */}
      <PredictionForm
        match={match}
        prediction={prediction}
        onSave={onSave}
      />
    </Card>
  );
};
```

---

## Guía de Desarrollo

### Fase 1: Setup (1-2 días)
1. ✅ Configurar variables de entorno
2. ✅ Configurar Axios + interceptores
3. ✅ Crear AuthContext
4. ✅ Configurar rutas protegidas

### Fase 2: Autenticación (2-3 días)
1. Implementar Login
2. Implementar Register
3. Implementar Logout
4. Integrar con backend
5. Testing de flujo completo

### Fase 3: Dashboard (3-4 días)
1. Crear página de Dashboard
2. Implementar listado de prodes
3. Implementar "Unirse a prode"
4. Crear ProdeCard component
5. Testing de integración

### Fase 4: Predicciones (4-5 días)
1. Crear página de Prode
2. Implementar listado de partidos
3. Crear formulario de predicción
4. Implementar guardado de predicciones
5. Agregar validaciones (bloqueo, fechas)
6. Testing completo

### Fase 5: Rankings (2-3 días)
1. Crear página de Rankings
2. Implementar tabs de ranking
3. Crear tabla de rankings
4. Destacar posición actual
5. Testing

### Fase 6: Pulido (2-3 días)
1. Mejorar UX/UI
2. Agregar loading states
3. Agregar error handling
4. Optimizar performance
5. Testing E2E

---

## Checklist de Implementación

### Autenticación
- [ ] Página de Login
- [ ] Página de Register
- [ ] AuthContext
- [ ] Protected Routes
- [ ] Logout functionality

### Dashboard
- [ ] Listar mis prodes
- [ ] Listar prodes disponibles
- [ ] Unirse a prode
- [ ] Navegación a prode

### Predicciones
- [ ] Ver partidos del prode
- [ ] Formulario de predicción
- [ ] Guardar predicción
- [ ] Editar predicción
- [ ] Indicador de bloqueo
- [ ] Banderas de equipos

### Rankings
- [ ] Ranking general
- [ ] Ranking de área
- [ ] Ranking de áreas
- [ ] Destacar mi posición
- [ ] Tabs de navegación

### Componentes
- [ ] ProdeCard
- [ ] MatchCard
- [ ] PredictionForm
- [ ] RankingTable
- [ ] TeamDisplay

### Integración
- [ ] Servicios API completos
- [ ] Manejo de errores
- [ ] Loading states
- [ ] Validaciones

---

## Notas Importantes

### Multi-Tenancy
- El backend usa subdominio para identificar la empresa
- En desarrollo: `{slug}.localhost:3000`
- Configurar header `Host` en requests si es necesario

### Autenticación
- Token JWT se guarda en localStorage
- Token expira en 7 días
- Interceptor de Axios agrega token automáticamente

### Banderas de Equipos
- Usar `flagUrl` (imágenes de flagcdn.com)
- Fallback a `flagEmoji` si no hay URL
- Ya implementado en mockData.ts

### Estados de Partido
- `scheduled`: Partido programado
- `in_progress`: En curso
- `finished`: Finalizado

### Bloqueo de Predicciones
- Se bloquean 1 hora antes del partido
- Campo `locked_at` en Prediction
- Validar en frontend antes de permitir edición

---

## Recursos

### Backend Endpoints
Ver `BACKEND_DOCUMENTATION.md` para referencia completa de endpoints

### Tipos TypeScript
Ver `src/types/index.ts` para todos los tipos disponibles

### Componentes UI
Ver `src/components/ui/` para componentes base ya implementados

### Datos Mock
Ver `src/data/mockData.ts` para datos de ejemplo (temporal)
