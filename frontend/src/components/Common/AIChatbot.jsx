import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { InlineSpinner } from './LoadingSpinner';
import toast from 'react-hot-toast';

const AIChatbot = ({ projectId = null, isMinimized = false, onToggle }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '¡Hola! Soy tu asistente del Sistema UC. ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(!isMinimized);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response;
      
      if (projectId) {
        // Chat específico del proyecto
        response = await api.post(`/ai/chat/project/${projectId}`, {
          question: userMessage.content
        });
      } else {
        // Chat general
        response = await api.post('/ai/chat', {
          message: userMessage.content
        });
      }

      if (response.data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: response.data.data.ai_response,
          timestamp: new Date().toISOString(),
          metadata: {
            model: response.data.data.model,
            used_knowledge: response.data.data.used_knowledge,
            sources: response.data.data.sources,
            from_cache: response.data.data.from_cache,
            response_time: response.data.data.response_time_ms
          }
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Error en el chatbot');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (onToggle) {
      onToggle(!isOpen);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: '¡Hola! Soy tu asistente del Sistema UC. ¿En qué puedo ayudarte?',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const suggestedQuestions = [
    '¿Qué documentos necesito para la etapa de formalización?',
    '¿Cómo corrijo un documento rechazado?',
    '¿Qué formatos de archivo puedo subir?',
    '¿Cómo veo el estado de mis requerimientos?'
  ];

  if (isMinimized) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center gap-2"
        title="Abrir asistente IA"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
        </svg>
        <span className="text-sm font-medium">Asistente IA</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50 transition-all ${
      isOpen ? 'w-96 h-[600px]' : 'w-80 h-16'
    }`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-sm">Asistente UC</h3>
            <p className="text-xs text-blue-100">
              {projectId ? 'Chat del proyecto' : 'Asistente general'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
            title="Limpiar chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          <button
            onClick={toggleChat}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
            title={isOpen ? 'Minimizar' : 'Maximizar'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M20 12H4" : "M12 4v16m8-8H4"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      {isOpen && (
        <>
          <div className="flex-1 overflow-y-auto p-4 h-[400px] bg-gray-50">
            {messages.map((message) => (
              <div key={message.id} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : message.isError 
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Metadata para mensajes de IA */}
                  {message.type === 'ai' && message.metadata && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                      <div className="flex items-center gap-2 flex-wrap">
                        {message.metadata.from_cache && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">⚡ Cache</span>
                        )}
                        {message.metadata.used_knowledge && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">📚 Docs</span>
                        )}
                        {message.metadata.response_time && (
                          <span className="text-gray-500">{message.metadata.response_time}ms</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs opacity-70 mt-1">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-block bg-white border border-gray-200 p-3 rounded-lg">
                  <InlineSpinner size="small" text="Pensando..." />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-white">
              <p className="text-xs text-gray-500 mb-2">Preguntas frecuentes:</p>
              <div className="space-y-1">
                {suggestedQuestions.slice(0, 2).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(question)}
                    className="w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                  >
                    💡 {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe tu pregunta..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default AIChatbot;