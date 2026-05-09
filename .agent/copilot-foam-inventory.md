# Inventario Copilot + Foam

Este arquivo lista onde estao gravados os artefatos de agentes, hooks, skills, instrucoes, prompts e arquivos canonicos.

## 1) Agentes

Diretorio base: `C:\Users\Luiz\.copilot\agents`

- `C:\Users\Luiz\.copilot\agents\planejamento.agent.md`
- `C:\Users\Luiz\.copilot\agents\execucao.agent.md`
- `C:\Users\Luiz\.copilot\agents\revisao.agent.md`
- `C:\Users\Luiz\.copilot\agents\debugging.agent.md`
- `C:\Users\Luiz\.copilot\agents\planejamento-foam.agent.md`
- `C:\Users\Luiz\.copilot\agents\execucao-foam.agent.md`
- `C:\Users\Luiz\.copilot\agents\revisao-foam.agent.md`
- `C:\Users\Luiz\.copilot\agents\debugging-foam.agent.md`

## 2) Hooks

Diretorio base: `C:\Users\Luiz\.copilot\hooks`

- `C:\Users\Luiz\.copilot\hooks\agent-workflow.json`
- `C:\Users\Luiz\.copilot\hooks\enforce-workflow.json`
- `C:\Users\Luiz\.copilot\hooks\quality.json`
- `C:\Users\Luiz\.copilot\hooks\audit-trail.json`
- `C:\Users\Luiz\.copilot\hooks\agent-workflow-foam.json`
- `C:\Users\Luiz\.copilot\hooks\enforce-workflow-foam.json`
- `C:\Users\Luiz\.copilot\hooks\quality-foam.json`
- `C:\Users\Luiz\.copilot\hooks\audit-trail-foam.json`

Scripts de hooks (diretorio): `C:\Users\Luiz\.copilot\hooks\scripts`

- `agent-sessionstart*.ps1`
- `agent-pretooluse*.ps1`
- `agent-precompact*.ps1`
- `enforce-sessionstart*.ps1`
- `enforce-pretooluse*.ps1`
- `enforce-posttooluse*.ps1`
- `enforce-stop*.ps1`
- `quality-posttooluse*.ps1`
- `audit-userpromptsubmit*.ps1`
- `audit-posttooluse*.ps1`

## 3) Skills

Diretorio base: `C:\Users\Luiz\.copilot\skills`

- `C:\Users\Luiz\.copilot\skills\gerar-plano\`
- `C:\Users\Luiz\.copilot\skills\executar-com-checklist\`
- `C:\Users\Luiz\.copilot\skills\revisar-conformidade\`
- `C:\Users\Luiz\.copilot\skills\validar-passo\`
- `C:\Users\Luiz\.copilot\skills\fazer-perguntas\`
- `C:\Users\Luiz\.copilot\skills\debugar-problema\`
- `C:\Users\Luiz\.copilot\skills\desbloquear-execucao\`

## 4) Instrucoes

Diretorio base: `C:\Users\Luiz\.copilot\instructions`

- `C:\Users\Luiz\.copilot\instructions\checklist.instructions.md`
- `C:\Users\Luiz\.copilot\instructions\governanca.instructions.md`
- `C:\Users\Luiz\.copilot\instructions\security.instructions.md`
- `C:\Users\Luiz\.copilot\instructions\checklist-foam.instructions.md`
- `C:\Users\Luiz\.copilot\instructions\governanca-foam.instructions.md`
- `C:\Users\Luiz\.copilot\instructions\security-foam.instructions.md`

## 5) Prompts

Diretorio base: `C:\Users\Luiz\.copilot\prompts`

- `C:\Users\Luiz\.copilot\prompts\iniciar-planejamento.prompt.md`
- `C:\Users\Luiz\.copilot\prompts\executar-plano.prompt.md`
- `C:\Users\Luiz\.copilot\prompts\revisar-implementacao.prompt.md`
- `C:\Users\Luiz\.copilot\prompts\relatorio-final.prompt.md`
- `C:\Users\Luiz\.copilot\prompts\iniciar-planejamento-foam.prompt.md`
- `C:\Users\Luiz\.copilot\prompts\executar-plano-foam.prompt.md`
- `C:\Users\Luiz\.copilot\prompts\revisar-implementacao-foam.prompt.md`
- `C:\Users\Luiz\.copilot\prompts\relatorio-final-foam.prompt.md`

Prompts de usuario do VS Code:

- `C:\Users\Luiz\AppData\Roaming\Code\User\prompts\analisador-de-prompts.agent.md`
- `C:\Users\Luiz\AppData\Roaming\Code\User\prompts\analisador-de-prompts-foam.agent.md`

## 6) Arquivos canonicos (workspace)

Diretorio base: `C:\Users\Luiz\0PROJ\foam\.agent`

- `C:\Users\Luiz\0PROJ\foam\.agent\current-plan.md`
- `C:\Users\Luiz\0PROJ\foam\.agent\foam-chat-copilot-architecture.md`
- `C:\Users\Luiz\0PROJ\foam\.agent\project-state.json`
- `C:\Users\Luiz\0PROJ\foam\.agent\project-state.schema.json`

## 7) Logs de auditoria

- Log legado: `C:\Users\Luiz\0PROJ\foam\.copilot-audit.log`
- Log Foam: `C:\Users\Luiz\0PROJ\foam\.copilot-audit-foam.log`

## Observacao

Arquivos em `C:\Users\Luiz\.copilot\...` e `C:\Users\Luiz\AppData\Roaming\Code\User\prompts\...` sao de perfil local do usuario, nao do repositorio. Para portabilidade, manter copia canonica tambem no repositorio e usar provisionamento pela extensao.
