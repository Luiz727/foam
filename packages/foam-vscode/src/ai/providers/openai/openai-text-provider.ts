import { TextGenerationProvider } from '../../services/text-generation-provider';
import { Logger } from '@foam/core';

export const OPENAI_SECRET_KEY = 'foam.openai.apiKey';

export interface SecretStorageLike {
  get(key: string): Thenable<string | undefined>;
}

export interface OpenAITextConfig {
  /** Modelo OpenAI a usar (padrão: gpt-4o-mini) */
  model: string;
  /** Timeout da requisição em milissegundos (padrão: 60000) */
  timeout: number;
}

export const DEFAULT_OPENAI_TEXT_CONFIG: OpenAITextConfig = {
  model: 'gpt-4o-mini',
  timeout: 60000,
};

/**
 * Provedor de geração de texto usando a API OpenAI.
 * A chave de API é lida do VS Code SecretStorage.
 */
export class OpenAITextProvider implements TextGenerationProvider {
  private config: OpenAITextConfig;
  private secrets: SecretStorageLike;

  constructor(secrets: SecretStorageLike, config: Partial<OpenAITextConfig> = {}) {
    this.secrets = secrets;
    this.config = { ...DEFAULT_OPENAI_TEXT_CONFIG, ...config };
  }

  private async getApiKey(): Promise<string> {
    const key = await this.secrets.get(OPENAI_SECRET_KEY);
    if (!key) {
      throw new Error(
        'Chave de API OpenAI não configurada. Use o comando "Foam: Configurar Chave OpenAI" para defini-la.'
      );
    }
    return key;
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = await this.getApiKey();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API OpenAI (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error(`Resposta inválida da API OpenAI: ${JSON.stringify(data)}`);
      }
      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('A API OpenAI demorou muito para responder.');
        }
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const key = await this.secrets.get(OPENAI_SECRET_KEY);
      return typeof key === 'string' && key.length > 0;
    } catch (error) {
      Logger.debug(
        `OpenAI não disponível: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return false;
    }
  }
}
