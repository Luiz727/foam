# Integração Foam no Chat do VS Code com GitHub Copilot

## Objetivo

Definir como os agentes duplicados da linha Foam devem operar no Chat do VS Code com GitHub Copilot para:

1. Iniciar projeto do zero
2. Ler e atualizar estado do projeto durante o desenvolvimento

## Canal oficial

- Interface: Chat do VS Code
- Orquestração: GitHub Copilot Agents (linha Foam)
- Agentes usados: Planejamento, Execução, Revisão e Debugging na variante Foam

## Estado canônico do projeto

Arquivo obrigatório no workspace: `.agent/project-state.json`

Campos mínimos:

- `stateVersion`
- `project`
- `modules`
- `tasks`
- `decisions`
- `risks`
- `validationHistory`
- `updatedAt`

## Ciclo de operação

1. Planejamento (Foam) cria plano e checklist
2. Execução (Foam) aplica passo a passo
3. Hooks Foam validam política e registram auditoria
4. Estado do projeto é atualizado obrigatoriamente após cada passo validado
5. Revisão (Foam) confere conformidade e fechamento

## Matriz de decisão: Tools vs MCP

Use apenas Tools quando:

- O estado é local ao workspace
- O fluxo é de um único repositório/sessão
- Não há necessidade de credenciais externas sensíveis
- Auditoria via log local é suficiente

Use MCP quando:

- É preciso estado compartilhado entre múltiplas sessões/usuários
- Há integrações externas com autenticação centralizada
- É necessário controle de acesso por operação
- É necessário histórico/auditoria central corporativa

## Decisão recomendada para MVP

- **MVP**: Tools locais + arquivos de estado no workspace + hooks Foam
- **Fase 2**: Introduzir MCP se houver necessidade de colaboração multi-sessão e governança central

## Status de implementação

- Estado canônico e schema criados no workspace (`.agent/project-state.json` e `.agent/project-state.schema.json`)
- Agentes de Planejamento e Execução Foam atualizados para persistência obrigatória de estado
- Prompts Foam atualizados para exigir o ciclo de atualização contínua

## Contrato MCP mínimo (fase 2)

- `getState(projectId)`
- `updateState(projectId, patch)`
- `appendEvent(projectId, event)`
- `lockState(projectId, sessionId)`
- `validateState(projectId)`

## Segurança

- Operações destrutivas continuam bloqueadas por hook
- Agente de execução Foam é o único com permissão de edição
- Segredos devem permanecer em variáveis de ambiente

## Critérios de sucesso

- Agentes legados continuam funcionando sem mudanças
- Linha Foam executa planejamento → execução → revisão sem conflito
- Logs de auditoria Foam separados em `.copilot-audit-foam.log`
- Estado do projeto permanece consistente durante evolução
