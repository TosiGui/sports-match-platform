# Arquitetura de Autenticação Google OAuth 2.0

## 1. Schema do Banco de Dados

### Novos Models Prisma

```prisma
enum AuthProvider {
  GOOGLE
  EMAIL
  PHONE
}

model Account {
  id                String       @id @default(uuid())
  userId            String
  provider          AuthProvider
  providerAccountId String       // Google ID ou email/phone
  accessToken       String?      @db.Text
  refreshToken      String?      @db.Text
  expiresAt         DateTime?
  tokenType         String?
  scope             String?
  idToken           String?      @db.Text
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  sessionToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

// Atualizar model User
model User {
  id            String             @id @default(uuid())
  name          String
  phone         String?            @unique
  email         String?            @unique
  emailVerified DateTime?
  image         String?            // Avatar do Google
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  // Novos relacionamentos
  accounts      Account[]
  sessions      Session[]

  // Relacionamentos existentes
  organizedMatches Match[]         @relation("OrganizerMatches")
  participations   MatchParticipant[]
  stats            PlayerStats[]
  reputation       UserReputation?
  clubsOwned       Club[]          @relation("ClubOwner")
  payments         Payment[]
}
```

## 2. Estrutura de Rotas

### Endpoints de Autenticação

```
POST   /auth/google/login          - Inicia OAuth flow
POST   /auth/google/callback       - Callback do Google
POST   /auth/refresh               - Refresh token
POST   /auth/logout                - Logout
GET    /auth/session               - Verificar sessão atual
GET    /auth/me                    - Dados do usuário autenticado
```

## 3. Fluxo de Autenticação

### OAuth 2.0 Flow

```
1. Client → POST /auth/google/login
   ↓
2. Server → Redireciona para Google OAuth
   ↓
3. Google → Usuário faz login
   ↓
4. Google → Callback → POST /auth/google/callback
   ↓
5. Server → Verifica token com Google
   ↓
6. Server → Cria/atualiza User + Account
   ↓
7. Server → Gera Session Token (JWT)
   ↓
8. Server → Retorna { user, token, refreshToken }
```

## 4. Dependências Necessárias

```json
{
  "dependencies": {
    "googleapis": "^134.0.0",
    "jsonwebtoken": "^9.0.2",
    "@fastify/jwt": "^8.0.0",
    "@fastify/cookie": "^10.0.0",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.6",
    "@types/bcrypt": "^5.0.2"
  }
}
```

## 5. Variáveis de Ambiente

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
FRONTEND_URL=http://localhost:5173
```

## 6. Estrutura de Arquivos

```
src/
├── services/
│   ├── auth-service.ts          # Lógica de autenticação
│   ├── google-oauth-service.ts  # Integração Google OAuth
│   ├── session-service.ts       # Gerenciamento de sessões
│   └── jwt-service.ts           # Geração/validação JWT
├── controllers/
│   └── auth-controller.ts       # Controller de autenticação
├── routes/
│   └── auth.ts                  # Rotas de autenticação
├── middleware/
│   ├── authenticate.ts          # Middleware de autenticação
│   └── rate-limit.ts            # Rate limiting
├── types/
│   └── auth.ts                  # Tipos TypeScript
└── config/
    ├── google-oauth.ts          # Configuração OAuth
    └── jwt.ts                   # Configuração JWT
```

## 7. Tipos TypeScript

```typescript
// src/types/auth.ts

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  tokens: AuthTokens;
}

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  image?: string;
}
```

## 8. Middleware de Autenticação

```typescript
// src/middleware/authenticate.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTService } from '../services/jwt-service';
import { SessionService } from '../services/session-service';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = extractToken(request);
    
    if (!token) {
      return reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const jwtService = new JWTService();
    const payload = jwtService.verifyAccessToken(token);
    
    const sessionService = new SessionService();
    const session = await sessionService.getSession(payload.sessionId);
    
    if (!session || session.expiresAt < new Date()) {
      return reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'Invalid or expired session'
      });
    }

    request.user = {
      id: payload.userId,
      email: payload.email,
      sessionId: payload.sessionId
    };

  } catch (error) {
    return reply.code(401).send({ 
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
}

function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return request.cookies?.accessToken || null;
}
```

## 9. Proteção de Rotas

### Exemplo de Uso

```typescript
// src/routes/matches.ts

import { authenticate } from '../middleware/authenticate';

export async function registerMatchRoutes(app: FastifyInstance) {
  // Rotas públicas
  app.get('/matches', listMatchesHandler);
  app.get('/matches/:id', getMatchByIdHandler);

  // Rotas protegidas
  app.post('/matches', {
    preHandler: authenticate
  }, createMatchHandler);

  app.patch('/matches/:id', {
    preHandler: authenticate
  }, updateMatchHandler);
}
```

## 10. Rate Limiting

```typescript
// src/middleware/rate-limit.ts

import rateLimit from '@fastify/rate-limit';

export const authRateLimit = {
  max: 5,
  timeWindow: '15 minutes',
  errorResponseBuilder: () => ({
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please try again later.'
  })
};
```

## 11. Segurança

### Checklist de Segurança

- ✅ HTTPS obrigatório em produção
- ✅ HTTPOnly cookies para tokens
- ✅ CSRF protection
- ✅ Rate limiting em rotas de auth
- ✅ Validação de redirect URIs
- ✅ Tokens com expiração curta
- ✅ Refresh token rotation
- ✅ Logout em todos os devices
- ✅ Auditoria de sessões
- ✅ Sanitização de inputs

## 12. Testes

### Estrutura de Testes

```
test/
├── auth/
│   ├── google-oauth.spec.ts
│   ├── session.spec.ts
│   ├── jwt.spec.ts
│   └── middleware.spec.ts
```

## 13. Migração de Dados

### Considerações

- Usuários existentes podem vincular conta Google depois
- Email/phone existente pode ser usado para match
- Criar Account automaticamente para novos logins Google
- Manter compatibilidade com sistema atual
