/**
 * Interface para provedores de geração de texto via LLM
 */
export interface TextGenerationProvider {
  /**
   * Gera uma resposta a partir de um prompt de sistema e um prompt do usuário
   */
  generate(systemPrompt: string, userPrompt: string): Promise<string>;

  /**
   * Verifica se o provedor está disponível
   */
  isAvailable(): Promise<boolean>;
}
