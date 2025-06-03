const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const ollamaService = require('../services/ollamaService');
const Project = require('../models/Project');

const router = express.Router();

// Health check del servicio IA
router.get('/health', async (req, res) => {
  try {
    const status = await ollamaService.verifyConnection();
    
    res.json({
      success: true,
      ollama_status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verificando estado de Ollama',
      error: error.message
    });
  }
});

// Chat general
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mensaje requerido'
      });
    }

    const response = await ollamaService.generateResponse(message);

    res.json({
      success: true,
      data: {
        user_message: message,
        ai_response: response.response || response.message,
        model: response.model,
        used_knowledge: response.used_knowledge || false,
        sources: response.sources || 'Conocimiento general',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando mensaje'
    });
  }
});

// Chat específico sobre un proyecto
router.post('/chat/project/:project_id', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.params;
    const { question } = req.body;

    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Verificar permisos
    if (req.user.role !== 'admin' && project.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Sin permisos para este proyecto'
      });
    }

    const response = await ollamaService.getProjectHelp(project, question);

    res.json({
      success: true,
      data: {
        project: {
          id: project.id,
          code: project.code,
          title: project.title
        },
        question: question,
        ai_response: response.response || response.message,
        used_knowledge: response.used_knowledge || false,
        sources: response.sources || 'Conocimiento general',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en chat de proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando consulta del proyecto'
    });
  }
});
router.post('/cache/clear', authenticateToken, requireAdmin, async (req, res) => {
  ollamaService.clearCache();
  res.json({
    success: true,
    message: 'Cache limpiado'
  });
});
router.get('/stats', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      cache_size: ollamaService.responseCache.size,
      max_cache_size: ollamaService.maxCacheSize,
      model: ollamaService.model,
      enabled: ollamaService.enabled
    }
  });
});
// Obtener información de la base de conocimiento
router.get('/knowledge', authenticateToken, async (req, res) => {
  try {
    const knowledgeService = require('../services/knowledgeService');
    
    const info = {
      loaded: knowledgeService.loaded,
      documents: Array.from(knowledgeService.knowledgeBase.keys()),
      total_chunks: Array.from(knowledgeService.knowledgeBase.values())
        .reduce((sum, doc) => sum + doc.chunks.length, 0)
    };

    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información de base de conocimiento'
    });
  }
});

// Buscar en la base de conocimiento
router.post('/knowledge/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    const knowledgeService = require('../services/knowledgeService');
    
    const results = knowledgeService.searchRelevantContent(query, 5);
    
    res.json({
      success: true,
      data: {
        query: query,
        results: results,
        total_found: results.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error buscando en base de conocimiento'
    });
  }
});

// Agregar documento a la base de conocimiento (solo admin)
router.post('/knowledge/add', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { filename, content } = req.body;
    const knowledgeService = require('../services/knowledgeService');
    
    if (!filename.endsWith('.md')) {
      return res.status(400).json({
        success: false,
        message: 'Solo se aceptan archivos .md'
      });
    }

    const success = await knowledgeService.addDocument(filename, content);
    
    if (success) {
      res.json({
        success: true,
        message: 'Documento agregado a la base de conocimiento'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error agregando documento'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error procesando documento'
    });
  }
});

module.exports = router;