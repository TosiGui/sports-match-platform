# Guia de Instalação - Autenticação Google OAuth 2.0

## 📦 Passo 1: Instalar Dependências

```bash
npm install googleapis@^134.0.0 jsonwebtoken@^9.0.2 @fastify/jwt@^8.0.0 @fastify/cookie@^10.0.0
npm install -D @types/jsonwebtoken@^9.0.6
```

## 🔑 Passo 2: Configurar Google Cloud Console

### 2.1. Criar Projeto no Google Cloud
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em "APIs e Serviços" → "Credenciais"

### 2.2. Configurar OAuth 2.0
1. Clique em "Criar Credenciais" → "ID do cliente OAuth 2.0"
2. Configure a tela de consentimento OAuth:
   - Tipo de app: Externo
   - Nome do app: Sports Match Platform
   - Email de suporte: seu-email@exemplo.com
   - Domínios autorizados: localhost (desenvolvimento)
   - Escopos: email, profile, openid

3. Criar ID do cliente OAuth:
   - Tipo de aplicativo: Aplicativo da Web
   - Nome: Sports Match Web
   - Origens JavaScript autorizadas:
     - `http://localhost:3000` (backend)
     - `http://localhost:5173` (frontend)
   - URIs de redirecionamento autorizados:
     - `http://localhost:3000/auth/google/callback`

4. Copie o **Client ID** e **Client Secret**

## 🗄️ Passo 3: Atualizar Schema do Prisma

Substitua o conteúdo de `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Sport {
  VOLEI
  PADEL
}

enum MatchStatus {
  OPEN
  FULL
  CANCELED
  FINISHED
}

enum ParticipantStatus {
  CONFIRMED
  WAITING
  LEFT
  NO_SHOW
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum AuthProvider {
  GOOGLE
  EMAIL
  PHONE
}

model User {
  id            String             @id @default(uuid())
  name          String
  phone         String?            @unique
  email         String?            @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  // Auth relations
  accounts      Account[]
  sessions      Session[]

  // App relations
  organizedMatches Match[]         @relation("OrganizerMatches")
  participations   MatchParticipant[]
  stats            PlayerStats[]
  reputation       UserReputation?
  clubsOwned       Club[]          @relation("ClubOwner")
  payments         Payment[]
}

model Account {
  id                String       @id @default(uuid())
  userId            String
  provider          AuthProvider
  providerAccountId String
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

model City {
  id        String   @id @default(uuid())
  name      String
  state     String
  createdAt DateTime @default(now())

  matches   Match[]
  clubs     Club[]

  @@unique([name, state])
}

model Club {
  id        String   @id @default(uuid())
  name      String
  cityId    String
  ownerId   String
  createdAt DateTime @default(now())

  city      City     @relation(fields: [cityId], references: [id], onDelete: Restrict)
  owner     User     @relation("ClubOwner", fields: [ownerId], references: [id], onDelete: Restrict)
  courts    Court[]

  @@unique([name, cityId])
}

model Court {
  id        String   @id @default(uuid())
  name      String
  clubId    String
  createdAt DateTime @default(now())

  club      Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  matches   Match[]

  @@unique([clubId, name])
}

model Match {
  id          String        @id @default(uuid())
  sport       Sport
  dateTime    DateTime
  location    String
  maxPlayers  Int
  status      MatchStatus   @default(OPEN)
  organizerId String
  cityId      String
  courtId     String?
  createdAt   DateTime      @default(now())

  organizer   User          @relation("OrganizerMatches", fields: [organizerId], references: [id], onDelete: Restrict)
  city        City          @relation(fields: [cityId], references: [id], onDelete: Restrict)
  court       Court?        @relation(fields: [courtId], references: [id], onDelete: SetNull)

  participants MatchParticipant[]
  payments     Payment[]

  @@index([sport, dateTime])
  @@index([cityId])
  @@index([organizerId])
}

model MatchParticipant {
  id        String            @id @default(uuid())
  matchId   String
  userId    String
  status    ParticipantStatus @default(CONFIRMED)
  joinedAt  DateTime          @default(now())

  match     Match             @relation(fields: [matchId], references: [id], onDelete: Cascade)
  user      User              @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([matchId, userId])
  @@index([userId])
}

model PlayerStats {
  id            String   @id @default(uuid())
  userId        String
  sport         Sport
  matchesPlayed Int      @default(0)
  wins          Int      @default(0)
  losses        Int      @default(0)
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, sport])
}

model UserReputation {
  id             String   @id @default(uuid())
  userId         String   @unique
  noShows        Int      @default(0)
  cancellations  Int      @default(0)
  updatedAt      DateTime @updatedAt

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Payment {
  id        String        @id @default(uuid())
  matchId   String
  userId    String
  amount    Decimal       @db.Decimal(10, 2)
  status    PaymentStatus @default(PENDING)
  provider  String?
  createdAt DateTime      @default(now())

  match     Match         @relation(fields: [matchId], references: [id], onDelete: Restrict)
  user      User          @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([matchId])
  @@index([userId])
  @@index([status, createdAt])
}
```

## 🔄 Passo 4: Executar Migração

```bash
# Gerar nova migração
npx prisma migrate dev --name add_auth_tables

# Gerar Prisma Client atualizado
npx prisma generate
```

## ⚙️ Passo 5: Configurar Variáveis de Ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite `.env` e adicione suas credenciais:

```env
# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# JWT - GERE CHAVES FORTES!
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

**IMPORTANTE:** Gere chaves JWT fortes:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 🚀 Passo 6: Registrar Rotas de Autenticação

Edite `src/routes/index.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { registerUserRoutes } from './users.js';
import { registerMatchRoutes } from './matches.js';
import { registerMatchParticipantRoutes } from './match-participants.js';
import { registerCityRoutes } from './cities.js';
import { registerClubRoutes } from './clubs.js';
import { registerCourtRoutes } from './courts.js';
import { registerPlayerStatsRoutes } from './player-stats.js';
import { registerUserReputationRoutes } from './user-reputations.js';
import { registerPaymentRoutes } from './payments.js';
import { registerAuthRoutes } from './auth.js'; // NOVO

export async function registerRoutes(app: FastifyInstance) {
  // Auth routes (não protegidas)
  await registerAuthRoutes(app);
  
  // App routes
  await registerUserRoutes(app);
  await registerMatchRoutes(app);
  await registerMatchParticipantRoutes(app);
  await registerCityRoutes(app);
  await registerClubRoutes(app);
  await registerCourtRoutes(app);
  await registerPlayerStatsRoutes(app);
  await registerUserReputationRoutes(app);
  await registerPaymentRoutes(app);
}
```

## 🔐 Passo 7: Configurar Plugins do Fastify

Edite `src/index.ts` (ou arquivo principal):

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { registerRoutes } from './routes/index.js';
import { JWT_CONFIG } from './config/jwt.js';

const app = Fastify({ logger: true });

// Plugins
await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'cookie-secret-change-me',
});

await app.register(jwt, {
  secret: JWT_CONFIG.secret,
});

// Rotas
await registerRoutes(app);

// Start
const port = Number(process.env.PORT) || 3000;
await app.listen({ port, host: '0.0.0.0' });
```

## 🧪 Passo 8: Testar Autenticação

### 8.1. Iniciar Flow OAuth

```bash
GET http://localhost:3000/auth/google/login
```

Resposta:
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "abc123"
}
```

### 8.2. Usuário faz login no Google
- Redireciona para a URL retornada
- Usuário autoriza a aplicação
- Google redireciona para `/auth/google/callback?code=...`

### 8.3. Trocar código por token

```bash
POST http://localhost:3000/auth/google/callback
Content-Type: application/json

{
  "code": "4/0Adeu5..."
}
```

Resposta:
```json
{
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "image": "https://lh3.googleusercontent.com/...",
    "emailVerified": true
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

### 8.4. Usar Token nas Requisições

```bash
GET http://localhost:3000/auth/me
Authorization: Bearer eyJhbGc...
```

Ou usando cookies (automático se configurado).

## 🛡️ Passo 9: Proteger Rotas Existentes

Exemplo com rotas de matches:

```typescript
// src/routes/matches.ts
import { authenticate } from '../middleware/authenticate.js';

export async function registerMatchRoutes(app: FastifyInstance) {
  // Rotas públicas
  app.get('/matches', listMatchesHandler);
  app.get('/matches/:id', getMatchByIdHandler);

  // Rotas protegidas - requerem autenticação
  app.post('/matches', {
    preHandler: authenticate
  }, createMatchHandler);

  app.patch('/matches/:id', {
    preHandler: authenticate
  }, async (request, reply) => {
    // request.user está disponível aqui
    const userId = request.user!.id;
    // ...
  });

  app.delete('/matches/:id', {
    preHandler: authenticate
  }, deleteMatchHandler);
}
```

## 📱 Passo 10: Integração Frontend

### 10.1. Flow Completo

```typescript
// 1. Iniciar login
const loginResponse = await fetch('http://localhost:3000/auth/google/login');
const { url } = await loginResponse.json();

// 2. Redirecionar para Google
window.location.href = url;

// 3. Callback após login (rota /callback no frontend)
const params = new URLSearchParams(window.location.search);
const code = params.get('code');

const authResponse = await fetch('http://localhost:3000/auth/google/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code }),
  credentials: 'include', // Importante para cookies
});

const { user, tokens } = await authResponse.json();

// 4. Salvar token (se não usar cookies)
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);

// 5. Usar em requisições
fetch('http://localhost:3000/matches', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  },
  credentials: 'include'
});
```

### 10.2. Refresh Token

```typescript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('http://localhost:3000/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    credentials: 'include',
  });

  const { tokens } = await response.json();
  localStorage.setItem('accessToken', tokens.accessToken);
  
  return tokens.accessToken;
}
```

### 10.3. Interceptor para Refresh Automático

```typescript
// Com Axios
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        const newToken = await refreshAccessToken();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios.request(error.config);
      } catch {
        // Redirecionar para login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## 🔒 Segurança em Produção

### Checklist:

- [ ] HTTPS obrigatório
- [ ] Configurar CORS corretamente
- [ ] Usar cookies HTTPOnly
- [ ] Ativar CSRF protection
- [ ] Rate limiting em rotas de auth
- [ ] Sanitizar inputs
- [ ] Validar redirect URIs
- [ ] Monitorar tentativas de login
- [ ] Implementar 2FA (futuro)
- [ ] Logs de auditoria
- [ ] Renovar secrets regularmente

## 📊 Monitoramento

### Logs Importantes:

```typescript
// Adicionar em auth-service.ts
console.log(`[AUTH] New user registered: ${user.email}`);
console.log(`[AUTH] User logged in: ${user.email}`);
console.log(`[AUTH] Failed login attempt: ${email}`);
console.log(`[AUTH] Session expired: ${sessionId}`);
```

## 🧹 Manutenção

### Limpeza de Sessões Expiradas

Criar um cron job:

```typescript
// src/jobs/cleanup-sessions.ts
import { SessionService } from '../services/session-service.js';

export async function cleanupExpiredSessions() {
  const sessionService = new SessionService();
  const count = await sessionService.cleanExpiredSessions();
  console.log(`[CLEANUP] Removed ${count} expired sessions`);
}

// Executar a cada hora
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
```

## ✅ Checklist Final

- [ ] Dependências instaladas
- [ ] Google OAuth configurado
- [ ] Schema Prisma atualizado
- [ ] Migração executada
- [ ] .env configurado
- [ ] Rotas registradas
- [ ] Plugins Fastify configurados
- [ ] Testes realizados
- [ ] Frontend integrado
- [ ] Segurança configurada
- [ ] Monitoramento ativo
