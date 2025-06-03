const { Ollama } = require('ollama');
const knowledgeService = require('./knowledgeService');

class OllamaService {
  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
    this.model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    this.enabled = process.env.OLLAMA_ENABLED === 'true';
    
    // ← CACHE DE RESPUESTAS
    this.responseCache = new Map();
    this.maxCacheSize = 100;
    
    this.initializeKnowledge();
  }

  async initializeKnowledge() {
    try {
      await knowledgeService.loadKnowledgeBase();
      console.log('🧠 Base de conocimiento inicializada');
    } catch (error) {
      console.error('❌ Error inicializando base de conocimiento:', error);
    }
  }

  async verifyConnection() {
    if (!this.enabled) {
      return { connected: false, reason: 'Ollama deshabilitado' };
    }

    try {
      const models = await this.ollama.list();
      const modelExists = models.models.some(m => m.name === this.model);
      
      if (!modelExists) {
        return { connected: false, reason: `Modelo ${this.model} no encontrado` };
      }

      return { connected: true, model: this.model };
    } catch (error) {
      return { connected: false, reason: error.message };
    }
  }

  // ← FUNCIÓN PARA GENERAR CLAVE DE CACHE
  getCacheKey(prompt) {
    const normalized = prompt.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized.substring(0, 100); // Limitar longitud de clave
  }

  addToCache(key, response) {
    // Limpiar cache si está lleno
    if (this.responseCache.size >= this.maxCacheSize) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
    
    // Solo cachear respuestas exitosas
    if (response.success) {
      this.responseCache.set(key, {
        ...response,
        cached_at: new Date().toISOString()
      });
      console.log(`💾 Respuesta cacheada: ${key.substring(0, 30)}...`);
    }
  }

  clearCache() {
    this.responseCache.clear();
    console.log('🗑️ Cache de respuestas limpiado');
  }

  async generateResponse(prompt, context = '') {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Asistente IA no disponible'
      };
    }

    // ← VERIFICAR CACHE PRIMERO
    const cacheKey = this.getCacheKey(prompt);
    if (this.responseCache.has(cacheKey)) {
      console.log('🚀 Respuesta desde cache');
      const cached = this.responseCache.get(cacheKey);
      return {
        ...cached,
        from_cache: true,
        timestamp: new Date().toISOString()
      };
    }

    try {
      const startTime = Date.now();
      console.log(`🤖 Generando respuesta para: "${prompt.substring(0, 50)}..."`);

      // Buscar información relevante en la base de conocimiento
      const knowledgeContext = knowledgeService.getKnowledgeContext(prompt);
      
      // ← PROMPT MÁS CORTO Y DIRECTO
      const systemPrompt = `Eres un asistente del sistema UC. Responde de forma CONCISA y DIRECTA (máximo 3 párrafos).

${knowledgeContext ? `DOCUMENTACIÓN:\n${knowledgeContext.substring(0, 800)}` : ''}
${context ? `CONTEXTO:\n${context.substring(0, 400)}` : ''}

Responde basándote en la documentación oficial cuando esté disponible.`;

      const response = await this.ollama.chat({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        // ← PARÁMETROS DE VELOCIDAD
        options: {
          temperature: 0.3,
          top_p: 0.9,
          top_k: 20,
          repeat_penalty: 1.1,
          num_ctx: 2048,
          num_predict: 200,
          num_thread: 4
        }
      });

      const responseTime = Date.now() - startTime;
      console.log(`⚡ Respuesta generada en ${responseTime}ms`);

      const result = {
        success: true,
        response: response.message.content,
        model: this.model,
        used_knowledge: knowledgeContext.length > 0,
        sources: knowledgeContext ? 'Documentación oficial' : 'Conocimiento general',
        from_cache: false,
        response_time_ms: responseTime
      };

      // ← GUARDAR EN CACHE
      this.addToCache(cacheKey, result);
      
      return result;

    } catch (error) {
      console.error('Error generando respuesta con Ollama:', error);
      return {
        success: false,
        message: 'Error procesando tu consulta. Intenta de nuevo.',
        error: error.message
      };
    }
  }

  async getProjectHelp(projectData, question) {
    const context = `
    Proyecto: ${projectData.code} - ${projectData.title}
    Estado: ${projectData.status}
    Etapa: ${projectData.current_stage}
    Documentos: ${projectData.document_count || 0}
    `;

    return await this.generateResponse(question, context);
  }

  async getRequirementHelp(requirement, question) {
    const context = `
    Requerimiento: ${requirement.requirement_name}
    Etapa: ${requirement.stage_name}
    Estado: ${requirement.status}
    Documento: ${requirement.has_current_document ? 'Sí' : 'No'}
    Comentarios: ${requirement.admin_comments || 'Ninguno'}
    `;

    return await this.generateResponse(question, context);
  }
}

// Exportar instancia singleton
const ollamaService = new OllamaService();
module.exports = ollamaService;