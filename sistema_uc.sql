-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 02-06-2025 a las 19:46:10
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

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `stage_name` enum('formalization','design','delivery','operation','maintenance') NOT NULL,
  `requirement_id` varchar(100) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `documents`
--

INSERT INTO `documents` (`id`, `project_id`, `stage_name`, `requirement_id`, `file_name`, `original_name`, `file_path`, `file_size`, `mime_type`, `uploaded_by`, `uploaded_at`) VALUES
(1, 1, 'formalization', 'ficha_formalizacion', '986bc4c5-0ff4-47fd-a197-e3da44e1faca.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\986bc4c5-0ff4-47fd-a197-e3da44e1faca.pdf', 1220905, 'application/pdf', 2, '2025-06-02 13:22:45'),
(2, 1, 'design', 'requerimientos_tecnicos', 'ffb0b235-8934-4518-84f9-c69b12e25049.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\ffb0b235-8934-4518-84f9-c69b12e25049.pdf', 1220905, 'application/pdf', 2, '2025-06-02 13:23:39'),
(3, 1, 'design', 'especificacion_funcional', '273b31c3-2c3c-49ac-a72c-374bb44959be.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\273b31c3-2c3c-49ac-a72c-374bb44959be.pdf', 1220905, 'application/pdf', 2, '2025-06-02 13:27:33'),
(4, 1, 'design', 'aprobacion_diseno_go', 'bdb41137-91f4-454d-93c0-b38980c4a166.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\bdb41137-91f4-454d-93c0-b38980c4a166.pdf', 1220905, 'application/pdf', 2, '2025-06-02 13:27:45'),
(5, 6, 'formalization', 'ficha_formalizacion', '9adeaa85-6cab-4c92-8655-7ad23b74cc11.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\9adeaa85-6cab-4c92-8655-7ad23b74cc11.pdf', 1220905, 'application/pdf', 2, '2025-06-02 14:29:38'),
(6, 6, 'design', 'requerimientos_tecnicos', '51797f09-815f-4d51-9b8d-41a72f4715a3.pdf', 'CAS - Crear servicio con protocolo SAML 2.0 .pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\51797f09-815f-4d51-9b8d-41a72f4715a3.pdf', 1120480, 'application/pdf', 2, '2025-06-02 14:29:58'),
(8, 6, 'formalization', 'aprobacion_go', '99343c66-e498-4e5c-bea7-06054d65d06c.pdf', 'CAS - Crear servicio con protocolo SAML 2.0 .pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\99343c66-e498-4e5c-bea7-06054d65d06c.pdf', 1120480, 'application/pdf', 2, '2025-06-02 14:50:55'),
(9, 6, 'formalization', 'codigo_proyecto', '45890cbe-fb3c-4508-ab56-5ef019db3402.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\45890cbe-fb3c-4508-ab56-5ef019db3402.pdf', 1220905, 'application/pdf', 2, '2025-06-02 14:51:13'),
(10, 6, 'formalization', 'presupuesto_validado', '05bcd0d0-c46a-4d22-b21d-04285b693dcb.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\05bcd0d0-c46a-4d22-b21d-04285b693dcb.pdf', 1220905, 'application/pdf', 2, '2025-06-02 14:52:02'),
(11, 6, 'delivery', 'solicitud_ambientes', '2137c52b-3f87-4ea6-8049-127558972708.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\2137c52b-3f87-4ea6-8049-127558972708.pdf', 1220905, 'application/pdf', 2, '2025-06-02 14:56:02'),
(12, 6, 'operation', 'documentacion_soporte', 'b5db06aa-bf83-4e31-8d42-51c2d5c2433c.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\b5db06aa-bf83-4e31-8d42-51c2d5c2433c.pdf', 1220905, 'application/pdf', 2, '2025-06-02 14:56:10'),
(13, 6, 'maintenance', 'backlog_pendientes', '01ef3700-f0dc-47ed-b4ed-f411d463b49d.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\01ef3700-f0dc-47ed-b4ed-f411d463b49d.pdf', 1220905, 'application/pdf', 2, '2025-06-02 14:56:20'),
(14, 3, 'formalization', 'ficha_formalizacion', '6a27d954-be55-4898-987b-ebf86f351793.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\6a27d954-be55-4898-987b-ebf86f351793.pdf', 1220905, 'application/pdf', 2, '2025-06-02 15:16:53'),
(15, 3, 'formalization', 'aprobacion_go', 'ac1ea295-fd90-47fb-939f-375d5fbc19b3.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\ac1ea295-fd90-47fb-939f-375d5fbc19b3.pdf', 1220905, 'application/pdf', 2, '2025-06-02 15:17:27'),
(16, 3, 'formalization', 'codigo_proyecto', 'eee074a7-7774-4e06-bb3c-85a4903c8f6f.pdf', 'CAS Oauth 2.0 Crear servicio.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\eee074a7-7774-4e06-bb3c-85a4903c8f6f.pdf', 1945943, 'application/pdf', 2, '2025-06-02 15:17:36'),
(17, 3, 'formalization', 'presupuesto_validado', 'b8619f3f-1587-45b6-a6e9-c19756615d52.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\b8619f3f-1587-45b6-a6e9-c19756615d52.pdf', 1220905, 'application/pdf', 2, '2025-06-02 15:17:47'),
(18, 1, 'delivery', 'solicitud_ambientes', '95d1f083-ccd2-49b6-8bcd-fbff031da0bf.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\95d1f083-ccd2-49b6-8bcd-fbff031da0bf.pdf', 1220905, 'application/pdf', 2, '2025-06-02 15:19:21'),
(19, 7, 'formalization', 'ficha_formalizacion', 'b87c433b-e09f-4778-af68-d24b11d2d5ef.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\b87c433b-e09f-4778-af68-d24b11d2d5ef.pdf', 1220905, 'application/pdf', 2, '2025-06-02 15:51:35'),
(20, 7, 'formalization', 'codigo_proyecto', '2451992b-8f4f-43cf-ac19-f23db6636510.pdf', 'CAS - Crear servicio con protocolo CAS.pdf', 'C:\\xampp\\htdocs\\gestionProyectosReactUC\\gestionproyectosreactuc\\backend\\uploads\\2451992b-8f4f-43cf-ac19-f23db6636510.pdf', 1220905, 'application/pdf', 2, '2025-06-02 15:52:13');

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
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `projects`
--

INSERT INTO `projects` (`id`, `code`, `title`, `description`, `user_id`, `status`, `current_stage`, `created_at`, `updated_at`) VALUES
(1, 'PROJ-2025-001', 'Sistema de Gestión Académica', 'Desarrollo de plataforma integral para gestión de estudiantes, cursos y calificaciones. Incluye módulos de matrícula, seguimiento académico y reportes administrativos.', 2, 'in-progress', 'operation', '2025-06-02 12:49:21', '2025-06-02 15:20:16'),
(2, 'PROJ-2025-002', 'Portal Web Institucional', 'Rediseño completo del sitio web oficial de la universidad con enfoque en experiencia de usuario y accesibilidad. Incluye CMS y sistema de noticias.', 3, 'pending', 'formalization', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(3, 'PROJ-2025-003', 'App Móvil Estudiantil', 'Aplicación móvil para estudiantes con acceso a horarios, calificaciones, biblioteca digital y servicios campus. Disponible para iOS y Android.', 2, 'approved', 'maintenance', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(4, 'PROJ-2025-004', 'Sistema de Biblioteca Digital', 'Plataforma digital para gestión de recursos bibliográficos, préstamos, reservas y acceso a contenido electrónico. Integración con catálogo mundial.', 4, 'rejected', 'formalization', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(5, 'PROJ-2025-005', 'Plataforma E-Learning', 'Sistema completo de educación en línea con aulas virtuales, evaluaciones automáticas, foros de discusión y seguimiento de progreso estudiantil.', 3, 'in-progress', 'delivery', '2025-06-02 12:49:21', '2025-06-02 12:49:21'),
(6, 'PROJ-2025-006', 'Proyecto de prueba', 'descripción', 2, 'pending', 'maintenance', '2025-06-02 13:33:29', '2025-06-02 14:57:08'),
(7, 'PROJ-2025-007', 'Proyecto de Luis', 'Este proyecto es de Luis', 2, 'pending', 'design', '2025-06-02 15:50:19', '2025-06-02 15:54:00');

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
(30, 7, 'maintenance', 'pending', NULL, NULL, '2025-06-02 15:50:19', '2025-06-02 15:50:19');

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
  ADD KEY `idx_project_stage_requirement` (`project_id`,`stage_name`,`requirement_id`);

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
-- Indices de la tabla `project_stages`
--
ALTER TABLE `project_stages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_project_stage` (`project_id`,`stage_name`),
  ADD KEY `idx_project_id` (`project_id`),
  ADD KEY `idx_stage_name` (`stage_name`),
  ADD KEY `idx_status` (`status`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `project_stages`
--
ALTER TABLE `project_stages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

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
-- Filtros para la tabla `project_stages`
--
ALTER TABLE `project_stages`
  ADD CONSTRAINT `project_stages_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
