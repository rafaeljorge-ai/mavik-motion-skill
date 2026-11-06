# Changelog

Este projeto segue [Semantic Versioning 2.0.0](https://semver.org/lang/pt-BR/). Versões `MAJOR.MINOR.PATCH`; toda alteração distribuída requer atualização sincronizada de `package.json`, `plugin.json`, `.claude-plugin/`, `.codex-plugin/`, `SKILL.md`, `skills/mavik-motion/SKILL.md` e `skills/mavik-create-motions/SKILL.md`, testes CI e changelog. Tags Git anotadas `vX.Y.Z` serão criadas após testes e aprovação do release.

## [Unreleased]

### Próximos passos
- Homologar render final de 8 s no Codex e um projeto narrado com trilha.

## [2.0.0] - 2026-11-06

O plugin passa a se chamar **mavik-create-motions**: um estúdio de série que se configura sozinho e lembra de tudo entre conversas, no Claude Code e no Codex. A skill de produção `mavik-motion` continua igual por baixo.

### Adicionado
- `scripts/estudio.mjs`: `init` (cria as pastas, `estudio.json`, `.mavik/status.json` e um bloco marcado no `CLAUDE.md`/`AGENTS.md`), `serie`, `episodio`, `status`, `aprovar` e `etapa`. Mostra prévia sem `--yes`; nunca apaga nem sobrescreve arquivo da pessoa.
- Travas de aprovação por episódio: `voz` exige roteiro aprovado, `render` exige piloto e `publicado` exige final, sempre com quem aprovou e a frase exata.
- `scripts/lib/estudio-schema.mjs`: campos da entrevista de marca e de série (uma pergunta por vez) e validações.
- Skill `skills/mavik-create-motions` (orquestra setup, entrevista, episódio e aprender) e comandos `/mavik-create-motions:setup`, `marca`, `serie`, `episodio`, `continuar`, `aprender` e `status`.
- Formato `formatos/motion-interface` com a bíblia do estilo em números do Ep. 1 aprovado.
- Modelo `examples/rafaeljorge-noticias-ia` (marca, série, bíblia, erros corrigidos e pauta), só para a marca de Rafael.
- Manifestos `.claude-plugin/` (plugin e marketplace) e `.codex-plugin/`.

### Mudou
- `plugin.json`: nome `mavik-create-motions`; a skill de onboarding do Codex passa a ser a do estúdio.
- `doctor.mjs` lê a versão do `package.json`.

### Ainda falta (próximos incrementos)
- Porta do Ep. 1 para um componente Remotion que lê o JSON do episódio (`motor/formatos/motion-interface`).
- Tempos de palavra sem créditos (pausas ou whisper local) dentro do fluxo.
- Homologação: instalar no Claude Code e no Codex e produzir um episódio do zero.

## [1.2.0] - 2026-10-17

### Adicionado
- Preflight bloqueante `scripts/brief-check.mjs`: exige identidade verificada, objetivo, público, mensagem, CTA, idioma, narração, música e formato antes de produzir.
- Documentação `references/context-first.md` e `references/brief-schema.md`; `examples/ia10x/brief.json` ilustrativo validado.
- Motor principal Remotion com demo editável de 8 s; integração determinística de easing GSAP e projeção de geometria Three.js 3D em SVG.
- Comandos `npm run brief:check`, `demo:remotion:install`, `demo:remotion:still` e `demo:remotion:render`.
- Testes para presença de GSAP/Three/Remotion e bloqueios do preflight.

### Alterado
- Seleção de motor: Remotion principal; GSAP/Three.js sob demanda; HyperFrames alternativo.
- Skill, README, doctor, guias e CI atualizados.
- Nenhuma dependência é instalada automaticamente e nenhuma chamada paga é feita pelo preflight.

### Limitações
- O demo Remotion foi inspecionado estaticamente, **ainda não homologado com render final neste ambiente**.
- A integração de voz continua exigindo testes com contas autorizadas.


### Planejado
- Teste de renderização end-to-end real em Remotion / HyperFrames nos ambientes Codex e Claude Code.
- Comparativo auditivo de vozes pt-BR com execução autorizada, alinhamento em Fish e integração de conector Higgsfield.

## [1.1.0] - 2026-10-17

### Adicionado
- `MAVIK Audio Director`: script de narração `scripts/tts.mjs` com provedores ElevenLabs Multilingual v2 e Fish Audio S2.1 Pro e interface de planejamento para Higgsfield.
- Prévia dry-run por padrão; `--execute` exigido para chamadas potencialmente pagas; salvaguarda de overwrite.
- Alinhamento temporal por caractere para ElevenLabs quando fornecido pelo provedor.
- `references/audio-providers.md` com contratos API, licenciamento e fluxo seguro de produção.
- `scripts/release-check.mjs` e testes de áudio sem chamadas reais às APIs.
- Modelo de `.env.example` e verificação read-only do ambiente para provedores.

### Alterado
- Documentação e skill principal atualizadas com pipeline ElevenLabs → Fish Audio → Higgsfield (opcional).
- Versões sincronizadas com `package.json`, plugin e cabeçalhos de skill.
- CI passa a executar a verificação de consistência de versões.

### Limitações
- Integrações não foram testadas com chaves reais, nem geraram voz paga.
- Renderização end-to-end HyperFrames e Remotion continua pendente de homologação.

## [1.0.0] - 2026-10-17

### Inicial
- Estrutura Agent Plugin; skills Codex / Claude Code; `doctor`, Beat Grid, referências, shotlists e testes automatizados.
- Exemplo de motion HyperFrames ainda não homologado em render final.
- Distribuído inicialmente como ZIP antes da primeira publicação no GitHub.
