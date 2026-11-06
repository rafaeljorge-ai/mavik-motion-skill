# Estado de verificação — MAVIK Create Motions v2.0.0

## v2.0.0 · estúdio de série (06/11/2026)
### Validado neste ambiente
- `npm run release:check` (2.0.0 em package, três manifestos de plugin, três SKILL.md, changelog e README) e `npm test` 24/24 (9 testes novos do estúdio).
- Fluxo real numa pasta vazia: `init` com o modelo de Rafael → `status` → `episodio` → trava bloqueou `voz` sem roteiro aprovado → `aprovar` → `etapa` avançou.
- CI do PR #1 verde (skill-tests e GitGuardian).

### Falta (próximos incrementos)
- Incremento 3: componente `motor/formatos/motion-interface` que lê o JSON do episódio (porta do Ep. 1 aprovado, código em `rafaeljorge-ai/mavik-discovery`, `trechos/reel-motion-interface-remotion/`); prova: refazer o Ep. 1 pela skill e sair igual.
- Incremento 4: fluxo do episódio com voz, tempos sem créditos (pausas ou whisper local), som por função e mix.
- Incremento 5: `continuar`, `aprender` e `status` ligados ao painel (`.mavik/status.json`).
- Incremento 6: instalar como plugin no Claude Code e no Codex e produzir um episódio do zero.

### Decisão pendente
- `examples/rafaeljorge-noticias-ia` traz a marca e as correções de Rafael com as frases originais e este repositório é público: manter ou mover para repositório privado antes do merge.

## v1.2.0 (histórico)

## Validado neste ambiente
- Estrutura Agent Plugin/skill e manifestos com versão consistente.
- Testes unitários de brief, beat grid, shotlist, áudio simulado e regras de integração.
- `scripts/brief-check.mjs` bloqueia briefing sem fonte confirmada, CTA ou voz aprovada.
- CLI `doctor` é somente leitura e não instala nada.
- Modelo Remotion com uso explícito de GSAP e Three.js incluído e auditado estaticamente.

## Ainda requer homologação
- **Render end-to-end** do exemplo Remotion + GSAP + Three.js com dependências instaladas.
- Instalação e invocação da skill em um Codex ou Claude Code autorizado.
- Voz ElevenLabs/Fish/Higgsfield com credenciais reais e custos aprovados.
- HyperFrames antigo continua como motor alternativo, ainda sem render final homologado.

Atenção: CI de unit tests não substitui smoke render real. Publicação no GitHub e tag são separadas, registrar SHA apenas após confirmação.
