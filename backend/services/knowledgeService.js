const fs = require('fs').promises;
const path = require('path');

class KnowledgeService {
  constructor() {
    this.knowledgePath = path.join(__dirname, '../knowledge/documents');
    this.knowledgeBase = new Map();
    this.loaded = false;
  }

  async loadKnowledgeBase() {
    try {
      console.log('📚 Cargando base de conocimiento...');
      
      const files = await fs.readdir(this.knowledgePath);
      const mdFiles = files.filter(file => file.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(this.knowledgePath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Dividir en chunks para mejor manejo
        const chunks = this.splitIntoChunks(content, 1000);
        
        this.knowledgeBase.set(file, {
          filename: file,
          content: content,
          chunks: chunks,
          lastModified: new Date().toISOString()
        });
      }

      this.loaded = true;
      console.log(`✅ Base de conocimiento cargada: ${mdFiles.length} documentos`);
      
    } catch (error) {
      console.error('❌ Error cargando base de conocimiento:', error);
    }
  }

  splitIntoChunks(text, maxLength = 1000) {
    const chunks = [];
    const paragraphs = text.split('\n\n');
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  searchRelevantContent(query, limit = 2) {
    if (!this.loaded) {
      return [];
    }

    const results = [];
    const queryLower = query.toLowerCase();

    // Búsqueda simple por palabras clave
    for (const [filename, doc] of this.knowledgeBase) {
      for (let i = 0; i < doc.chunks.length; i++) {
        const chunk = doc.chunks[i];
        const chunkLower = chunk.toLowerCase();
        
        // Calcular relevancia basada en palabras clave
        const keywords = ['etapa', 'requerimiento', 'documento', 'formato', 'proceso'];
        let relevanceScore = 0;
        
        // Coincidencia exacta de palabras del query
        const queryWords = queryLower.split(/\s+/);
        for (const word of queryWords) {
          if (word.length > 3 && chunkLower.includes(word)) {
            relevanceScore += 2;
          }
        }
        
        // Bonus por palabras clave del dominio
        for (const keyword of keywords) {
          if (queryLower.includes(keyword) && chunkLower.includes(keyword)) {
            relevanceScore += 1;
          }
        }

        if (relevanceScore > 0) {
          results.push({
            filename: filename,
            chunk: chunk,
            score: relevanceScore,
            chunkIndex: i
          });
        }
      }
    }

    // Ordenar por relevancia y retornar top results
     return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(result => ({
      ...result,
      chunk: result.chunk.substring(0, 300) // ← MÁXIMO 300 caracteres
    }));
  }

  getKnowledgeContext(query) {
  const relevantChunks = this.searchRelevantContent(query, 2);
    
    if (relevantChunks.length === 0) {
      return '';
    }

      const context = relevantChunks
    .map(chunk => chunk.chunk)
    .join('\n---\n');

  return context.substring(0, 800); 
  }

  async addDocument(filename, content) {
    try {
      const filePath = path.join(this.knowledgePath, filename);
      await fs.writeFile(filePath, content, 'utf-8');
      
      // Recargar base de conocimiento
      await this.loadKnowledgeBase();
      
      console.log(`✅ Documento agregado: ${filename}`);
      return true;
    } catch (error) {
      console.error('❌ Error agregando documento:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
const knowledgeService = new KnowledgeService();
module.exports = knowledgeService;