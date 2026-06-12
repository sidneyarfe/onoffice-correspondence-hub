# Epic 002 — Design System 2.0 "Dark Premium" (reformulação geral)

**Status:** Concluído (pendência: smoke visual pelo usuário — `npm run dev`)
**Owner:** @pm (Morgan)
**Criado em:** 2026-06-12
**Decisão do usuário:** base **Dark Premium + Bento + Glass**, aplicada ao **sistema inteiro**
(funil público incluso — "tudo dark, brand total").

## Objetivo

Reformular TODO o visual da plataforma (funil público + dashboard cliente + admin + modais)
para um design system dark premium com o lime ON Office como acento neon:

- **Superfícies:** grafite `#0A0A0C` (fundo) / `#121214` (cards) — nunca preto puro
  (regra OLED smear da skill); bordas hairline `rgba(255,255,255,0.08)`.
- **Acento:** `on-lime #60FF00` como neon — glow sutil (`0 0 24px rgba(96,255,0,.25)`)
  em CTAs, item ativo e métricas-chave. Texto sobre lime: sempre `on-black`.
- **Layout:** bento grid assimétrico (tiles 1x1/2x1/2x2, radius 20-24px, hover scale 1.02).
- **Glass:** frosted (blur 16px, branco 6-12%) APENAS em hero/sidebar/modais (regra da
  skill: tempero, não base — performance e contraste).
- **Tipografia:** Outfit (títulos) + Work Sans (corpo) — pareamento "Geometric Modern".
- Inclui os fixes da avaliação de 2026-06-12: h1 único por tela, h2 não antes de h1,
  contraste de labels ≥4.5:1, `prefers-reduced-motion`, Financeiro sem mensagem
  contraditória, sem interativo aninhado.

## Evidências da skill (ui-ux-pro-max, runs de 2026-06-12)

Estilos-base: "Modern Dark" (dark premium, fintech/pro) + "Dark Mode OLED" (contraste 7:1+,
neon accents) + "Bento Box Grid" (Apple-style, Tailwind 10/10) + "Glassmorphism" (modern
SaaS/financial, alerta contraste 4.5:1). Rejeitados: Cyberpunk (a11y limitada), Skeuomorfismo
(performance). Tipografia: "Geometric Modern" (Outfit + Work Sans).

## Stories

| ID | Story | Status | QA |
|----|-------|--------|----|
| 2.1 | Fundação: tokens dark premium, glow/glass/bento utilities, Outfit | Done | PASS |
| 2.2 | Shells + dashboards (cliente/admin) em dark bento + fixes a11y | Done | PASS |
| 2.3 | Páginas internas do cliente + modais | Done | PASS |
| 2.4 | Páginas internas do admin + modais | Done | PASS (deferral lint legado) |
| 2.5 | Funil público dark | Done | PASS |

## Restrições

- Brand lock: lime `#60FF00`, dark `#232323`, black `#000000`; Work Sans no corpo.
- pt-BR em strings de UI; gates lint + tsc + build por story; push só via @devops.
- Contraste: lime sobre grafite ≈10:1 ✅; texto principal `#EDEDEF` sobre `#0A0A0C` ≈15:1 ✅;
  texto muted mínimo `#8A8F98` (≥4.6:1 sobre card).
- Glass sempre com fallback (`@supports (backdrop-filter)`).

## Critérios de sucesso

1. Zero superfícies claras remanescentes (`bg-white`, `bg-gray-50`, `text-gray-900`…)
   fora de contextos intencionais (ex.: texto sobre lime).
2. Sistema 100% navegável em dark com AA; foco visível; reduced-motion respeitado.
3. Bento aplicado nos dashboards; glass em hero/sidebar/modais.
4. Funil público com a mesma identidade (conversão dark estilo Linear/Railway).
