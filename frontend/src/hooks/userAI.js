import { useState } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export const useAI = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message, projectId = null) => {
    setIsLoading(true);
    try {
      let response;
      
      if (projectId) {
        response = await api.post(`/ai/chat/project/${projectId}`, {
          question: message
        });
      } else {
        response = await api.post('/ai/chat', {
          message: message
        });
      }

      if (response.data.success) {
        return {
          success: true,
          response: response.data.data.ai_response,
          metadata: {
            model: response.data.data.model,
            used_knowledge: response.data.data.used_knowledge,
            sources: response.data.data.sources,
            from_cache: response.data.data.from_cache,
            response_time: response.data.data.response_time_ms
          }
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error en AI chat:', error);
      toast.error('Error comunicándose con el asistente IA');
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  const checkAIHealth = async () => {
    try {
      const response = await api.get('/ai/health');
      return response.data;
    } catch (error) {
      console.error('Error verificando estado de IA:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    sendMessage,
    checkAIHealth,
    isLoading
  };
};