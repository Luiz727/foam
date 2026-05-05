import * as vscode from 'vscode';
import { Foam } from '../../../core/model/foam';
import { fromVsCodeUri } from '../../utils/vsc-utils';
import { TextGenerationProvider } from '../../../ai/services/text-generation-provider';

export interface WorkshopResult {
  optimized_prompt: string;
  clarifying_questions: string[];
}

const SYSTEM_PROMPT = `Você é um especialista em escrever prompts para o GitHub Copilot.
O usuário trabalha em um workspace de notas pessoais (Foam) e quer criar um prompt otimizado para usar no GitHub Copilot Chat.

Dado:
- A intenção bruta do usuário
- Contexto do workspace (nota ativa, notas relacionadas, tags)

Sua tarefa:
1. Analise a intenção e o contexto fornecido
2. Escreva um prompt otimizado, claro e específico para o GitHub Copilot
3. Se houver ambiguidades importantes, liste perguntas de esclarecimento (máx. 3)
4. Se não houver ambiguidades, retorne lista vazia

IMPORTANTE: Responda SOMENTE com JSON válido, sem texto extra, no formato:
{
  "optimized_prompt": "...",
  "clarifying_questions": ["...", "..."]
}`;

/**
 * Coleta contexto do workspace (nota ativa, notas relacionadas, tags) e
 * chama o LLM para gerar um prompt otimizado.
 */
export async function buildPrompt(
  rawIntent: string,
  foam: Foam,
  provider: TextGenerationProvider
): Promise<WorkshopResult> {
  const contextParts: string[] = [];

  // Nota ativa
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const uri = fromVsCodeUri(editor.document.uri);
    const resource = foam.workspace.find(uri);
    if (resource && resource.type === 'note') {
      const text = editor.document.getText();
      contextParts.push(`## Nota ativa: ${resource.title}`);
      contextParts.push(text.substring(0, 2000));

      // Tags da nota ativa
      if (resource.tags && resource.tags.length > 0) {
        const tags = resource.tags.map(tag => tag.label).join(', ');
        contextParts.push(`\nTags: ${tags}`);
      }

      // Notas relacionadas (se embeddings disponíveis)
      if (foam.embeddings) {
        const similar = foam.embeddings.getSimilar(uri, 5);
        if (similar.length > 0) {
          contextParts.push('\n## Notas relacionadas:');
          for (const item of similar) {
            const related = foam.workspace.find(item.uri);
            if (related) {
              const pct = (item.similarity * 100).toFixed(0);
              contextParts.push(`- ${related.title} (${pct}% similar)`);
            }
          }
        }
      }

      // Links da nota ativa
      if (resource.links && resource.links.length > 0) {
        const linked = resource.links
          .slice(0, 10)
          .map(l => l.rawText)
          .join(', ');
        contextParts.push(`\nLinks na nota: ${linked}`);
      }
    }
  }

  const context =
    contextParts.length > 0 ? contextParts.join('\n') : 'Nenhuma nota aberta no momento.';

  const userPrompt = `## Intenção do usuário:
${rawIntent}

## Contexto do workspace:
${context}

Gere o prompt otimizado e as perguntas de esclarecimento conforme instruído.`;

  const raw = await provider.generate(SYSTEM_PROMPT, userPrompt);

  // Extrai JSON da resposta (o LLM pode adicionar texto extra)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Resposta inesperada do modelo: ${raw.substring(0, 200)}`);
  }

  const result = JSON.parse(jsonMatch[0]) as WorkshopResult;

  if (typeof result.optimized_prompt !== 'string') {
    throw new Error('O modelo retornou um formato inválido.');
  }
  if (!Array.isArray(result.clarifying_questions)) {
    result.clarifying_questions = [];
  }

  return result;
}
