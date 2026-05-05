import { TextGenerationProvider } from '../../services/text-generation-provider';
import { Logger } from '@foam/core';
import { validateOllamaUrl } from './ollama-provider';

export interface OllamaTextConfig {
  /** Base URL para a API Ollama (padrão: http://localhost:11434) */
  url: string;
  /** Modelo a usar para geração de texto (padrão: llama3) */
  model: string;
  /** Timeout da requisição em milissegundos (padrão: 60000) */
  timeout: number;
}

export const DEFAULT_OLLAMA_TEXT_CONFIG: OllamaTextConfig = {
  url: 'http://localhost:11434',
  model: 'llama3',
  timeout: 60000,
};

/**
 * Provedor de geração de texto usando Ollama via /api/chat
 */
export class OllamaTextProvider implements TextGenerationProvider {
  private config: OllamaTextConfig;

  constructor(config: Partial<OllamaTextConfig> = {}) {
    this.config = { ...DEFAULT_OLLAMA_TEXT_CONFIG, ...config };
    validateOllamaUrl(this.config.url);
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no serviço de IA (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data?.message?.content;
      if (typeof content !== 'string') {
        throw new Error(`Resposta inválida do serviço de IA: ${JSON.stringify(data)}`);
      }
      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            'O serviço de IA demorou muito para responder. Verifique se o modelo está carregado.'
          );
        }
        if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            'Não foi possível conectar ao Ollama. Certifique-se de que o serviço está rodando.'
          );
        }
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.config.url}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      Logger.debug(
        `Ollama (texto) não disponível: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`
      );
      return false;
    }
  }
}
