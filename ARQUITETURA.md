# PetShop Manager — Arquitetura do Projeto

> Documento de referência para o agente de código. Define stack, modelagem de dados, convenções e ordem de implementação. Qualquer decisão tomada durante o desenvolvimento deve ser consistente com este documento; se precisar divergir, atualize esta seção correspondente.

---

## 1. Visão geral

**Problema a resolver:** donos de petshop perdem controle de horários e do quanto estão faturando por serviço prestado.

**Solução:** PWA (instalável, funciona como app no celular) onde o dono do petshop:
- Cadastra cães (tutores/donos dos cães)
- Cadastra os serviços que oferece (tosa, hidratação, banho, etc.) com preço-base editável
- Cria agendamentos vinculando um cão a um serviço, definindo o preço final daquele atendimento, valor do taxidog (variável), duração e observações
- Recebe confirmação automática por WhatsApp enviada ao tutor 1 dia antes do atendimento

**Multi-tenant desde o início:** múltiplos petshops usam a mesma aplicação, sem qualquer visibilidade cruzada de dados entre eles.

---

## 2. Stack escolhida (com justificativa)

| Camada | Escolha | Por quê |
|---|---|---|
| Linguagem | **TypeScript** (front e back) | Tipagem forte ajuda um agente a não quebrar contratos entre camadas; um único idioma reduz troca de contexto. |
| Backend | **Node.js + NestJS** | NestJS impõe estrutura (módulos, controllers, services, DTOs) via convenção/decorators. Isso é ótimo para um agente: menos decisões arquiteturais ambíguas, código mais previsível e testável. |
| ORM / DB access | **Prisma** | Schema declarativo único, migrations automáticas, client tipado. Fácil de um agente ler o `schema.prisma` e entender o domínio inteiro de uma vez. |
| Banco de dados | **PostgreSQL** | Relacional, forte em integridade referencial (cão → agendamento → serviço), suporta bem multi-tenancy via `petshop_id` + índices. |
| Fila / Job assíncrono | **BullMQ + Redis** | Necessário para o envio agendado de WhatsApp (job diário que varre agendamentos de amanhã) de forma confiável, com retry automático em caso de falha na API do WhatsApp. |
| Frontend | **React + Vite + TypeScript** | Vite dá build rápido e ótimo suporte a PWA via plugin. |
| PWA | **vite-plugin-pwa** (Workbox por baixo) | Service worker, manifest, cache offline, "add to home screen" prontos com configuração declarativa. |
| Estilização | **Tailwind CSS** | Tokens de cor/tema centralizados (bate com a paleta definida na seção 8), rápido para o agente aplicar consistência. |
| Autenticação | **JWT (access + refresh token)** via NestJS `@nestjs/jwt` + `passport-jwt` | Stateless, escala horizontalmente, carrega `petshopId` no payload para enforcement de tenant. |
| Integração WhatsApp | **WhatsApp Cloud API (Meta)** | API oficial, sem risco de bloqueio (diferente de soluções não-oficiais tipo Baileys), suporta templates de mensagem aprovados — necessário para mensagens automáticas fora da janela de 24h. |
| Infra (sugestão) | Backend + worker em **Railway/Render**, DB em **Neon/Supabase (Postgres gerenciado)**, Redis em **Upstash** | Baixo custo inicial, escala conforme o número de petshops cresce, sem gerenciar servidor. |

### Por que NestJS e não Express puro?
Como o código será escrito por um agente, convenção > liberdade. NestJS elimina a pergunta "onde eu coloco essa lógica?" — sempre existe um Controller, um Service, um DTO e um Module. Isso reduz inconsistência entre partes do código geradas em momentos diferentes.

---

## 3. Estrutura de pastas (monorepo)

```
petshop-manager/
├── apps/
│   ├── api/                        # Backend NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── petshops/       # cadastro/config do tenant
│   │   │   │   ├── users/          # donos/funcionários que logam
│   │   │   │   ├── dogs/
│   │   │   │   ├── services/       # serviços oferecidos (tosa, banho...)
│   │   │   │   ├── appointments/   # agendamentos
│   │   │   │   ├── whatsapp/       # integração + templates de mensagem
│   │   │   │   └── reports/        # relatórios de ganhos/horários
│   │   │   ├── common/
│   │   │   │   ├── guards/         # TenantGuard, JwtAuthGuard
│   │   │   │   ├── decorators/     # @CurrentUser(), @CurrentPetshop()
│   │   │   │   ├── filters/        # exception filters padronizados
│   │   │   │   └── interceptors/
│   │   │   ├── jobs/                # BullMQ processors (lembrete WhatsApp)
│   │   │   ├── prisma/              # PrismaService + schema
│   │   │   └── main.ts
│   │   └── test/
│   └── web/                        # Frontend React (PWA)
│       ├── src/
│       │   ├── pages/               # Login, Dashboard, Cães, Agendamentos, Serviços, Relatórios
│       │   ├── components/
│       │   ├── features/            # lógica por domínio (dogs, appointments...)
│       │   ├── lib/                 # api client, auth context
│       │   ├── styles/              # tokens Tailwind
│       │   └── main.tsx
│       ├── public/
│       │   └── manifest.webmanifest
│       └── vite.config.ts
├── packages/
│   └── shared/                     # tipos/DTOs compartilhados entre api e web
│       └── src/types/
├── docker-compose.yml               # postgres + redis local
├── .env.example
└── package.json                     # workspaces (npm/pnpm)
```

**Convenção de nomes:** pastas e arquivos em `kebab-case`, classes em `PascalCase`, variáveis/funções em `camelCase`, tabelas do banco em `snake_case` (padrão Postgres/Prisma `@@map`).

---

## 4. Modelagem de dados (multi-tenant)

Regra de ouro: **toda tabela de domínio tem uma FK direta ou indireta para `petshops.id`**, e todo acesso ao banco passa por um filtro obrigatório desse campo (ver seção 6).

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- TENANT ----------

model Petshop {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique          // usado em URLs/subdomínio no futuro
  phone     String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users             User[]
  dogs              Dog[]
  services          Service[]
  appointments      Appointment[]
  messageTemplates  MessageTemplate[]

  @@map("petshops")
}

// ---------- USUÁRIOS (dono / funcionários que logam no sistema) ----------

model User {
  id           String   @id @default(uuid())
  petshopId    String   @map("petshop_id")
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         UserRole @default(OWNER)
  createdAt    DateTime @default(now()) @map("created_at")

  petshop Petshop @relation(fields: [petshopId], references: [id], onDelete: Cascade)

  @@index([petshopId])
  @@map("users")
}

enum UserRole {
  OWNER
  STAFF
}

// ---------- CÃES ----------

model Dog {
  id           String   @id @default(uuid())
  petshopId    String   @map("petshop_id")
  name         String
  breed        String?  @map("breed")
  tutorName    String   @map("tutor_name")
  tutorPhone   String   @map("tutor_phone")   // usado como default ao criar agendamento
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  petshop      Petshop       @relation(fields: [petshopId], references: [id], onDelete: Cascade)
  appointments Appointment[]

  @@index([petshopId])
  @@map("dogs")
}

// ---------- SERVIÇOS ----------

model Service {
  id           String   @id @default(uuid())
  petshopId    String   @map("petshop_id")
  name         String                          // ex: "Tosa higiênica"
  basePrice    Decimal  @map("base_price") @db.Decimal(10, 2)   // sugestão editável no agendamento
  defaultDurationMin Int @map("default_duration_min")           // sugestão editável no agendamento
  active       Boolean  @default(true)
  createdAt    DateTime @default(now()) @map("created_at")

  petshop      Petshop       @relation(fields: [petshopId], references: [id], onDelete: Cascade)
  appointments Appointment[]

  @@index([petshopId])
  @@map("services")
}

// ---------- AGENDAMENTOS ----------

model Appointment {
  id                String   @id @default(uuid())
  petshopId         String   @map("petshop_id")
  dogId             String   @map("dog_id")
  serviceId         String   @map("service_id")

  scheduledAt       DateTime @map("scheduled_at")           // data/hora de início
  durationMin       Int      @map("duration_min")            // definido pelo user neste agendamento
  price             Decimal  @db.Decimal(10, 2)               // preço definido pelo user neste agendamento
  taxidogPrice       Decimal @default(0) @map("taxidog_price") @db.Decimal(10, 2) // variável por agendamento
  notes             String?  @map("notes")                   // observações sobre o cão, opcional
  contactPhone      String   @map("contact_phone")           // snapshot do telefone usado para esse atendimento

  status            AppointmentStatus @default(SCHEDULED)
  whatsappReminderSentAt DateTime? @map("whatsapp_reminder_sent_at")

  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  petshop Petshop @relation(fields: [petshopId], references: [id], onDelete: Cascade)
  dog     Dog     @relation(fields: [dogId], references: [id], onDelete: Cascade)
  service Service @relation(fields: [serviceId], references: [id])

  @@index([petshopId, scheduledAt])
  @@map("appointments")
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  DONE
  CANCELED
  NO_SHOW
}

// ---------- TEMPLATE DE MENSAGEM WHATSAPP ----------

model MessageTemplate {
  id        String   @id @default(uuid())
  petshopId String   @map("petshop_id")
  name      String   @default("Confirmação padrão")
  // placeholders suportados: {{tutor_name}} {{dog_name}} {{service_name}} {{date}} {{time}} {{price}}
  content   String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")

  petshop Petshop @relation(fields: [petshopId], references: [id], onDelete: Cascade)

  @@index([petshopId])
  @@map("message_templates")
}
```

**Decisão de design importante:** `Dog.tutorPhone` guarda o telefone padrão do tutor, mas `Appointment.contactPhone` guarda uma cópia (snapshot) do número usado *naquele* agendamento. Isso segue exatamente o que você pediu ("o número será guardado no agendamento") e também é boa prática: se o tutor mudar de número depois, o histórico do agendamento antigo continua correto. Ao criar um agendamento, o formulário pré-popula `contactPhone` com `dog.tutorPhone`, mas o usuário pode editar.

---

## 5. Regras de negócio principais

1. Um agendamento **sempre** pertence a um cão e a um serviço, ambos do **mesmo petshop** do usuário logado (validação no service layer, não confie só no frontend).
2. `price` e `taxidogPrice` do agendamento **não** são copiados automaticamente e travados — são pré-preenchidos com o `basePrice` do serviço (e 0 para taxidog) mas sempre editáveis por agendamento.
3. `durationMin` idem: sugestão vem de `service.defaultDurationMin`, mas o usuário pode sobrescrever por agendamento.
4. `notes` é opcional — não validar como obrigatório em nenhuma camada.
5. Não pode haver dois agendamentos do mesmo petshop com sobreposição de horário (regra de negócio a implementar na criação/edição — calcular conflito usando `scheduledAt` + `durationMin`).
6. Cancelamento de agendamento não deve deletar o registro (soft — usa `status = CANCELED`) para preservar histórico de faturamento.

---

## 6. Multi-tenancy — como impedir vazamento de dados entre petshops

Como o app **não** usa banco separado por tenant (mais simples de operar com poucos petshops no início), o isolamento é feito por aplicação:

1. **JWT payload** contém `sub` (userId) e `petshopId`.
2. Um **`TenantGuard`** global do NestJS extrai `petshopId` do token e injeta no `request`.
3. Um **decorator `@CurrentPetshop()`** expõe esse valor nos controllers.
4. **Toda query Prisma em `services/*.service.ts` inclui `where: { petshopId }` obrigatoriamente** — nunca buscar por `id` puro sem também filtrar `petshopId`. Isso vale até para updates/deletes (evita que o ID de um recurso de outro petshop seja adivinhado/forçado via URL — IDOR).
5. Regra de lint/convenção para o agente: **nenhum método de repositório/service pode receber apenas `id` como filtro de busca de um recurso de domínio** — sempre `(petshopId, id)`.

Exemplo de padrão a seguir em todo `*.service.ts`:
```ts
async findOne(petshopId: string, id: string) {
  const dog = await this.prisma.dog.findFirst({ where: { id, petshopId } });
  if (!dog) throw new NotFoundException('Cão não encontrado');
  return dog;
}
```

---

## 7. Fluxo de confirmação via WhatsApp

1. Um **job agendado (cron, via BullMQ repeatable job)** roda 1x por dia (ex: 08:00) e busca todos os `Appointment` com `scheduledAt` no dia seguinte e `whatsappReminderSentAt IS NULL` e `status != CANCELED`.
2. Para cada um, monta a mensagem substituindo os placeholders do `MessageTemplate` ativo daquele petshop.
3. Envia via **WhatsApp Cloud API** (endpoint `POST /v1/messages` com template aprovado, já que é mensagem iniciada pelo negócio fora da janela de 24h de conversa).
4. Em caso de sucesso, grava `whatsappReminderSentAt = now()`.
5. Em caso de falha, o BullMQ reenfileira com retry/backoff exponencial (ex: 3 tentativas).
6. Todo envio (sucesso/erro) é logado numa tabela simples de auditoria (`whatsapp_logs` — pode ser adicionada na Fase 2) para o dono poder ver se a mensagem realmente saiu.

**Necessário:** conta Meta Business + número verificado no WhatsApp Cloud API + template de mensagem pré-aprovado pela Meta (mensagens de confirmação de agendamento normalmente são aprovadas sem problema, mas o texto exato do template precisa ser cadastrado lá também — o campo `MessageTemplate.content` no banco é o que o *dono do petshop* customiza dentro das variáveis permitidas pelo template aprovado).

---

## 8. Design system (cores e identidade visual)

Paleta-base fornecida:
- **Primária:** `#791286` (roxo profundo)
- **Destaque/ação:** `#FFBA00` (âmbar vibrante)

Sugestão de tokens Tailwind (a refinar na hora de construir o frontend, seguindo a skill de frontend design para não cair em layout genérico):

```js
// tailwind.config.js (trecho)
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#791286',
        primaryDark: '#5A0D66',
        accent: '#FFBA00',
        accentDark: '#CC9500',
      },
    },
  },
}
```

Uso recomendado: roxo como cor estrutural (header, navegação, botões primários "confirmar"), âmbar reservado para ações de destaque (ex: "Enviar confirmação agora", badges de status "amanhã tem atendimento"). Evitar usar as duas em proporções iguais — uma deve dominar (roxo) e a outra pontuar (âmbar), para não ficar "carnaval".

---

## 9. Endpoints REST (visão geral — Fase 1)

Prefixo: `/api/v1`. Autenticado via `Authorization: Bearer <token>` exceto `/auth/*`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria petshop + usuário owner |
| POST | `/auth/login` | Retorna access + refresh token |
| POST | `/auth/refresh` | Renova access token |
| GET/POST | `/dogs` | Lista / cria cão |
| GET/PATCH/DELETE | `/dogs/:id` | Detalhe / edita / remove cão |
| GET/POST | `/services` | Lista / cria serviço |
| GET/PATCH/DELETE | `/services/:id` | Detalhe / edita / remove serviço |
| GET/POST | `/appointments` | Lista (com filtro de data) / cria agendamento |
| GET/PATCH/DELETE | `/appointments/:id` | Detalhe / edita / cancela agendamento |
| GET/PATCH | `/message-templates` | Vê / edita template de confirmação |
| GET | `/reports/earnings` | Ganhos por período (dia/semana/mês), filtro por serviço |
| GET | `/reports/schedule-load` | Ocupação de horários (ajuda a organizar agenda) |

---

## 10. Convenções gerais de código (para o agente seguir)

- **Response shape padronizado:** `{ data, meta? }` em sucesso; erros tratados por um `HttpExceptionFilter` global retornando `{ statusCode, message, error }`.
- **DTOs com `class-validator`** em todo input de controller (`CreateDogDto`, `UpdateAppointmentDto`, etc.) — nunca confiar em payload sem validação.
- **Nunca lógica de negócio no controller** — controller só recebe DTO, chama service, retorna. Toda regra fica no service.
- **Um módulo por domínio**, sempre com `*.controller.ts`, `*.service.ts`, `*.module.ts`, `dto/`.
- **Testes:** unit tests nos services (regra de negócio) com Jest; e2e básico nos endpoints críticos (`appointments`, `auth`).
- **Commits/branches:** conventional commits (`feat:`, `fix:`, `chore:`) para manter histórico legível caso precise reverter algo gerado pelo agente.
- **Variáveis de ambiente** centralizadas e validadas na subida da aplicação (`@nestjs/config` + schema Joi/Zod) — nunca acessar `process.env` direto no meio do código.

### `.env.example`
```
DATABASE_URL=postgresql://user:password@localhost:5432/petshop
REDIS_URL=redis://localhost:6379
JWT_SECRET=
JWT_REFRESH_SECRET=
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_NAME=confirmacao_agendamento
```

---

## 11. Roadmap de implementação sugerido (fases)

**Fase 1 — Base**
1. Setup do monorepo, Docker Compose (Postgres + Redis), Prisma schema inicial, migrations.
2. Módulo `auth` (registro de petshop + login JWT) + `TenantGuard`.
3. CRUD de `dogs` e `services` com isolamento de tenant.

**Fase 2 — Núcleo do produto**
4. CRUD de `appointments` com validação de conflito de horário.
5. Tela de agenda (calendário/lista por dia) no frontend.
6. Relatório simples de ganhos por período.

**Fase 3 — WhatsApp**
7. Integração WhatsApp Cloud API + cadastro de `MessageTemplate` customizável.
8. Job BullMQ diário de lembrete + tela para o dono acompanhar status de envio.

**Fase 4 — PWA e polimento**
9. Manifest + service worker (offline básico: cache de listagem de agendamentos já carregados).
10. Design final aplicado (paleta #791286 / #FFBA00), responsividade mobile-first (é o cenário real de uso: dono no balcão com o celular).

**Fase 5 — Escala**
11. Papel `STAFF` (funcionários com permissão restrita).
12. Métricas por petshop, exportação de relatório (CSV/PDF).

---

## 12. Próximo passo

Recomendo começarmos pela **Fase 1** literalmente: montar o monorepo, subir Postgres/Redis local via Docker, aplicar o `schema.prisma` acima e implementar `auth` + `TenantGuard`. Isso te dá a fundação de multi-tenancy funcionando antes de qualquer tela ser construída — é a parte mais arriscada de corrigir depois se for feita errada no começo.
