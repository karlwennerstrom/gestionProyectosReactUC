// backend/services/casService.js - VERSIÓN CORREGIDA
const axios = require('axios');
const xml2js = require('xml2js');
const User = require('../models/User');

class CASService {
  constructor() {
    this.casBaseUrl = process.env.CAS_BASE_URL || 'https://sso-lib.admin.uc.cl/cas';
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.casEnabled = process.env.CAS_ENABLED === 'true';
    
    console.log('🔧 CAS Service configurado:');
    console.log(`   - CAS Base URL: ${this.casBaseUrl}`);
    console.log(`   - Backend URL: ${this.backendUrl}`);
    console.log(`   - Frontend URL: ${this.frontendUrl}`);
    console.log(`   - CAS Enabled: ${this.casEnabled}`);
  }

  // ✅ CORREGIDO: Service URL siempre apunta al BACKEND callback
  getServiceUrl(returnUrl = '/dashboard') {
    return `${this.backendUrl}/api/cas/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  // ✅ CORREGIDO: Login URL usa service URL del backend
  getLoginUrl(returnUrl = '/dashboard') {
    const serviceUrl = this.getServiceUrl(returnUrl);
    const loginUrl = `${this.casBaseUrl}/login?service=${encodeURIComponent(serviceUrl)}`;
    
    console.log('🔗 Generando URL de login CAS:');
    console.log(`   - Return URL: ${returnUrl}`);
    console.log(`   - Service URL: ${serviceUrl}`);
    console.log(`   - Login URL: ${loginUrl}`);
    
    return loginUrl;
  }

  // Generar URL de logout CAS
  getLogoutUrl() {
    const serviceUrl = `${this.frontendUrl}/login`;
    return `${this.casBaseUrl}/logout?service=${encodeURIComponent(serviceUrl)}`;
  }

  // ✅ Validar ticket CAS con logging mejorado
  async validateTicket(ticket, service) {
    try {
      console.log('🎫 Validando ticket CAS:');
      console.log(`   - Ticket: ${ticket.substring(0, 20)}...`);
      console.log(`   - Service: ${service}`);
      
      const validateUrl = `${this.casBaseUrl}/serviceValidate`;
      const params = {
        ticket: ticket,
        service: service
      };
      
      console.log(`🔄 Llamando a: ${validateUrl}`);
      console.log(`   - Parámetros:`, params);
      
      const response = await axios.get(validateUrl, {
        params: params,
        timeout: 10000
      });

      console.log('📡 Status Code:', response.status);
      console.log('📋 Respuesta CAS XML:');
      console.log(response.data);

      // Parsear respuesta XML
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      console.log('🔍 XML parseado:', JSON.stringify(result, null, 2));

      // Verificar si la validación fue exitosa
      if (result['cas:serviceResponse'] && result['cas:serviceResponse']['cas:authenticationSuccess']) {
        const authSuccess = result['cas:serviceResponse']['cas:authenticationSuccess'][0];
        const username = authSuccess['cas:user'][0];
        
        // Extraer atributos adicionales si están disponibles
        let attributes = {};
        if (authSuccess['cas:attributes']) {
          const casAttributes = authSuccess['cas:attributes'][0];
          
          // Mapear atributos comunes de CAS UC
          attributes = {
            email: casAttributes['cas:email'] ? casAttributes['cas:email'][0] : null,
            fullName: casAttributes['cas:nombre'] || casAttributes['cas:displayName'] || casAttributes['cas:cn'] ? 
              (casAttributes['cas:nombre'] || casAttributes['cas:displayName'] || casAttributes['cas:cn'])[0] : null,
            rut: casAttributes['cas:rut'] ? casAttributes['cas:rut'][0] : null,
            type: casAttributes['cas:tipo'] || casAttributes['cas:userType'] ? 
              (casAttributes['cas:tipo'] || casAttributes['cas:userType'])[0] : null,
            unit: casAttributes['cas:unidad'] || casAttributes['cas:ou'] ? 
              (casAttributes['cas:unidad'] || casAttributes['cas:ou'])[0] : null
          };
        }

        console.log('✅ Validación CAS exitosa:');
        console.log(`   - Username: ${username}`);
        console.log(`   - Attributes:`, attributes);

        return {
          success: true,
          username: username,
          attributes: attributes
        };
      } else if (result['cas:serviceResponse'] && result['cas:serviceResponse']['cas:authenticationFailure']) {
        const failure = result['cas:serviceResponse']['cas:authenticationFailure'][0];
        const code = failure.$.code;
        const message = failure._;
        
        console.error('❌ Validación CAS falló:');
        console.error(`   - Code: ${code}`);
        console.error(`   - Message: ${message}`);
        
        return {
          success: false,
          error: `CAS Authentication Failed: ${code} - ${message}`
        };
      } else {
        console.error('❌ Respuesta CAS inesperada:', result);
        return {
          success: false,
          error: 'Respuesta CAS inesperada'
        };
      }
    } catch (error) {
      console.error('❌ Error validando ticket CAS:', error);
      if (error.response) {
        console.error('   - Status:', error.response.status);
        console.error('   - Data:', error.response.data);
      }
      return {
        success: false,
        error: `Error de validación: ${error.message}`
      };
    }
  }

  // Buscar o crear usuario basado en datos CAS
  async findOrCreateUser(casData) {
    try {
      const { username, attributes } = casData;
      
      // Determinar email - priorizar atributo email, luego construir desde username
      let email = attributes.email;
      if (!email) {
        // Si no hay email en atributos, intentar construir desde username
        if (username.includes('@')) {
          email = username;
        } else {
          // Asumir dominio UC si no se especifica
          email = `${username}@uc.cl`;
        }
      }

      console.log('🔍 Buscando usuario con email:', email);

      // Buscar usuario por email
      let user = await User.findByEmail(email);
      
      if (user) {
        console.log('👤 Usuario encontrado en BD:', { id: user.id, email: user.email, role: user.role });
        return {
          success: true,
          user: user,
          isNewUser: false
        };
      }

      // Si no existe, determinar si debemos crear el usuario automáticamente
      if (process.env.CAS_AUTO_CREATE_USERS === 'true') {
        console.log('➕ Creando usuario automáticamente desde CAS');
        
        // Determinar rol basado en email o atributos
        const role = this.determineUserRole(email, attributes);
        
        // Crear usuario
        const newUser = await User.create({
          username: username,
          email: email,
          password: 'CAS_USER', // Contraseña placeholder para usuarios CAS
          full_name: attributes.fullName || username,
          role: role
        });

        console.log('✅ Usuario CAS creado:', { id: newUser.id, email: newUser.email, role: newUser.role });

        return {
          success: true,
          user: newUser,
          isNewUser: true
        };
      } else {
        // No crear usuarios automáticamente
        console.warn('⚠️ Usuario no encontrado y creación automática deshabilitada');
        return {
          success: false,
          error: 'Usuario no autorizado. Contacta al administrador para obtener acceso.',
          email: email
        };
      }
    } catch (error) {
      console.error('❌ Error buscando/creando usuario:', error);
      return {
        success: false,
        error: `Error procesando usuario: ${error.message}`
      };
    }
  }

  // Determinar rol del usuario basado en email o atributos
  determineUserRole(email, attributes) {
    // Lista de emails de administradores
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);
    
    console.log('🔍 Determinando rol para:', email);
    console.log('📋 Admin emails configurados:', adminEmails);
    
    // Verificar si está en la lista de admins
    if (adminEmails.includes(email)) {
      console.log('👨‍💼 Usuario identificado como admin por email');
      return 'admin';
    }

    // Verificar por dominio o tipo de usuario
    if (attributes.type) {
      const userType = attributes.type.toLowerCase();
      console.log('🏷️ Tipo de usuario CAS:', userType);
      
      if (userType.includes('admin') || userType.includes('staff') || userType.includes('funcionario')) {
        console.log('👨‍💼 Usuario identificado como admin por tipo');
        return 'admin';
      }
    }

    // Por defecto, rol de usuario
    console.log('👤 Usuario asignado como user por defecto');
    return 'user';
  }

  // Verificar si CAS está habilitado
  isEnabled() {
    return this.casEnabled;
  }
}

// Exportar instancia singleton
const casService = new CASService();
module.exports = casService;