import * as vscode from 'vscode';
import { Foam } from '../../../core/model/foam';
import { PromptWorkshopPanel } from './prompt-workshop-panel';
import { OllamaTextProvider } from '../../../ai/providers/ollama/ollama-text-provider';
import {
  OpenAITextProvider,
  OPENAI_SECRET_KEY,
} from '../../../ai/providers/openai/openai-text-provider';
import { TextGenerationProvider } from '../../../ai/services/text-generation-provider';

export const OPEN_PROMPT_WORKSHOP_COMMAND = {
  command: 'foam-vscode.open-prompt-workshop',
  title: 'Foam: Abrir Prompt Workshop',
};

export const SET_OPENAI_KEY_COMMAND = {
  command: 'foam-vscode.set-openai-key',
  title: 'Foam: Configurar Chave OpenAI',
};

export default async function activate(
  context: vscode.ExtensionContext,
  foamPromise: Promise<Foam>
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(SET_OPENAI_KEY_COMMAND.command, async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Cole sua chave de API OpenAI (sk-...)',
        password: true,
        ignoreFocusOut: true,
        validateInput: v => (v && v.trim().length > 0 ? null : 'A chave não pode ser vazia.'),
      });
      if (key) {
        await context.secrets.store(OPENAI_SECRET_KEY, key.trim());
        vscode.window.showInformationMessage('Chave OpenAI salva com segurança.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_PROMPT_WORKSHOP_COMMAND.command, async () => {
      const foam = await foamPromise;
      const provider = createTextProvider(context);
      PromptWorkshopPanel.createOrShow(context.extensionUri, foam, provider);
    })
  );
}

function createTextProvider(context: vscode.ExtensionContext): TextGenerationProvider {
  const cfg = vscode.workspace.getConfiguration('foam.ai.textGeneration');
  const providerName = cfg.get<string>('provider', 'ollama');

  if (providerName === 'openai') {
    const model = cfg.get<string>('openai.model', 'gpt-4o-mini');
    return new OpenAITextProvider(context.secrets, { model });
  }

  // Padrão: Ollama
  const url = cfg.get<string>('ollama.url', 'http://localhost:11434');
  const model = cfg.get<string>('ollama.model', 'llama3');
  return new OllamaTextProvider({ url, model });
}
