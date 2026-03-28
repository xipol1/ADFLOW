# Wireframes para la Plataforma de Monetización para Canales de Comunicación

## Descripción General
Este documento presenta los wireframes de las interfaces principales para la Plataforma de Monetización para Canales de Comunicación. Los wireframes están organizados por tipo de usuario (creadores de contenido, anunciantes y administradores) y representan las principales funcionalidades de la plataforma.

## Interfaces Comunes

### 1. Página de Inicio (Landing Page)
```
+------------------------------------------------------+
|  LOGO    Inicio  Características  Precios  Registrarse|
+------------------------------------------------------+
|                                                      |
|  +------------------------------------------+        |
|  |                                          |        |
|  |  Monetiza tus canales de comunicación    |        |
|  |  Conecta con anunciantes y genera        |        |
|  |  ingresos con tu audiencia               |        |
|  |                                          |        |
|  |  [Registrarse como Creador] [Soy Anunciante]      |
|  |                                          |        |
|  +------------------------------------------+        |
|                                                      |
+------------------------------------------------------+
|                                                      |
|  CÓMO FUNCIONA                                       |
|                                                      |
|  +----------+    +----------+    +----------+        |
|  | 1.Registra|    |2.Establece|   |3.Recibe  |        |
|  | tus canales|   |tus tarifas|   |solicitudes|       |
|  +----------+    +----------+    +----------+        |
|                                                      |
+------------------------------------------------------+
|                                                      |
|  PLATAFORMAS SOPORTADAS                              |
|                                                      |
|  [Telegram] [WhatsApp] [Instagram] [Facebook] [Discord]|
|                                                      |
+------------------------------------------------------+
|                                                      |
|  TESTIMONIOS                                         |
|                                                      |
|  +----------+    +----------+    +----------+        |
|  |Testimonio1|   |Testimonio2|   |Testimonio3|       |
|  +----------+    +----------+    +----------+        |
|                                                      |
+------------------------------------------------------+
|                                                      |
|  FOOTER: Enlaces | Contacto | Términos | Privacidad  |
|                                                      |
+------------------------------------------------------+
```

### 2. Página de Registro/Inicio de Sesión
```
+------------------------------------------------------+
|  LOGO    Inicio  Características  Precios  Registrarse|
+------------------------------------------------------+
|                                                      |
|  +------------------------------------------+        |
|  |                                          |        |
|  |  [Pestañas] Iniciar Sesión | Registrarse |        |
|  |                                          |        |
|  |  Email:    [                    ]        |        |
|  |  Contraseña:[                    ]       |        |
|  |                                          |        |
|  |  [Iniciar Sesión]                        |        |
|  |                                          |        |
|  |  ¿Olvidaste tu contraseña?               |        |
|  |                                          |        |
|  |  --- O ---                               |        |
|  |                                          |        |
|  |  [Continuar con Google]                  |        |
|  |  [Continuar con Facebook]                |        |
|  |                                          |        |
|  +------------------------------------------+        |
|                                                      |
+------------------------------------------------------+
|                                                      |
|  FOOTER: Enlaces | Contacto | Términos | Privacidad  |
|                                                      |
+------------------------------------------------------+
```

## Interfaces para Creadores de Contenido

### 3. Dashboard del Creador
```
+------------------------------------------------------+
|  LOGO    Dashboard  Mis Canales  Anuncios  Finanzas  |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  Bienvenido, [Nombre del Creador]                    |
|                                                      |
|  +------------------+  +------------------+          |
|  | Ingresos Totales |  | Anuncios Activos |          |
|  | $X,XXX.XX        |  | XX               |          |
|  +------------------+  +------------------+          |
|                                                      |
|  +------------------+  +------------------+          |
|  | Canales Activos  |  | Solicitudes      |          |
|  | XX               |  | Pendientes: XX   |          |
|  +------------------+  +------------------+          |
|                                                      |
|  ACTIVIDAD RECIENTE                                  |
|  +------------------------------------------------+  |
|  | • Nuevo anuncio aprobado en Canal X            |  |
|  | • Pago recibido: $XXX.XX                       |  |
|  | • Nueva solicitud de anuncio en Canal Y        |  |
|  | • ...                                          |  |
|  +------------------------------------------------+  |
|                                                      |
|  RENDIMIENTO DE CANALES                              |
|  +------------------------------------------------+  |
|  |                                                |  |
|  | [Gráfico de barras/líneas con métricas]        |  |
|  |                                                |  |
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

### 4. Gestión de Canales
```
+------------------------------------------------------+
|  LOGO    Dashboard  Mis Canales  Anuncios  Finanzas  |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  Mis Canales                       [+ Añadir Canal]  |
|                                                      |
|  [Filtros] Todos | Telegram | WhatsApp | Instagram...| 
|                                                      |
|  +------------------------------------------------+  |
|  | Canal 1                                [Editar] |  |
|  | Plataforma: Telegram                           |  |
|  | Audiencia: XX,XXX                              |  |
|  | Estado: Verificado ✓                           |  |
|  | Tarifas: $XX - $XXX                            |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Canal 2                                [Editar] |  |
|  | Plataforma: Instagram                           |  |
|  | Audiencia: XX,XXX                              |  |
|  | Estado: Pendiente de verificación              |  |
|  | Tarifas: $XX - $XXX                            |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Canal 3                                [Editar] |  |
|  | Plataforma: WhatsApp                           |  |
|  | Audiencia: XX,XXX                              |  |
|  | Estado: Verificado ✓                           |  |
|  | Tarifas: $XX - $XXX                            |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
+------------------------------------------------------+
```

### 5. Detalle de Canal y Gestión de Tarifas
```
+------------------------------------------------------+
|  LOGO    Dashboard  Mis Canales  Anuncios  Finanzas  |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  < Volver a Mis Canales                              |
|                                                      |
|  Detalles del Canal                    [Editar]      |
|  +------------------------------------------------+  |
|  | Nombre: Canal XYZ                               |  |
|  | Plataforma: Telegram                           |  |
|  | URL: t.me/canalxyz                             |  |
|  | Categoría: Tecnología                          |  |
|  | Audiencia: XX,XXX                              |  |
|  | Ubicación principal: España                    |  |
|  | Demografía: 25-34 años (60%), 35-44 (30%)...   |  |
|  | Estado: Verificado ✓                           |  |
|  +------------------------------------------------+  |
|                                                      |
|  Tarifas                            [+ Añadir Tarifa]|
|  +------------------------------------------------+  |
|  | Tipo: Post                                [Editar]|  |
|  | Descripción: Publicación estándar en el canal  |  |
|  | Precio: $XX.XX                                 |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Tipo: Historia                            [Editar]|  |
|  | Descripción: Publicación temporal (24h)        |  |
|  | Precio: $XX.XX                                 |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Tipo: Mención                            [Editar]|  |
|  | Descripción: Mención breve en publicación      |  |
|  | Precio: $XX.XX                                 |  |
|  +------------------------------------------------+  |
|                                                      |
|  Estadísticas                                        |
|  +------------------------------------------------+  |
|  |                                                |  |
|  | [Gráficos de rendimiento del canal]            |  |
|  |                                                |  |
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

### 6. Gestión de Anuncios (Vista del Creador)
```
+------------------------------------------------------+
|  LOGO    Dashboard  Mis Canales  Anuncios  Finanzas  |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  Anuncios                                            |
|                                                      |
|  [Filtros] Todos | Pendientes | Aprobados | Publicados|
|                                                      |
|  +------------------------------------------------+  |
|  | Anuncio 1                         [Ver Detalle] |  |
|  | Canal: Canal XYZ                               |  |
|  | Anunciante: Empresa ABC                        |  |
|  | Tipo: Post                                     |  |
|  | Estado: Pendiente de aprobación                |  |
|  | Fecha solicitud: DD/MM/AAAA                    |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Anuncio 2                         [Ver Detalle] |  |
|  | Canal: Canal XYZ                               |  |
|  | Anunciante: Empresa DEF                        |  |
|  | Tipo: Historia                                 |  |
|  | Estado: Aprobado                               |  |
|  | Fecha publicación: DD/MM/AAAA                  |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Anuncio 3                         [Ver Detalle] |  |
|  | Canal: Canal XYZ                               |  |
|  | Anunciante: Empresa GHI                        |  |
|  | Tipo: Mención                                  |  |
|  | Estado: Publicado                              |  |
|  | Fecha publicación: DD/MM/AAAA                  |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
+------------------------------------------------------+
```

### 7. Detalle de Anuncio y Aprobación
```
+------------------------------------------------------+
|  LOGO    Dashboard  Mis Canales  Anuncios  Finanzas  |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  < Volver a Anuncios                                 |
|                                                      |
|  Detalle del Anuncio                                 |
|  +------------------------------------------------+  |
|  | ID: #12345                                     |  |
|  | Canal: Canal XYZ                               |  |
|  | Anunciante: Empresa ABC                        |  |
|  | Tipo: Post                                     |  |
|  | Estado: Pendiente de aprobación                |  |
|  | Fecha solicitud: DD/MM/AAAA                    |  |
|  | Precio: $XX.XX                                 |  |
|  +------------------------------------------------+  |
|                                                      |
|  Contenido del Anuncio                               |
|  +------------------------------------------------+  |
|  |                                                |  |
|  | [Texto/imagen del anuncio propuesto]           |  |
|  |                                                |  |
|  +------------------------------------------------+  |
|                                                      |
|  Acciones                                            |
|  +------------------------------------------------+  |
|  | [Aprobar Anuncio]    [Rechazar]    [Sugerir Cambios]|
|  +------------------------------------------------+  |
|                                                      |
|  Comentarios                                         |
|  +------------------------------------------------+  |
|  | Añadir comentario:                              |  |
|  | [                                            ]  |  |
|  | [Enviar]                                       |  |
|  |                                                |  |
|  | Historial de comentarios:                       |  |
|  | • Anunciante (DD/MM): Texto del comentario...  |  |
|  | • Creador (DD/MM): Texto del comentario...     |  |
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

### 8. Finanzas del Creador
```
+------------------------------------------------------+
|  LOGO    Dashboard  Mis Canales  Anuncios  Finanzas  |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  Finanzas                                            |
|                                                      |
|  +------------------+  +------------------+          |
|  | Saldo Disponible |  | Ingresos Totales |          |
|  | $X,XXX.XX        |  | $XX,XXX.XX       |          |
|  | [Retirar Fondos] |  |                  |          |
|  +------------------+  +------------------+          |
|                                                      |
|  +------------------+  +------------------+          |
|  | Pendiente        |  | Comisiones       |          |
|  | $XXX.XX          |  | $XXX.XX          |          |
|  +------------------+  +------------------+          |
|                                                      |
|  Historial de Transacciones                          |
|  [Filtros] Período: [Último mes ▼]                   |
|                                                      |
|  +------------------------------------------------+  |
|  | Fecha     | Concepto           | Monto    | Estado|
|  |-----------|--------------------|---------:|-------|
|  | DD/MM/AAAA| Anuncio #12345     | +$XX.XX  | Completado|
|  | DD/MM/AAAA| Retiro a PayPal    | -$XXX.XX | Completado|
|  | DD/MM/AAAA| Anuncio #12346     | +$XX.XX  | Pendiente|
|  | DD/MM/AAAA| Comisión plataforma| -$X.XX   | Completado|
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
|  Métodos de Pago                     [+ Añadir Método]|
|  +------------------------------------------------+  |
|  | • PayPal: usuario@email.com       [Predeterminado]|
|  | • Transferencia Bancaria: *****1234    [Eliminar]|
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

## Interfaces para Anunciantes

### 9. Dashboard del Anunciante
```
+------------------------------------------------------+
|  LOGO    Dashboard  Explorar  Mis Anuncios  Finanzas |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  Bienvenido, [Nombre del Anunciante]                 |
|                                                      |
|  +------------------+  +------------------+          |
|  | Gasto Total      |  | Anuncios Activos |          |
|  | $X,XXX.XX        |  | XX               |          |
|  +------------------+  +------------------+          |
|                                                      |
|  +------------------+  +------------------+          |
|  | Canales Usados   |  | Anuncios         |          |
|  | XX               |  | Pendientes: XX   |          |
|  +------------------+  +------------------+          |
|                                                      |
|  ACTIVIDAD RECIENTE                                  |
|  +------------------------------------------------+  |
|  | • Anuncio aprobado en Canal X                  |  |
|  | • Anuncio publicado en Canal Y                 |  |
|  | • Anuncio rechazado en Canal Z                 |  |
|  | • ...                                          |  |
|  +------------------------------------------------+  |
|                                                      |
|  RENDIMIENTO DE ANUNCIOS                             |
|  +------------------------------------------------+  |
|  |                                                |  |
|  | [Gráfico de barras/líneas con métricas]        |  |
|  |                                                |  |
|  +------------------------------------------------+  |
|                                                      |
|  CANALES RECOMENDADOS                                |
|  +------------------------------------------------+  |
|  | • Canal A - 50K seguidores - $XX               |  |
|  | • Canal B - 100K seguidores - $XX              |  |
|  | • Canal C - 75K seguidores - $XX               |  |
|  | [Ver más recomendaciones]                      |  |
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

### 10. Explorador de Canales
```
+------------------------------------------------------+
|  LOGO    Dashboard  Explorar  Mis Anuncios  Finanzas |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  Explorar Canales                                    |
|                                                      |
|  +------------------------------------------------+  |
|  | Filtros:                                        |  |
|  | Plataforma: [Todas ▼]                          |  |
|  | Categoría: [Todas ▼]                           |  |
|  | Audiencia: [Mín ▼] - [Máx ▼]                   |  |
|  | Ubicación: [Todas ▼]                           |  |
|  | Precio: [Mín ▼] - [Máx ▼]                      |  |
|  | [Aplicar Filtros]                              |  |
|  +------------------------------------------------+  |
|                                                      |
|  Resultados (XX canales)    Ordenar por: [Relevancia ▼]|
|                                                      |
|  +------------------------------------------------+  |
|  | Canal A                             [Ver Detalle] |  |
|  | Plataforma: Telegram                           |  |
|  | Categoría: Tecnología                          |  |
|  | Audiencia: XX,XXX                              |  |
|  | Ubicación: España                              |  |
|  | Tarifas: Desde $XX                             |  |
|  | Valoración: ★★★★☆ (4.5/5)                      |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Canal B                             [Ver Detalle] |  |
|  | Plataforma: Instagram                           |  |
|  | Categoría: Moda                                |  |
|  | Audiencia: XX,XXX                              |  |
|  | Ubicación: México                              |  |
|  | Tarifas: Desde $XX                             |  |
|  | Valoración: ★★★★★ (5/5)                        |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
+------------------------------------------------------+
```

### 11. Detalle de Canal y Compra de Anuncio
```
+------------------------------------------------------+
|  LOGO    Dashboard  Explorar  Mis Anuncios  Finanzas |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  < Volver a Explorar                                 |
|                                                      |
|  Detalle del Canal                                   |
|  +------------------------------------------------+  |
|  | Nombre: Canal XYZ                               |  |
|  | Plataforma: Telegram                           |  |
|  | Categoría: Tecnología                          |  |
|  | Audiencia: XX,XXX                              |  |
|  | Ubicación principal: España                    |  |
|  | Demografía: 25-34 años (60%), 35-44 (30%)...   |  |
|  | Valoración: ★★★★☆ (4.5/5)                      |  |
|  +------------------------------------------------+  |
|                                                      |
|  Opciones de Anuncio                                 |
|  +------------------------------------------------+  |
|  | Tipo: Post                                     |  |
|  | Descripción: Publicación estándar en el canal  |  |
|  | Precio: $XX.XX                                 |  |
|  | [Seleccionar]                                  |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Tipo: Historia                                 |  |
|  | Descripción: Publicación temporal (24h)        |  |
|  | Precio: $XX.XX                                 |  |
|  | [Seleccionar]                                  |  |
|  +------------------------------------------------+  |
|                                                      |
|  Estadísticas del Canal                              |
|  +------------------------------------------------+  |
|  |                                                |  |
|  | [Gráficos de rendimiento del canal]            |  |
|  |                                                |  |
|  +------------------------------------------------+  |
|                                                      |
|  Opiniones (XX)                                      |
|  +------------------------------------------------+  |
|  | • Anunciante A: ★★★★★ "Excelente respuesta..." |  |
|  | • Anunciante B: ★★★★☆ "Buena audiencia..."     |  |
|  | [Ver todas las opiniones]                      |  |
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

### 12. Creación de Anuncio
```
+------------------------------------------------------+
|  LOGO    Dashboard  Explorar  Mis Anuncios  Finanzas |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  < Volver al Canal                                   |
|                                                      |
|  Crear Anuncio                                       |
|  +------------------------------------------------+  |
|  | Canal: Canal XYZ                               |  |
|  | Tipo de anuncio: Post                          |  |
|  | Precio: $XX.XX                                 |  |
|  +------------------------------------------------+  |
|                                                      |
|  Detalles del Anuncio                                |
|  +------------------------------------------------+  |
|  | Título del anuncio:                             |  |
|  | [                                            ]  |  |
|  |                                                |  |
|  | Contenido:                                     |  |
|  | [                                            ]  |  |
|  | [                                            ]  |  |
|  | [                                            ]  |  |
|  |                                                |  |
|  | Adjuntar imagen: [Seleccionar archivo]         |  |
|  |                                                |  |
|  | Fecha preferida de publicación:                |  |
|  | [Seleccionar fecha ▼]                          |  |
|  |                                                |  |
|  | Instrucciones adicionales:                     |  |
|  | [                                            ]  |  |
|  | [                                            ]  |  |
|  +------------------------------------------------+  |
|                                                      |
|  Método de Pago                                      |
|  +------------------------------------------------+  |
|  | [○] Usar método predeterminado                 |  |
|  | [●] Seleccionar otro método                    |  |
|  |     [Tarjeta terminada en *1234 ▼]             |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Cancelar]                    [Enviar Solicitud]    |
|                                                      |
+------------------------------------------------------+
```

### 13. Gestión de Anuncios (Vista del Anunciante)
```
+------------------------------------------------------+
|  LOGO    Dashboard  Explorar  Mis Anuncios  Finanzas |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  Mis Anuncios                                        |
|                                                      |
|  [Filtros] Todos | Pendientes | Aprobados | Publicados|
|                                                      |
|  +------------------------------------------------+  |
|  | Anuncio 1                         [Ver Detalle] |  |
|  | Canal: Canal XYZ                               |  |
|  | Tipo: Post                                     |  |
|  | Estado: Pendiente de aprobación                |  |
|  | Fecha solicitud: DD/MM/AAAA                    |  |
|  | Monto: $XX.XX                                  |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Anuncio 2                         [Ver Detalle] |  |
|  | Canal: Canal ABC                               |  |
|  | Tipo: Historia                                 |  |
|  | Estado: Aprobado                               |  |
|  | Fecha publicación: DD/MM/AAAA                  |  |
|  | Monto: $XX.XX                                  |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Anuncio 3                         [Ver Detalle] |  |
|  | Canal: Canal DEF                               |  |
|  | Tipo: Mención                                  |  |
|  | Estado: Publicado                              |  |
|  | Fecha publicación: DD/MM/AAAA                  |  |
|  | Monto: $XX.XX                                  |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
+------------------------------------------------------+
```

### 14. Finanzas del Anunciante
```
+------------------------------------------------------+
|  LOGO    Dashboard  Explorar  Mis Anuncios  Finanzas |
|                                      [Usuario ▼]     |
+------------------------------------------------------+
|                                                      |
|  Finanzas                                            |
|                                                      |
|  +------------------+  +------------------+          |
|  | Gasto Total      |  | Gasto Mensual    |          |
|  | $X,XXX.XX        |  | $XXX.XX          |          |
|  +------------------+  +------------------+          |
|                                                      |
|  +------------------+  +------------------+          |
|  | Pendiente        |  | Presupuesto      |          |
|  | $XXX.XX          |  | $X,XXX.XX        |          |
|  +------------------+  +------------------+          |
|                                                      |
|  Historial de Transacciones                          |
|  [Filtros] Período: [Último mes ▼]                   |
|                                                      |
|  +------------------------------------------------+  |
|  | Fecha     | Concepto           | Monto    | Estado|
|  |-----------|--------------------|---------:|-------|
|  | DD/MM/AAAA| Anuncio #12345     | -$XX.XX  | Completado|
|  | DD/MM/AAAA| Anuncio #12346     | -$XX.XX  | Pendiente|
|  | DD/MM/AAAA| Anuncio #12347     | -$XX.XX  | Completado|
|  | DD/MM/AAAA| Reembolso #12348   | +$XX.XX  | Completado|
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
|  Métodos de Pago                     [+ Añadir Método]|
|  +------------------------------------------------+  |
|  | • Tarjeta **** **** **** 1234    [Predeterminado]|
|  | • PayPal: usuario@email.com          [Eliminar]|
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

## Interfaces para Administradores

### 15. Dashboard del Administrador
```
+------------------------------------------------------+
|  LOGO    Dashboard  Usuarios  Canales  Anuncios  Pagos|
|                                      [Admin ▼]       |
+------------------------------------------------------+
|                                                      |
|  Panel de Administración                              |
|                                                      |
|  +------------------+  +------------------+          |
|  | Usuarios Totales |  | Canales Activos  |          |
|  | X,XXX            |  | X,XXX            |          |
|  +------------------+  +------------------+          |
|                                                      |
|  +------------------+  +------------------+          |
|  | Anuncios Activos |  | Ingresos Totales |          |
|  | X,XXX            |  | $XX,XXX.XX       |          |
|  +------------------+  +------------------+          |
|                                                      |
|  ACTIVIDAD RECIENTE                                  |
|  +------------------------------------------------+  |
|  | • Nuevo usuario registrado: Usuario X          |  |
|  | • Canal verificado: Canal Y                    |  |
|  | • Solicitud de retiro: Creador Z - $XXX.XX     |  |
|  | • ...                                          |  |
|  +------------------------------------------------+  |
|                                                      |
|  MÉTRICAS DE PLATAFORMA                              |
|  +------------------------------------------------+  |
|  |                                                |  |
|  | [Gráficos de crecimiento, ingresos, etc.]      |  |
|  |                                                |  |
|  +------------------------------------------------+  |
|                                                      |
|  ALERTAS DEL SISTEMA                                 |
|  +------------------------------------------------+  |
|  | • X canales pendientes de verificación         |  |
|  | • X solicitudes de retiro pendientes           |  |
|  | • X reportes de usuarios sin resolver          |  |
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

### 16. Gestión de Usuarios
```
+------------------------------------------------------+
|  LOGO    Dashboard  Usuarios  Canales  Anuncios  Pagos|
|                                      [Admin ▼]       |
+------------------------------------------------------+
|                                                      |
|  Gestión de Usuarios                                 |
|                                                      |
|  +------------------------------------------------+  |
|  | Buscar: [                                    ]  |  |
|  | Filtros: Tipo: [Todos ▼]  Estado: [Todos ▼]    |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | ID | Nombre      | Tipo      | Registro  | Estado |
|  |----|-------------|-----------|-----------|--------|
|  | 001| Usuario A   | Creador   | DD/MM/AAAA| Activo |
|  |    | [Ver detalle] [Editar] [Suspender]          |  |
|  |----|-------------|-----------|-----------|--------|
|  | 002| Usuario B   | Anunciante| DD/MM/AAAA| Activo |
|  |    | [Ver detalle] [Editar] [Suspender]          |  |
|  |----|-------------|-----------|-----------|--------|
|  | 003| Usuario C   | Creador   | DD/MM/AAAA|Suspendido|
|  |    | [Ver detalle] [Editar] [Activar]            |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
+------------------------------------------------------+
```

### 17. Gestión de Canales (Admin)
```
+------------------------------------------------------+
|  LOGO    Dashboard  Usuarios  Canales  Anuncios  Pagos|
|                                      [Admin ▼]       |
+------------------------------------------------------+
|                                                      |
|  Gestión de Canales                                  |
|                                                      |
|  +------------------------------------------------+  |
|  | Buscar: [                                    ]  |  |
|  | Filtros: Plataforma: [Todas ▼] Estado: [Todos ▼] |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | ID | Nombre   | Plataforma | Creador   | Estado  |
|  |----|----------|------------|-----------|---------|
|  | 001| Canal A  | Telegram   | Usuario A |Verificado|
|  |    | [Ver detalle] [Editar] [Suspender]          |  |
|  |----|----------|------------|-----------|---------|
|  | 002| Canal B  | Instagram  | Usuario B |Pendiente|
|  |    | [Ver detalle] [Verificar] [Rechazar]        |  |
|  |----|----------|------------|-----------|---------|
|  | 003| Canal C  | WhatsApp   | Usuario C |Suspendido|
|  |    | [Ver detalle] [Editar] [Activar]            |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
+------------------------------------------------------+
```

### 18. Gestión de Anuncios (Admin)
```
+------------------------------------------------------+
|  LOGO    Dashboard  Usuarios  Canales  Anuncios  Pagos|
|                                      [Admin ▼]       |
+------------------------------------------------------+
|                                                      |
|  Gestión de Anuncios                                 |
|                                                      |
|  +------------------------------------------------+  |
|  | Buscar: [                                    ]  |  |
|  | Filtros: Estado: [Todos ▼] Plataforma: [Todas ▼] |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | ID | Canal    | Anunciante | Estado    | Fecha   |
|  |----|----------|------------|-----------|---------|
|  | 001| Canal A  | Empresa X  | Publicado |DD/MM/AAAA|
|  |    | [Ver detalle] [Editar] [Suspender]          |  |
|  |----|----------|------------|-----------|---------|
|  | 002| Canal B  | Empresa Y  | Pendiente |DD/MM/AAAA|
|  |    | [Ver detalle] [Aprobar] [Rechazar]          |  |
|  |----|----------|------------|-----------|---------|
|  | 003| Canal C  | Empresa Z  | Rechazado |DD/MM/AAAA|
|  |    | [Ver detalle] [Editar]                      |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
+------------------------------------------------------+
```

### 19. Gestión de Pagos
```
+------------------------------------------------------+
|  LOGO    Dashboard  Usuarios  Canales  Anuncios  Pagos|
|                                      [Admin ▼]       |
+------------------------------------------------------+
|                                                      |
|  Gestión de Pagos                                    |
|                                                      |
|  +------------------------------------------------+  |
|  | Buscar: [                                    ]  |  |
|  | Filtros: Tipo: [Todos ▼] Estado: [Todos ▼]      |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | ID | Usuario  | Tipo      | Monto    | Estado   |
|  |----|----------|-----------|----------|----------|
|  | 001| Usuario A| Retiro    | $XXX.XX  | Pendiente|
|  |    | [Ver detalle] [Aprobar] [Rechazar]         |  |
|  |----|----------|-----------|----------|----------|
|  | 002| Usuario B| Pago      | $XXX.XX  | Completado|
|  |    | [Ver detalle]                              |  |
|  |----|----------|-----------|----------|----------|
|  | 003| Usuario C| Retiro    | $XXX.XX  | Fallido  |
|  |    | [Ver detalle] [Reintentar]                 |  |
|  +------------------------------------------------+  |
|                                                      |
|  [Paginación] < 1 2 3 ... >                         |
|                                                      |
|  Resumen Financiero                                  |
|  +------------------------------------------------+  |
|  | Ingresos totales: $XX,XXX.XX                   |  |
|  | Comisiones: $X,XXX.XX                          |  |
|  | Pagos a creadores: $XX,XXX.XX                  |  |
|  | Reembolsos: $XXX.XX                            |  |
|  | [Ver informe completo]                         |  |
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

### 20. Configuración del Sistema
```
+------------------------------------------------------+
|  LOGO    Dashboard  Usuarios  Canales  Anuncios  Pagos|
|                                      [Admin ▼]       |
+------------------------------------------------------+
|                                                      |
|  Configuración del Sistema                           |
|                                                      |
|  +------------------------------------------------+  |
|  | Comisiones                                      |  |
|  | Porcentaje de comisión: [XX] %                 |  |
|  | [Actualizar]                                   |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Integraciones                                   |  |
|  | API Telegram: [Configurado ✓]                  |  |
|  | API WhatsApp: [Configurado ✓]                  |  |
|  | API Meta: [Configurado ✓]                      |  |
|  | API Discord: [No configurado] [Configurar]     |  |
|  | Stripe: [Configurado ✓]                        |  |
|  | PayPal: [Configurado ✓]                        |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Notificaciones                                  |  |
|  | Email: [Activado ✓]                            |  |
|  | Push: [Activado ✓]                             |  |
|  | Plantillas de email: [Editar]                  |  |
|  +------------------------------------------------+  |
|                                                      |
|  +------------------------------------------------+  |
|  | Seguridad                                       |  |
|  | Tiempo de sesión: [120] minutos                |  |
|  | Intentos de login: [5]                         |  |
|  | 2FA para administradores: [Activado ✓]         |  |
|  | [Actualizar]                                   |  |
|  +------------------------------------------------+  |
|                                                      |
+------------------------------------------------------+
```

## Notas Adicionales

Estos wireframes representan las interfaces principales de la Plataforma de Monetización para Canales de Comunicación. Durante la implementación, se considerarán los siguientes aspectos:

1. **Diseño Responsivo**: Todas las interfaces se adaptarán a diferentes tamaños de pantalla (móvil, tablet, escritorio).

2. **Accesibilidad**: Se implementarán prácticas de accesibilidad web para garantizar que la plataforma sea utilizable por personas con discapacidades.

3. **Temas**: Se ofrecerá un tema claro y oscuro para mejorar la experiencia del usuario.

4. **Internacionalización**: La plataforma estará preparada para soportar múltiples idiomas.

5. **Notificaciones**: Se implementará un sistema de notificaciones en tiempo real para mantener a los usuarios informados sobre actividades importantes.

Los wireframes servirán como base para el desarrollo de las interfaces de usuario, pero pueden sufrir modificaciones durante la implementación para mejorar la experiencia del usuario y la funcionalidad de la plataforma.
