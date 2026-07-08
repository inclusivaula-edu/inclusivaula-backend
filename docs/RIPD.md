# Relatório de Impacto à Proteção de Dados Pessoais (RIPD)

**Plataforma:** InclusivAula — plataforma de educação inclusiva com IA
**Base legal do documento:** Art. 5º, XVII e Art. 38 da Lei 13.709/2018 (LGPD)
**Versão:** 1.0 · **Data:** 08/07/2026 · **Próxima revisão:** 08/01/2027

> ⚠️ Campos entre colchetes devem ser preenchidos antes de apresentar o documento a terceiros.

---

## 1. Identificação dos agentes de tratamento

| Papel | Identificação |
|---|---|
| **Controlador** (dos dados de alunos) | A escola/rede de ensino contratante — define finalidades no contexto educacional |
| **Operador** | [Razão social da empresa InclusivAula], CNPJ [•] — trata dados em nome da escola |
| **Controlador** (dados de professores/gestores) | [Razão social da empresa InclusivAula] — dados de conta e uso da plataforma |
| **Encarregado (DPO)** | [Nome], [e-mail de contato do encarregado] |

## 2. Descrição do tratamento

A InclusivAula gera, com apoio de IA, planos de aula adaptados, exercícios,
avaliações, simulados, PEI (Plano Educacional Individualizado) e planos de AEE
(Atendimento Educacional Especializado) para alunos com necessidades educacionais
especiais, além de registrar frequência de sessões AEE (FUNDEB) e notas.

### 2.1 Categorias de titulares

| Titular | Observação |
|---|---|
| Alunos da educação básica | **Crianças e adolescentes** — tratamento no melhor interesse (Art. 14 LGPD) |
| Professores e gestores escolares | Usuários diretos da plataforma |
| Responsáveis legais | Nome/contato do responsável no cadastro do aluno |

### 2.2 Dados tratados

| Categoria | Dados | Sensível? |
|---|---|---|
| Identificação do aluno | Nome, série, turma | Não |
| **Saúde/deficiência do aluno** | Tipo de deficiência/NEE, comportamento observável, estratégias que funcionam, observações pedagógicas | **Sim (Art. 5º, II — dado de saúde)** |
| Responsável | Nome, telefone, e-mail | Não |
| Professor/gestor | Nome, e-mail, telefone, cargo, escola | Não |
| Escola | Nome, cidade, CNPJ, telefone, endereço | Não (PJ) |
| Uso | Registros de acesso, logs de auditoria, IP | Não |

**Base legal principal:** execução de contrato (Art. 7º, V) e obrigação
educacional; para dados de saúde de alunos: tutela de procedimentos por
serviço educacional no melhor interesse do menor (Art. 11, II, "f" c/c Art. 14),
com consentimento específico do usuário registrado no cadastro
(`profiles.accepted_terms_at`).

## 3. Necessidade e proporcionalidade

O tipo de deficiência e o comportamento observável são **imprescindíveis** à
finalidade: sem eles não é possível adaptar o material pedagógico (objeto do
serviço). Aplica-se minimização:

- Campos de entrada são filtrados por allowlist (`pickStudentFields`) — nada além do necessário é aceito.
- **Pseudonimização na IA**: o nome do aluno **nunca é enviado** ao provedor de IA; os prompts usam o marcador `[NOME_DO_ALUNO]`, reinserido apenas na infraestrutura própria (`src/nexus7/pseudonym.js`).
- Textos livres são truncados (máx. 1.000 caracteres) e sanitizados antes de qualquer uso em IA.

## 4. Ciclo de vida dos dados

| Fase | Como ocorre |
|---|---|
| Coleta | Cadastro pelo professor/gestor, com consentimento explícito registrado com timestamp |
| Armazenamento | Supabase (PostgreSQL) com RLS em 100% das tabelas; CNPJ e telefones criptografados em coluna (pgcrypto); funções de criptografia restritas ao service_role |
| Uso | Geração pedagógica (IA pseudonimizada), relatórios, frequência FUNDEB |
| Compartilhamento | Ver seção 5 |
| Retenção | Durante a vigência da conta; exclusão em até 90 dias após encerramento (Política de Privacidade) |
| Eliminação | Autoatendimento: `DELETE /api/lgpd/account` (remove dados pessoais do usuário; conteúdo pedagógico institucional é preservado para a escola) |

## 5. Compartilhamento com terceiros (suboperadores)

| Terceiro | Finalidade | Dados | Localização |
|---|---|---|---|
| OpenAI | Geração de conteúdo pedagógico | Perfil pedagógico **pseudonimizado** (sem nome do aluno), tema, série | EUA — transferência internacional (Art. 33) |
| Supabase | Banco de dados e autenticação | Todos os dados da plataforma | **Brasil (São Paulo, sa-east-1)** — dados em repouso residem em território nacional |
| Railway | Hospedagem da API | Dados em trânsito | EUA |
| Vercel | Hospedagem do frontend | Não persiste dados de alunos | EUA/CDN global |
| Resend | E-mails transacionais | Nome e e-mail do usuário | EUA |
| Mercado Pago | Pagamentos | Dados de cobrança da escola (não trata dados de alunos) | Brasil |
| Sentry | Monitoramento de erros | Stack traces (mensagens de erro mascaradas em produção) | EUA |

**Ação pendente:** formalizar DPAs (Data Processing Agreements) com cada
suboperador e anexar a este relatório.

## 6. Medidas de segurança implementadas

**Controle de acesso**
- Autenticação JWT (Supabase Auth) + MFA TOTP disponível a todos; MFA **obrigatório** para ações financeiras
- Hierarquia de papéis (professor < coordenador < diretor < secretaria < mec) com verificação *fail-closed* no servidor
- Isolamento multi-tenant por `school_id`: RLS no banco + `tenantGuard` na API (tentativas cross-tenant são bloqueadas e auditadas)
- Troca de senha exige senha atual; mínimo de 8 caracteres

**Proteção de dados**
- Criptografia em trânsito (TLS) e em repouso (Supabase) + criptografia de coluna (pgcrypto) para CNPJ/telefones
- Funções `encrypt_pii`/`decrypt_pii` executáveis apenas pelo backend (revogadas de `anon`/`authenticated`)
- Pseudonimização do nome do aluno em todos os prompts de IA
- Mensagens de erro internas mascaradas em produção

**Auditoria e monitoramento**
- Trilha de auditoria (`audit_logs`): login, ações administrativas, violações de tenant, exportação e exclusão de dados LGPD
- Alertas de segurança com painel para gestores (diretor+)
- Monitoramento de erros (Sentry) e logs estruturados (pino)

**Desenvolvimento seguro**
- CI com testes automatizados das regras de segurança (roles, MFA, sanitização, pseudonimização), auditoria de dependências e verificação de sintaxe em todo push
- Sanitização anti-prompt-injection nas entradas de IA
- Rate limiting geral e específico para endpoints de IA
- Backup diário automatizado do banco (retenção 90 dias)

**Continuidade**
- Recuperação automática de gerações interrompidas por reinício do servidor

## 7. Direitos do titular (Art. 18) — canais implementados

| Direito | Canal |
|---|---|
| Confirmação e acesso | Tela da plataforma + `GET /api/lgpd/export` |
| Portabilidade | Exportação JSON completa (perfil + conteúdos gerados) |
| Eliminação | `DELETE /api/lgpd/account` na tela Segurança (com salvaguarda para administradores de escola) |
| Revogação de consentimento | Encerramento de conta ou contato com o encarregado |
| Informação sobre compartilhamento | Política de Privacidade + seção 5 deste RIPD |

Direitos de titulares alunos/responsáveis são exercidos por intermédio da
escola (controladora), com suporte do encarregado.

## 8. Matriz de riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigações | Risco residual |
|---|---|---|---|---|---|
| 1 | Vazamento de dados de saúde de menores | Baixa | **Crítico** | RLS + tenantGuard + criptografia + auditoria + testes automatizados | Baixo |
| 2 | Reidentificação no provedor de IA | Baixa | Alto | Pseudonimização do nome; perfil mínimo necessário; texto truncado | Baixo-médio (nome não trafega; características sim, por necessidade da finalidade) |
| 3 | Acesso indevido entre escolas (cross-tenant) | Baixa | Alto | Dupla barreira (RLS + API), violações auditadas e alertadas | Baixo |
| 4 | Conta de gestor comprometida | Média | Alto | MFA disponível (obrigatório em billing), senha forte, auditoria de login | Médio — **plano: tornar MFA obrigatório para diretor+** |
| 5 | Incidente em suboperador (EUA) | Baixa | Alto | Pseudonimização, mínimo necessário; **plano: DPAs formais** | Médio |
| 6 | Perda de dados | Baixa | Alto | Backup diário automatizado, retenção 90 dias | Baixo |
| 7 | Uso indevido por prompt injection | Média | Médio | Sanitização de padrões de injeção + testes; dados tratados como conteúdo | Baixo |

## 9. Plano de ação

| Ação | Prazo sugerido | Responsável |
|---|---|---|
| Nomear e publicar Encarregado (DPO) no site | Imediato | [•] |
| Formalizar DPAs com OpenAI, Supabase, Railway, Vercel, Resend, Sentry | 30 dias | [•] |
| Tornar MFA obrigatório para papéis diretor+ | 60 dias | Equipe técnica |
| Habilitar proteção contra senhas vazadas (requer plano Supabase Pro) | Quando houver upgrade | Equipe técnica |
| Procedimento formal de resposta a incidentes (comunicação à ANPD/titulares — Art. 48) | 90 dias | [•] |

## 10. Conclusão

O tratamento é **necessário e proporcional** à finalidade de garantir o direito
à educação inclusiva (Lei 13.146/2015, Art. 27-28). As medidas técnicas e
organizacionais implementadas — em especial a pseudonimização perante o
provedor de IA, o isolamento multi-tenant com dupla barreira, a criptografia
de PII e os canais de direitos do titular — reduzem os riscos aos titulares a
níveis baixos ou gerenciáveis, com plano de ação definido para os itens
residuais.

---
*Documento elaborado com base no Guia de Elaboração de RIPD da ANPD.*
