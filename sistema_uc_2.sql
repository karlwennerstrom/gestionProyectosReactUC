-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 02-06-2025 a las 23:02:22
-- Versión del servidor: 11.4.2-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sistema_uc`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `GenerateFinalReport` (IN `p_project_id` INT, IN `p_generated_by` INT)   BEGIN
    DECLARE report_data JSON;
    
    -- Generar datos del informe (simplificado por compatibilidad)
    SELECT CONCAT('{"project_id":', p_project_id, ',"generated_at":"', NOW(), '"}') INTO report_data;
    
    -- Insertar informe
    INSERT INTO project_reports (project_id, generated_by, report_data)
    VALUES (p_project_id, p_generated_by, report_data);
    
    -- Marcar proyecto como con informe generado
    UPDATE projects SET final_report_generated = TRUE WHERE id = p_project_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `UpdateProjectCurrentStage` (IN `p_project_id` INT)   BEGIN
    DECLARE next_stage_name VARCHAR(50);
    DECLARE all_stages_completed BOOLEAN DEFAULT FALSE;
    
    -- Encontrar la primera etapa no completada
    SELECT stage_name INTO next_stage_name
    FROM project_stages 
    WHERE project_id = p_project_id AND status != 'completed'
    ORDER BY 
        CASE stage_name 
            WHEN 'formalization' THEN 1
            WHEN 'design' THEN 2
            WHEN 'delivery' THEN 3
            WHEN 'operation' THEN 4
            WHEN 'maintenance' THEN 5
        END
    LIMIT 1;
    
    -- Si todas las etapas están completadas
    IF next_stage_name IS NULL THEN
        SET all_stages_completed = TRUE;
        SET next_stage_name = 'maintenance'; -- Mantener en la última etapa
    END IF;
    
    -- Actualizar current_stage del proyecto
    UPDATE projects 
    SET 
        current_stage = next_stage_name,
        status = CASE WHEN all_stages_completed THEN 'approved' ELSE status END
    WHERE id = p_project_id;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `stage_name` enum('formalization','design','delivery','operation','maintenance') NOT NULL,
  `requirement_id` varchar(100) NOT NULL,
  `version` int(11) DEFAULT 1 COMMENT 'Versión del documento para este requerimiento',
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `is_current` tinyint(1) DEFAULT 1 COMMENT 'TRUE = versión actual, FALSE = versión anterior',
  `upload_reason` enum('initial','update','correction') DEFAULT 'initial',
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `documents`
--

INSERT INTO `documents` (`id`, `project_id`, `stage_name`, `requirement_id`, `version`, `file_name`, `original_name`, `file_path`, `file_size`, `mime_type`, `is_current`, `upload_reason`, `uploaded_by`, `uploaded_at`) VALUES
(1, 1, 'formalization', 'ficha_formalizacion', 1, '986bc4c5-0ff4-47fd-a197-e3da44e1faca.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\986bc4c5-0ff4-47fd-a197-e3da44e1faca.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 13:22:45'),
(2, 1, 'design', 'requerimientos_tecnicos', 1, 'ffb0b235-8934-4518-84f9-c69b12e25049.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\ffb0b235-8934-4518-84f9-c69b12e25049.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 13:23:39'),
(3, 1, 'design', 'especificacion_funcional', 1, '273b31c3-2c3c-49ac-a72c-374bb44959be.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\273b31c3-2c3c-49ac-a72c-374bb44959be.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 13:27:33'),
(4, 1, 'design', 'aprobacion_diseno_go', 1, 'bdb41137-91f4-454d-93c0-b38980c4a166.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\bdb41137-91f4-454d-93c0-b38980c4a166.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 13:27:45'),
(5, 6, 'formalization', 'ficha_formalizacion', 1, '9adeaa85-6cab-4c92-8655-7ad23b74cc11.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\9adeaa85-6cab-4c92-8655-7ad23b74cc11.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 14:29:38'),
(6, 6, 'design', 'requerimientos_tecnicos', 1, '51797f09-815f-4d51-9b8d-41a72f4715a3.pdf', 'CAS - Crear servicio con protocolo SAML 2.0 .pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\51797f09-815f-4d51-9b8d-41a72f4715a3.pdf', 1120480, 'application/pdf', 1, 'initial', 2, '2025-06-02 14:29:58'),
(8, 6, 'formalization', 'aprobacion_go', 1, '99343c66-e498-4e5c-bea7-06054d65d06c.pdf', 'CAS - Crear servicio con protocolo SAML 2.0 .pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\99343c66-e498-4e5c-bea7-06054d65d06c.pdf', 1120480, 'application/pdf', 1, 'initial', 2, '2025-06-02 14:50:55'),
(9, 6, 'formalization', 'codigo_proyecto', 1, '45890cbe-fb3c-4508-ab56-5ef019db3402.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\45890cbe-fb3c-4508-ab56-5ef019db3402.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 14:51:13'),
(10, 6, 'formalization', 'presupuesto_validado', 1, '05bcd0d0-c46a-4d22-b21d-04285b693dcb.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\05bcd0d0-c46a-4d22-b21d-04285b693dcb.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 14:52:02'),
(11, 6, 'delivery', 'solicitud_ambientes', 1, '2137c52b-3f87-4ea6-8049-127558972708.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\2137c52b-3f87-4ea6-8049-127558972708.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 14:56:02'),
(12, 6, 'operation', 'documentacion_soporte', 1, 'b5db06aa-bf83-4e31-8d42-51c2d5c2433c.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\b5db06aa-bf83-4e31-8d42-51c2d5c2433c.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 14:56:10'),
(13, 6, 'maintenance', 'backlog_pendientes', 1, '01ef3700-f0dc-47ed-b4ed-f411d463b49d.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\01ef3700-f0dc-47ed-b4ed-f411d463b49d.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 14:56:20'),
(14, 3, 'formalization', 'ficha_formalizacion', 1, '6a27d954-be55-4898-987b-ebf86f351793.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\6a27d954-be55-4898-987b-ebf86f351793.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 15:16:53'),
(15, 3, 'formalization', 'aprobacion_go', 1, 'ac1ea295-fd90-47fb-939f-375d5fbc19b3.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\ac1ea295-fd90-47fb-939f-375d5fbc19b3.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 15:17:27'),
(16, 3, 'formalization', 'codigo_proyecto', 1, 'eee074a7-7774-4e06-bb3c-85a4903c8f6f.pdf', 'CAS Oauth 2.0 Crear servicio.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\eee074a7-7774-4e06-bb3c-85a4903c8f6f.pdf', 1945943, 'application/pdf', 1, 'initial', 2, '2025-06-02 15:17:36'),
(17, 3, 'formalization', 'presupuesto_validado', 1, 'b8619f3f-1587-45b6-a6e9-c19756615d52.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\b8619f3f-1587-45b6-a6e9-c19756615d52.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 15:17:47'),
(18, 1, 'delivery', 'solicitud_ambientes', 1, '95d1f083-ccd2-49b6-8bcd-fbff031da0bf.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\95d1f083-ccd2-49b6-8bcd-fbff031da0bf.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 15:19:21'),
(19, 7, 'formalization', 'ficha_formalizacion', 1, 'b87c433b-e09f-4778-af68-d24b11d2d5ef.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\b87c433b-e09f-4778-af68-d24b11d2d5ef.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 15:51:35'),
(20, 7, 'formalization', 'codigo_proyecto', 1, '2451992b-8f4f-43cf-ac19-f23db6636510.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\2451992b-8f4f-43cf-ac19-f23db6636510.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 15:52:13'),
(21, 8, 'formalization', 'ficha_formalizacion', 1, '2d0489cd-c61d-4252-bfbb-d3a5b3401519.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\2d0489cd-c61d-4252-bfbb-d3a5b3401519.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 19:04:28'),
(22, 8, 'formalization', 'aprobacion_go', 1, '29ac4d07-2416-4a36-b5a1-971bc8af45d0.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\29ac4d07-2416-4a36-b5a1-971bc8af45d0.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 19:58:37'),
(23, 8, 'formalization', 'codigo_proyecto', 1, 'b8a15d22-1396-4c04-b33a-b14d7e838365.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\b8a15d22-1396-4c04-b33a-b14d7e838365.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 19:59:13'),
(24, 8, 'design', 'requerimientos_tecnicos', 1, '8d56d0ce-d11f-429c-9d6b-a6fd0d310ffc.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\8d56d0ce-d11f-429c-9d6b-a6fd0d310ffc.pdf', 1220905, 'application/pdf', 1, 'initial', 2, '2025-06-02 20:00:48');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('pending','in-progress','approved','rejected') DEFAULT 'pending',
  `current_stage` enum('formalization','design','delivery','operation','maintenance') DEFAULT 'formalization',
  `final_report_generated` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `projects`
--

INSERT INTO `projects` (`id`, `code`, `title`, `description`, `user_id`, `status`, `current_stage`, `final_report_generated`, `created_at`, `updated_at`) VALUES
(1, 'PROJ-2025-001', 'Sistema de Gestión Académica', 'Desarrollo de plataforma integral para gestión de estudiantes, cursos y calificaciones. Incluye módulos de matrícula, seguimiento académico y reportes administrativos.', 2, 'in-progress', 'operation', 0, '2025-06-02 12:49:21', '2025-06-02 15:20:16'),
(2, 'PROJ-2025-002', 'Portal Web Institucional', 'Rediseño completo del sitio web oficial de la universidad con enfoque en experiencia de usuario y accesibilidad. Incluye CMS y sistema de noticias.', 3, 'pending', 'formalization', 0, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(3, 'PROJ-2025-003', 'App Móvil Estudiantil', 'Aplicación móvil para estudiantes con acceso a horarios, calificaciones, biblioteca digital y servicios campus. Disponible para iOS y Android.', 2, 'approved', 'maintenance', 0, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(4, 'PROJ-2025-004', 'Sistema de Biblioteca Digital', 'Plataforma digital para gestión de recursos bibliográficos, préstamos, reservas y acceso a contenido electrónico. Integración con catálogo mundial.', 4, 'rejected', 'formalization', 0, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(5, 'PROJ-2025-005', 'Plataforma E-Learning', 'Sistema completo de educación en línea con aulas virtuales, evaluaciones automáticas, foros de discusión y seguimiento de progreso estudiantil.', 3, 'in-progress', 'delivery', 0, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(6, 'PROJ-2025-006', 'Proyecto de prueba', 'descripción', 2, 'pending', 'maintenance', 0, '2025-06-02 13:33:29', '2025-06-02 14:57:08'),
(7, 'PROJ-2025-007', 'Proyecto de Luis', 'Este proyecto es de Luis', 2, 'pending', 'design', 0, '2025-06-02 15:50:19', '2025-06-02 15:54:00'),
(8, 'PROJ-2025-008', 'proyecto nuevo de prueba', 'es un proyecto de prueba', 2, 'pending', 'delivery', 0, '2025-06-02 18:29:52', '2025-06-02 20:01:42');

--
-- Disparadores `projects`
--
DELIMITER $$
CREATE TRIGGER `tr_create_requirement_validations` AFTER INSERT ON `projects` FOR EACH ROW BEGIN
    -- Crear validaciones para etapa de formalización
    INSERT INTO requirement_validations (project_id, stage_name, requirement_id, requirement_name) VALUES
    (NEW.id, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto'),
    (NEW.id, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)'),
    (NEW.id, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado'),
    (NEW.id, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado'),
    
    -- Crear validaciones para etapa de diseño
    (NEW.id, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales'),
    (NEW.id, 'design', 'especificacion_funcional', 'Documento de especificación funcional'),
    (NEW.id, 'design', 'planificacion_definitiva', 'Planificación Definitiva'),
    (NEW.id, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura'),
    (NEW.id, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura'),
    (NEW.id, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)'),
    
    -- Crear validaciones para etapa de entrega
    (NEW.id, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes'),
    (NEW.id, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas'),
    (NEW.id, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos'),
    (NEW.id, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)'),
    (NEW.id, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)'),
    
    -- Crear validaciones para etapa de operación
    (NEW.id, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios'),
    (NEW.id, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación'),
    (NEW.id, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas'),
    (NEW.id, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción'),
    (NEW.id, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda'),
    (NEW.id, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones'),
    (NEW.id, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital'),
    
    -- Crear validaciones para etapa de mantenimiento
    (NEW.id, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes'),
    (NEW.id, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto'),
    (NEW.id, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)'),
    (NEW.id, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación'),
    (NEW.id, 'maintenance', 'documentacion_cierre', 'Documentación de cierre'),
    (NEW.id, 'maintenance', 'tareas_operacion', 'Tareas de Operación');
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `project_reports`
--

CREATE TABLE `project_reports` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `report_type` enum('final','stage','partial') DEFAULT 'final',
  `generated_by` int(11) NOT NULL,
  `report_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Datos del informe en formato JSON' CHECK (json_valid(`report_data`)),
  `file_path` varchar(500) DEFAULT NULL COMMENT 'Ruta del archivo PDF generado',
  `generated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `project_stages`
--

CREATE TABLE `project_stages` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `stage_name` enum('formalization','design','delivery','operation','maintenance') NOT NULL,
  `status` enum('pending','in-progress','completed','rejected') DEFAULT 'pending',
  `admin_comments` text DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `project_stages`
--

INSERT INTO `project_stages` (`id`, `project_id`, `stage_name`, `status`, `admin_comments`, `completed_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'formalization', 'completed', 'Proyecto aprobado para continuar. Documentación completa y presupuesto validado.', '2025-01-15 13:30:00', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(2, 1, 'design', 'completed', 'Se aprueba sin comentarios', '2025-06-02 13:30:44', '2025-06-02 12:49:21', '2025-06-02 13:30:44'),
(3, 1, 'delivery', 'completed', 'todo ok', '2025-06-02 15:20:16', '2025-06-02 12:49:21', '2025-06-02 15:20:16'),
(4, 1, 'operation', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(5, 1, 'maintenance', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(6, 2, 'formalization', 'in-progress', 'Documentos subidos - Enviado a revisión', NULL, '2025-06-02 12:49:21', '2025-06-02 14:35:29'),
(7, 2, 'design', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(8, 2, 'delivery', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(9, 2, 'operation', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(10, 2, 'maintenance', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(11, 3, 'formalization', 'completed', 'Aprobado sin observaciones.', '2024-10-01 12:00:00', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(12, 3, 'design', 'completed', 'Diseño UX/UI aprobado. Arquitectura técnica validada.', '2024-11-15 17:20:00', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(13, 3, 'delivery', 'completed', 'Entrega satisfactoria. Pruebas superadas exitosamente.', '2024-12-20 19:45:00', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(14, 3, 'operation', 'completed', 'Puesta en producción exitosa. Capacitaciones completadas.', '2025-01-10 14:15:00', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(15, 3, 'maintenance', 'completed', 'Proyecto cerrado satisfactoriamente. Documentación entregada.', '2025-01-25 16:30:00', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(16, 4, 'formalization', 'rejected', 'Presupuesto insuficiente. Revisar alcance del proyecto y resubmitir documentación financiera.', NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(17, 4, 'design', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(18, 4, 'delivery', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(19, 4, 'operation', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(20, 4, 'maintenance', 'pending', NULL, NULL, '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(21, 6, 'formalization', 'completed', 'ser aprueba sin detalles', '2025-06-02 14:31:08', '2025-06-02 13:33:29', '2025-06-02 14:31:08'),
(22, 6, 'design', 'completed', 'se aprueba sin comentarios.', '2025-06-02 14:54:40', '2025-06-02 13:33:29', '2025-06-02 14:54:40'),
(23, 6, 'delivery', 'completed', 'Etapa Entrega y Configuración aprobada', '2025-06-02 14:56:59', '2025-06-02 13:33:29', '2025-06-02 14:56:59'),
(24, 6, 'operation', 'completed', 'Etapa Aceptación Operacional aprobada', '2025-06-02 14:57:04', '2025-06-02 13:33:29', '2025-06-02 14:57:04'),
(25, 6, 'maintenance', 'completed', 'Etapa Operación y Mantenimiento aprobada', '2025-06-02 14:57:08', '2025-06-02 13:33:29', '2025-06-02 14:57:08'),
(26, 7, 'formalization', 'completed', 'Aprobado sin ningún comentario adicional.', '2025-06-02 15:54:00', '2025-06-02 15:50:19', '2025-06-02 15:54:00'),
(27, 7, 'design', 'pending', NULL, NULL, '2025-06-02 15:50:19', '2025-06-02 15:50:19'),
(28, 7, 'delivery', 'pending', NULL, NULL, '2025-06-02 15:50:19', '2025-06-02 15:50:19'),
(29, 7, 'operation', 'pending', NULL, NULL, '2025-06-02 15:50:19', '2025-06-02 15:50:19'),
(30, 7, 'maintenance', 'pending', NULL, NULL, '2025-06-02 15:50:19', '2025-06-02 15:50:19'),
(31, 8, 'formalization', 'completed', 'aprobado', '2025-06-02 19:18:53', '2025-06-02 18:29:52', '2025-06-02 19:18:53'),
(32, 8, 'design', 'completed', 'se reciben todos los documentos ok', '2025-06-02 20:01:42', '2025-06-02 18:29:52', '2025-06-02 20:01:42'),
(33, 8, 'delivery', 'pending', NULL, NULL, '2025-06-02 18:29:52', '2025-06-02 18:29:52'),
(34, 8, 'operation', 'pending', NULL, NULL, '2025-06-02 18:29:52', '2025-06-02 18:29:52'),
(35, 8, 'maintenance', 'pending', NULL, NULL, '2025-06-02 18:29:52', '2025-06-02 18:29:52');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `requirement_history`
--

CREATE TABLE `requirement_history` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `stage_name` enum('formalization','design','delivery','operation','maintenance') NOT NULL,
  `requirement_id` varchar(100) NOT NULL,
  `old_status` enum('pending','in-review','approved','rejected') DEFAULT NULL,
  `new_status` enum('pending','in-review','approved','rejected') NOT NULL,
  `admin_comments` text DEFAULT NULL,
  `changed_by` int(11) NOT NULL,
  `changed_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `requirement_validations`
--

CREATE TABLE `requirement_validations` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `stage_name` enum('formalization','design','delivery','operation','maintenance') NOT NULL,
  `requirement_id` varchar(100) NOT NULL,
  `requirement_name` varchar(255) NOT NULL,
  `status` enum('pending','in-review','approved','rejected') DEFAULT 'pending',
  `admin_comments` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `requirement_validations`
--

INSERT INTO `requirement_validations` (`id`, `project_id`, `stage_name`, `requirement_id`, `requirement_name`, `status`, `admin_comments`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(2, 1, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(3, 1, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(4, 1, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(5, 1, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(6, 1, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(7, 1, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(8, 1, 'design', 'especificacion_funcional', 'Documento de especificación funcional', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(9, 1, 'design', 'planificacion_definitiva', 'Planificación Definitiva', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(10, 1, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(11, 1, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(12, 1, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(13, 1, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(14, 1, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(15, 1, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(16, 1, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(17, 1, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(18, 1, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(19, 1, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(20, 1, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(21, 1, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(22, 1, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(23, 1, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(24, 1, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(25, 1, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(26, 1, 'maintenance', 'documentacion_cierre', 'Documentación de cierre', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(27, 1, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(28, 1, 'maintenance', 'tareas_operacion', 'Tareas de Operación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(29, 2, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(30, 2, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(31, 2, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(32, 2, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(33, 2, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(34, 2, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(35, 2, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(36, 2, 'design', 'especificacion_funcional', 'Documento de especificación funcional', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(37, 2, 'design', 'planificacion_definitiva', 'Planificación Definitiva', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(38, 2, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(39, 2, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(40, 2, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(41, 2, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(42, 2, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(43, 2, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(44, 2, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(45, 2, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(46, 2, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(47, 2, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(48, 2, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(49, 2, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(50, 2, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(51, 2, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(52, 2, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(53, 2, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(54, 2, 'maintenance', 'documentacion_cierre', 'Documentación de cierre', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(55, 2, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(56, 2, 'maintenance', 'tareas_operacion', 'Tareas de Operación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(57, 3, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(58, 3, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(59, 3, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(60, 3, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(61, 3, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(62, 3, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(63, 3, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(64, 3, 'design', 'especificacion_funcional', 'Documento de especificación funcional', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(65, 3, 'design', 'planificacion_definitiva', 'Planificación Definitiva', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(66, 3, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(67, 3, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(68, 3, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(69, 3, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(70, 3, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(71, 3, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(72, 3, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(73, 3, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(74, 3, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(75, 3, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(76, 3, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(77, 3, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(78, 3, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(79, 3, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(80, 3, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(81, 3, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(82, 3, 'maintenance', 'documentacion_cierre', 'Documentación de cierre', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(83, 3, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(84, 3, 'maintenance', 'tareas_operacion', 'Tareas de Operación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(85, 4, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(86, 4, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(87, 4, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(88, 4, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(89, 4, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(90, 4, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(91, 4, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(92, 4, 'design', 'especificacion_funcional', 'Documento de especificación funcional', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(93, 4, 'design', 'planificacion_definitiva', 'Planificación Definitiva', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(94, 4, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(95, 4, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(96, 4, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(97, 4, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(98, 4, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(99, 4, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(100, 4, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(101, 4, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(102, 4, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(103, 4, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(104, 4, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(105, 4, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(106, 4, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(107, 4, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(108, 4, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(109, 4, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(110, 4, 'maintenance', 'documentacion_cierre', 'Documentación de cierre', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(111, 4, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(112, 4, 'maintenance', 'tareas_operacion', 'Tareas de Operación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(113, 5, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(114, 5, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(115, 5, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(116, 5, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(117, 5, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(118, 5, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(119, 5, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(120, 5, 'design', 'especificacion_funcional', 'Documento de especificación funcional', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(121, 5, 'design', 'planificacion_definitiva', 'Planificación Definitiva', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(122, 5, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(123, 5, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(124, 5, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(125, 5, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(126, 5, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(127, 5, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(128, 5, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(129, 5, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(130, 5, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(131, 5, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(132, 5, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(133, 5, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(134, 5, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(135, 5, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(136, 5, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(137, 5, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(138, 5, 'maintenance', 'documentacion_cierre', 'Documentación de cierre', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(139, 5, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(140, 5, 'maintenance', 'tareas_operacion', 'Tareas de Operación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(141, 6, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(142, 6, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(143, 6, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(144, 6, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(145, 6, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(146, 6, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(147, 6, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(148, 6, 'design', 'especificacion_funcional', 'Documento de especificación funcional', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(149, 6, 'design', 'planificacion_definitiva', 'Planificación Definitiva', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(150, 6, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(151, 6, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(152, 6, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(153, 6, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(154, 6, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(155, 6, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(156, 6, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(157, 6, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(158, 6, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(159, 6, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(160, 6, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(161, 6, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(162, 6, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(163, 6, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(164, 6, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(165, 6, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(166, 6, 'maintenance', 'documentacion_cierre', 'Documentación de cierre', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(167, 6, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(168, 6, 'maintenance', 'tareas_operacion', 'Tareas de Operación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(169, 7, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(170, 7, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(171, 7, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(172, 7, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(173, 7, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(174, 7, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(175, 7, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(176, 7, 'design', 'especificacion_funcional', 'Documento de especificación funcional', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(177, 7, 'design', 'planificacion_definitiva', 'Planificación Definitiva', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(178, 7, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(179, 7, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(180, 7, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(181, 7, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(182, 7, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(183, 7, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(184, 7, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(185, 7, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(186, 7, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(187, 7, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(188, 7, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(189, 7, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(190, 7, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(191, 7, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(192, 7, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(193, 7, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(194, 7, 'maintenance', 'documentacion_cierre', 'Documentación de cierre', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(195, 7, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(196, 7, 'maintenance', 'tareas_operacion', 'Tareas de Operación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(197, 8, 'formalization', 'aprobacion_go', 'Aprobación de Formalización (GO)', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(198, 8, 'formalization', 'codigo_proyecto', 'Código de proyecto asignado', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(199, 8, 'formalization', 'ficha_formalizacion', 'Ficha Formalización de Proyecto', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(200, 8, 'formalization', 'presupuesto_validado', 'Presupuesto y Operación validado', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(201, 8, 'design', 'aprobacion_arquitectura', 'Aprobación de Arquitectura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(202, 8, 'design', 'aprobacion_diseno_go', 'Aprobación de Diseño (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(203, 8, 'design', 'aprobacion_infraestructura', 'Aprobación de Infraestructura', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(204, 8, 'design', 'especificacion_funcional', 'Documento de especificación funcional', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(205, 8, 'design', 'planificacion_definitiva', 'Planificación Definitiva', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(206, 8, 'design', 'requerimientos_tecnicos', 'Requerimientos Técnicos y Operacionales', 'in-review', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(207, 8, 'delivery', 'aprobacion_ambientes', 'Aprobación de Ambientes (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(208, 8, 'delivery', 'diseno_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(209, 8, 'delivery', 'escenarios_prueba', 'Aprobación Escenarios de Prueba (JCPS)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(210, 8, 'delivery', 'politica_datos', 'Aprobación política tratamiento de datos', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(211, 8, 'delivery', 'solicitud_ambientes', 'Ficha Solicitud Creación de Ambientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(212, 8, 'operation', 'aprobacion_kit_digital', 'Aprobación uso Kit Digital', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(213, 8, 'operation', 'configuraciones_tecnicas', 'Documento configuraciones técnicas e instalación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(214, 8, 'operation', 'diseno_evidencia_pruebas', 'Documento de Diseño y evidencia de pruebas', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(215, 8, 'operation', 'documentacion_soporte', 'Documentación Soporte y Manual de Usuarios', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(216, 8, 'operation', 'evidencia_capacitaciones', 'Documento Evidencia de Capacitaciones', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(217, 8, 'operation', 'mesa_ayuda', 'Documentos Mesa de Ayuda', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(218, 8, 'operation', 'plan_produccion', 'Documento Plan de Puesta en Producción', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(219, 8, 'maintenance', 'aprobacion_cierre_go', 'Aprobación de Cierre (GO)', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(220, 8, 'maintenance', 'backlog_pendientes', 'Backlog Requerimientos Pendientes', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(221, 8, 'maintenance', 'cierre_proyecto', 'Cierre de Proyecto', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(222, 8, 'maintenance', 'documentacion_cierre', 'Documentación de cierre', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(223, 8, 'maintenance', 'pendientes_implementacion', 'Pendientes de Implementación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52'),
(224, 8, 'maintenance', 'tareas_operacion', 'Tareas de Operación', 'pending', NULL, NULL, NULL, '2025-06-02 20:58:52', '2025-06-02 20:58:52');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `full_name`, `role`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@universidad.cl', '$2a$10$z0OCKn0nUEvSmMu6RtjxzO8vqxHDJuXES5BD304ijirCMqI.F3ZWK', 'Administrador Sistema', 'admin', '2025-06-02 12:49:21', '2025-06-02 13:21:10'),
(2, 'jperez', 'juan.perez@universidad.cl', '$2a$10$z0OCKn0nUEvSmMu6RtjxzO8vqxHDJuXES5BD304ijirCMqI.F3ZWK', 'Juan Pérez Rodríguez', 'user', '2025-06-02 12:49:21', '2025-06-02 13:21:10'),
(3, 'mgarcia', 'maria.garcia@universidad.cl', '$2a$10$z0OCKn0nUEvSmMu6RtjxzO8vqxHDJuXES5BD304ijirCMqI.F3ZWK', 'María García Silva', 'user', '2025-06-02 12:49:21', '2025-06-02 13:21:10'),
(4, 'clopez', 'carlos.lopez@universidad.cl', '$2a$10$z0OCKn0nUEvSmMu6RtjxzO8vqxHDJuXES5BD304ijirCMqI.F3ZWK', 'Carlos López Morales', 'user', '2025-06-02 12:49:21', '2025-06-02 13:21:10');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `view_requirement_status`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `view_requirement_status` (
`project_id` int(11)
,`project_code` varchar(20)
,`project_title` varchar(200)
,`stage_name` enum('formalization','design','delivery','operation','maintenance')
,`requirement_id` varchar(100)
,`requirement_name` varchar(255)
,`status` enum('pending','in-review','approved','rejected')
,`admin_comments` text
,`reviewed_at` timestamp
,`has_document` int(1)
,`current_document` varchar(255)
,`document_uploaded_at` timestamp
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `view_stage_progress`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `view_stage_progress` (
`project_id` int(11)
,`project_code` varchar(20)
,`stage_name` enum('formalization','design','delivery','operation','maintenance')
,`stage_status` enum('pending','in-progress','completed','rejected')
,`total_requirements` bigint(21)
,`approved_requirements` decimal(22,0)
,`rejected_requirements` decimal(22,0)
,`in_review_requirements` decimal(22,0)
,`completion_percentage` decimal(28,2)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `view_requirement_status`
--
DROP TABLE IF EXISTS `view_requirement_status`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_requirement_status`  AS SELECT `p`.`id` AS `project_id`, `p`.`code` AS `project_code`, `p`.`title` AS `project_title`, `rv`.`stage_name` AS `stage_name`, `rv`.`requirement_id` AS `requirement_id`, `rv`.`requirement_name` AS `requirement_name`, `rv`.`status` AS `status`, `rv`.`admin_comments` AS `admin_comments`, `rv`.`reviewed_at` AS `reviewed_at`, CASE WHEN `d`.`id` is not null THEN 1 ELSE 0 END AS `has_document`, `d`.`original_name` AS `current_document`, `d`.`uploaded_at` AS `document_uploaded_at` FROM ((`projects` `p` join `requirement_validations` `rv` on(`p`.`id` = `rv`.`project_id`)) left join `documents` `d` on(`rv`.`project_id` = `d`.`project_id` and `rv`.`stage_name` = `d`.`stage_name` and `rv`.`requirement_id` = `d`.`requirement_id` and `d`.`is_current` = 1)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `view_stage_progress`
--
DROP TABLE IF EXISTS `view_stage_progress`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stage_progress`  AS SELECT `p`.`id` AS `project_id`, `p`.`code` AS `project_code`, `ps`.`stage_name` AS `stage_name`, `ps`.`status` AS `stage_status`, count(`rv`.`id`) AS `total_requirements`, sum(case when `rv`.`status` = 'approved' then 1 else 0 end) AS `approved_requirements`, sum(case when `rv`.`status` = 'rejected' then 1 else 0 end) AS `rejected_requirements`, sum(case when `rv`.`status` = 'in-review' then 1 else 0 end) AS `in_review_requirements`, round(sum(case when `rv`.`status` = 'approved' then 1 else 0 end) / count(`rv`.`id`) * 100,2) AS `completion_percentage` FROM ((`projects` `p` join `project_stages` `ps` on(`p`.`id` = `ps`.`project_id`)) join `requirement_validations` `rv` on(`p`.`id` = `rv`.`project_id` and `ps`.`stage_name` = `rv`.`stage_name`)) GROUP BY `p`.`id`, `ps`.`stage_name` ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_project_id` (`project_id`),
  ADD KEY `idx_stage_name` (`stage_name`),
  ADD KEY `idx_requirement_id` (`requirement_id`),
  ADD KEY `idx_uploaded_by` (`uploaded_by`),
  ADD KEY `idx_uploaded_at` (`uploaded_at`),
  ADD KEY `idx_project_stage_requirement` (`project_id`,`stage_name`,`requirement_id`),
  ADD KEY `idx_is_current` (`is_current`),
  ADD KEY `idx_version` (`project_id`,`stage_name`,`requirement_id`,`version`);

--
-- Indices de la tabla `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_current_stage` (`current_stage`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indices de la tabla `project_reports`
--
ALTER TABLE `project_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `generated_by` (`generated_by`),
  ADD KEY `idx_project_id` (`project_id`),
  ADD KEY `idx_report_type` (`report_type`),
  ADD KEY `idx_generated_at` (`generated_at`);

--
-- Indices de la tabla `project_stages`
--
ALTER TABLE `project_stages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_project_stage` (`project_id`,`stage_name`),
  ADD KEY `idx_project_id` (`project_id`),
  ADD KEY `idx_stage_name` (`stage_name`),
  ADD KEY `idx_status` (`status`);

--
-- Indices de la tabla `requirement_history`
--
ALTER TABLE `requirement_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_project_requirement` (`project_id`,`stage_name`,`requirement_id`),
  ADD KEY `idx_changed_by` (`changed_by`),
  ADD KEY `idx_changed_at` (`changed_at`);

--
-- Indices de la tabla `requirement_validations`
--
ALTER TABLE `requirement_validations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_requirement` (`project_id`,`stage_name`,`requirement_id`),
  ADD KEY `idx_project_id` (`project_id`),
  ADD KEY `idx_stage_name` (`stage_name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_reviewed_by` (`reviewed_by`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT de la tabla `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `project_reports`
--
ALTER TABLE `project_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `project_stages`
--
ALTER TABLE `project_stages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT de la tabla `requirement_history`
--
ALTER TABLE `requirement_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `requirement_validations`
--
ALTER TABLE `requirement_validations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=256;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `project_reports`
--
ALTER TABLE `project_reports`
  ADD CONSTRAINT `project_reports_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_reports_ibfk_2` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `project_stages`
--
ALTER TABLE `project_stages`
  ADD CONSTRAINT `project_stages_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `requirement_history`
--
ALTER TABLE `requirement_history`
  ADD CONSTRAINT `requirement_history_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `requirement_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `requirement_validations`
--
ALTER TABLE `requirement_validations`
  ADD CONSTRAINT `requirement_validations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `requirement_validations_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
