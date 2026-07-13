# Plano Editorial — InclusivAula (realista)

Este plano substitui o "Projeto Editorial Mestre" recebido em 09/07/2026.
Motivo da revisão: o documento original propunha 300+ artigos, 200 guest
posts e uma "knowledge base" de 500-1.000 arquivos Markdown — volume
incompatível com o estágio da empresa (Inova Simples, 1 pessoa) e um
formato (mega-repositório de arquivos) que não confere ao Claude Code
memória permanente entre sessões. Mantido: os clusters temáticos e os
critérios de qualidade do documento original, que são sólidos.

## Já publicado (09/07/2026)

| Página | URL |
|---|---|
| Hub de recursos | /recursos/ |
| O que é PEI | /recursos/pei/ |
| PEI × PDI × PAEE | /recursos/pei-pdi-paee/ |
| Estudo de Caso (Portaria 421/2026) | /recursos/estudo-de-caso-portaria-421/ |
| Plano de aula adaptado | /recursos/plano-de-aula-adaptado/ |
| AEE na prática | /recursos/aee/ |

## Já publicado (13/07/2026)

| Página | URL | PR |
|---|---|---|
| PEI para Autismo (TEA) | /recursos/pei-para-autismo-tea/ | [inclusivaula-frontend#1](https://github.com/inclusivaula-edu/inclusivaula-frontend/pull/1) |

## Princípio do ritmo

**2 a 4 páginas novas por mês**, no mesmo padrão técnico das já publicadas
(Article + FAQPage + Breadcrumb JSON-LD, formato de resposta citável).
Prioriza-se profundidade e correção legal sobre volume — um artigo errado
sobre legislação de educação especial é pior que nenhum artigo.

Cada página nova é: título-pergunta, resposta direta no 1º parágrafo,
corpo estruturado, 4-6 FAQs, link para /cadastro. Sempre linkada a partir
do hub e de páginas relacionadas (link building interno).

## Backlog priorizado (do cluster original, sem os itens irreais)

Ordem por relevância estratégica (o que professores mais buscam / o que
diferencia a InclusivAula da concorrência):

### Mês 1
1. ~~**PEI para Autismo (TEA)**~~ — publicado em 13/07/2026, /recursos/pei-para-autismo-tea/
2. **50 adaptações curriculares práticas** — formato lista, alto valor de compartilhamento
3. **Guia da Lei Brasileira de Inclusão (LBI)** — autoridade legal, complementa a Portaria 421

### Mês 2
4. **PEI para TDAH**
5. **Erros comuns no PEI** (o que reprova em auditoria — já citado como seção dentro de /recursos/pei/, vira página própria mais aprofundada)
6. **Diferença entre AEE e sala comum: o que cada um faz**

### Mês 3
7. **Deficiência Intelectual: como adaptar o ensino**
8. **Relatório pedagógico descritivo: como escrever**
9. **100 objetivos mensuráveis para PEI (banco por área)**

### Mês 4
10. **Dislexia: guia prático de sala de aula**
11. **Altas Habilidades/Superdotação: o perfil esquecido do AEE**
12. **Checklist de AEE para o professor da Sala de Recursos**

### Backlog contínuo (sem data, conforme demanda/notícias)
- Síndrome de Down, Paralisia Cerebral, Deficiência Visual, Deficiência Auditiva (perfis específicos)
- IA na educação inclusiva: o que é ético e o que não é
- Família e inclusão: como comunicar o PEI aos pais
- PEI na Educação Infantil vs. Fundamental vs. Médio (diferenças práticas)

## O que foi descartado do plano original — e por quê

| Item original | Por que descartado |
|---|---|
| 500-1.000 arquivos "knowledge base" | Não confere memória persistente ao Claude Code; complexidade sem função real |
| 200 guest posts | Editores humanos de Diversa/Nova Escola/Porvir não aceitam esse volume de uma fonte nova; risco de parecer spam |
| 300+ artigos / 150 e-books / 100 whitepapers em 12 meses | Volume de redação de 5-10 pessoas; inviável para operação atual |
| Calendário de 60 dias com 8 guias + 20 artigos + 16 guest posts | Fisicamente incompatível com 1 pessoa mantendo qualidade |
| Repositório separado "InclusivAula-SEO-Master" | Fragmenta o conteúdo do site real; melhor manter tudo em public/recursos, versionado junto com o código que o serve |

## Guest posts — mantido, mas realista

1 guest post a cada 4-6 semanas, não 16 em 60 dias. Alvos, nesta ordem:
Diversa → Nova Escola → Porvir. Artigo da Portaria 421/2026 já está pronto
em `docs/KIT-DIVULGACAO.md` (seção 7) — usar como o primeiro envio.

## Redes sociais

1 post/semana no LinkedIn e no Google Business Profile (perfis já criados
em 08-09/07/2026), sempre linkando a um artigo de /recursos. Não criar
calendário de "500 posts" — sustentar 1/semana já é meta real para 1 pessoa.

## Revisão deste plano

Reavaliar a cada 2 meses: o que foi publicado, quais páginas começaram a
receber tráfego/indexação (Google Search Console) e ajustar o backlog
conforme o que performar melhor.
