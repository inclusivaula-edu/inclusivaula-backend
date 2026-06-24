# InclusivAula — Pendentes para Produção

> Criado em 2026-06-20. Resolver nesta ordem.

---

## 1. Rodar migration no Supabase ⚡ CRÍTICO

Abrir o **SQL Editor** do Supabase e executar o arquivo `migration_billing.sql` da raiz do projeto.

O que a migration faz:
- Adiciona `school_id`, `asaas_customer_id`, `asaas_subscription_id`, `last_payment_at`, `updated_at` na tabela `subscriptions`
- Cria constraint `UNIQUE (school_id)` para permitir o upsert por escola
- Cria índice no `asaas_subscription_id` para lookup rápido no webhook
- Recria a função RPC `incrementar_uso` com validação de campo

**Link:** https://supabase.com/dashboard/project/mauafavxvwzcvcotdjdi/sql

---

## 2. Configurar variáveis de ambiente no Railway ⚡ CRÍTICO

Painel: https://railway.app → projeto `inclusivaula-backend`

Adicionar/atualizar:

| Variável | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | `https://www.inclusivaula.com.br` |
| `ASAAS_API_KEY` | chave gerada no painel Asaas (Configurações → Integrações) |
| `ASAAS_WEBHOOK_TOKEN` | token que você escolher (ex: `inclusivaula2026webhook`) |
| `ASAAS_SANDBOX` | `false` (produção real) ou `true` (para testar) |

---

## 3. Configurar webhook no painel Asaas ⚡ CRÍTICO

Painel Asaas → **Configurações → Notificações → Webhook**

- **URL:** `https://inclusivaula-backend-production.up.railway.app/api/billing/webhook`
- **Token de acesso:** mesmo valor definido em `ASAAS_WEBHOOK_TOKEN` acima
- **Eventos a habilitar:**
  - `PAYMENT_CONFIRMED`
  - `PAYMENT_RECEIVED`
  - `PAYMENT_OVERDUE`
  - `SUBSCRIPTION_DELETED`

---

## 4. Testar fluxo completo no sandbox 🧪

Antes de ligar `ASAAS_SANDBOX=false`:

1. Criar conta sandbox em https://www.asaas.com (ambiente de testes)
2. Gerar API Key sandbox
3. Colocar `ASAAS_SANDBOX=true` e a key sandbox no `.env` local
4. Testar via curl ou Insomnia:
   - `POST /api/billing/subscribe` com `{ "plan": "pro" }` (como school_admin)
   - Verificar que retorna `pixQrCode` ou `invoiceUrl`
   - Simular pagamento no painel sandbox do Asaas
   - Verificar que webhook dispara e muda `status` para `active` no banco
5. Testar `GET /api/billing/plan` e conferir que os limites subiram
6. Testar `DELETE /api/billing/cancel` e conferir que volta para free

---

## 5. Habilitar RLS no Supabase 🔒 (recomendado pós-validação)

O SQL está comentado no final do `migration_billing.sql`. Executar APENAS após validar que o fluxo de cadastro e acesso direto do frontend ainda funciona.

Tabelas a proteger:
- `students` — política por `school_id` do perfil logado
- `lessons` — política por `user_id = auth.uid()`
- `profiles` — política por `id = auth.uid()`

---

## 6. Código de convite para escolas 👥 (próxima feature)

Sem isso, cada professor que se cadastra cria uma escola nova em vez de entrar na escola existente.

**SQL necessário:**
```sql
ALTER TABLE schools ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
UPDATE schools SET invite_code = UPPER(SUBSTR(MD5(id::text), 1, 8)) WHERE invite_code IS NULL;
```

**Backend:** adicionar rota `GET /api/schools/invite/:code` para buscar escola por código  
**Frontend:** adicionar opção "Entrar em escola existente" no Step 2 do cadastro (`/cadastro`)
