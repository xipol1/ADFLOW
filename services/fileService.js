const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const mongoose = require('mongoose');
const config = require('../config/config');
const Archivo = require('../models/Archivo');

/**
 * Servicio de gestión de archivos
 */
class FileService {
  constructor() {
    this.uploadsDir = config.files.uploadPath;
    this.maxFileSize = config.files.maxFileSize;
    this.allowedTypes = config.files.allowedTypes;
    this.imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    this.initializeDirectories();
  }

  /**
   * Inicializar directorios necesarios
   */
  async initializeDirectories() {
    try {
      const directories = [
        this.uploadsDir,
        path.join(this.uploadsDir, 'images'),
        path.join(this.uploadsDir, 'documents'),
        path.join(this.uploadsDir, 'avatars'),
        path.join(this.uploadsDir, 'temp'),
        path.join(this.uploadsDir, 'thumbnails')
      ];

      for (const dir of directories) {
        try {
          await fs.access(dir);
        } catch {
          await fs.mkdir(dir, { recursive: true });
          console.log(`Directorio creado: ${dir}`);
        }
      }
    } catch (error) {
      console.error('Error al inicializar directorios:', error);
    }
  }

  /**
   * Configurar multer para diferentes tipos de archivos
   */
  getMulterConfig(tipo = 'general') {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        let uploadPath = this.uploadsDir;
        
        switch (tipo) {
          case 'image':
            uploadPath = path.join(this.uploadsDir, 'images');
            break;
          case 'document':
            uploadPath = path.join(this.uploadsDir, 'documents');
            break;
          case 'avatar':
            uploadPath = path.join(this.uploadsDir, 'avatars');
            break;
          default:
            uploadPath = path.join(this.uploadsDir, 'temp');
        }
        
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      // Verificar tipo de archivo
      if (!this.allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      }

      // Verificaciones específicas por tipo
      if (tipo === 'image' && !this.imageTypes.includes(file.mimetype)) {
        return cb(new Error('Solo se permiten archivos de imagen'), false);
      }

      if (tipo === 'document' && !this.documentTypes.includes(file.mimetype)) {
        return cb(new Error('Solo se permiten documentos PDF y Word'), false);
      }

      cb(null, true);
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 5 // máximo 5 archivos por request
      }
    });
  }

  /**
   * Procesar imagen subida
   */
  async procesarImagen(filePath, opciones = {}) {
    try {
      const {
        ancho = null,
        alto = null,
        calidad = 80,
        formato = 'jpeg',
        crearThumbnail = true,
        thumbnailSize = 150
      } = opciones;

      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      // Redimensionar si se especifica
      if (ancho || alto) {
        image.resize(ancho, alto, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Optimizar según el formato
      switch (formato) {
        case 'jpeg':
          image.jpeg({ quality: calidad, progressive: true });
          break;
        case 'png':
          image.png({ compressionLevel: 9 });
          break;
        case 'webp':
          image.webp({ quality: calidad });
          break;
      }

      // Generar nombre de archivo optimizado
      const dir = path.dirname(filePath);
      const name = path.basename(filePath, path.extname(filePath));
      const optimizedPath = path.join(dir, `${name}_optimized.${formato}`);
      
      await image.toFile(optimizedPath);

      // Crear thumbnail si se solicita
      let thumbnailPath = null;
      if (crearThumbnail) {
        thumbnailPath = path.join(this.uploadsDir, 'thumbnails', `${name}_thumb.${formato}`);
        await sharp(filePath)
          .resize(thumbnailSize, thumbnailSize, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 70 })
          .toFile(thumbnailPath);
      }

      return {
        original: filePath,
        optimized: optimizedPath,
        thumbnail: thumbnailPath,
        metadata: {
          ancho: metadata.width,
          alto: metadata.height,
          formato: metadata.format,
          tamano: metadata.size,
          hasAlpha: metadata.hasAlpha
        }
      };

    } catch (error) {
      console.error('Error al procesar imagen:', error);
      throw new Error('Error al procesar la imagen');
    }
  }

  /**
   * Guardar información del archivo en la base de datos
   */
  async guardarArchivo(archivoData, usuarioId) {
    try {
      const {
        filename,
        originalname,
        mimetype,
        size,
        path: filePath,
        optimizedPath = null,
        thumbnailPath = null,
        metadata = {},
        categoria = 'general',
        descripcion = '',
        esPublico = false
      } = archivoData;

      // Generar hash del archivo para detectar duplicados
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Verificar si ya existe un archivo con el mismo hash
      const archivoExistente = await Archivo.findOne({ hash, usuario: usuarioId });
      if (archivoExistente) {
        // Eliminar archivo duplicado
        await this.eliminarArchivoFisico(filePath);
        return archivoExistente;
      }

      // Crear registro en la base de datos
      const archivo = new Archivo({
        usuario: usuarioId,
        nombreOriginal: originalname,
        nombreArchivo: filename,
        tipoMime: mimetype,
        tamano: size,
        ruta: filePath,
        rutaOptimizada: optimizedPath,
        rutaThumbnail: thumbnailPath,
        hash,
        metadata,
        categoria,
        descripcion,
        esPublico,
        fechaSubida: new Date()
      });

      await archivo.save();
      return archivo;

    } catch (error) {
      console.error('Error al guardar archivo:', error);
      throw new Error('Error al guardar la información del archivo');
    }
  }

  /**
   * Obtener archivo por ID
   */
  async obtenerArchivo(archivoId, usuarioId = null) {
    try {
      const filtros = { _id: archivoId };
      
      // Si no es público, verificar que pertenezca al usuario
      if (usuarioId) {
        filtros.$or = [
          { usuario: usuarioId },
          { esPublico: true }
        ];
      } else {
        filtros.esPublico = true;
      }

      const archivo = await Archivo.findOne(filtros).populate('usuario', 'nombre email');
      
      if (!archivo) {
        throw new Error('Archivo no encontrado');
      }

      // Verificar que el archivo físico existe
      try {
        await fs.access(archivo.ruta);
      } catch {
        throw new Error('Archivo físico no encontrado');
      }

      return archivo;

    } catch (error) {
      console.error('Error al obtener archivo:', error);
      throw error;
    }
  }

  /**
   * Listar archivos del usuario
   */
  async listarArchivos(usuarioId, opciones = {}) {
    try {
      const {
        pagina = 1,
        limite = 20,
        categoria = null,
        tipoMime = null,
        busqueda = null,
        ordenPor = 'fechaSubida',
        orden = 'desc'
      } = opciones;

      const filtros = { usuario: usuarioId };
      
      if (categoria) filtros.categoria = categoria;
      if (tipoMime) filtros.tipoMime = new RegExp(tipoMime, 'i');
      if (busqueda) {
        filtros.$or = [
          { nombreOriginal: new RegExp(busqueda, 'i') },
          { descripcion: new RegExp(busqueda, 'i') }
        ];
      }

      const skip = (parseInt(pagina) - 1) * parseInt(limite);
      const sortOrder = orden === 'desc' ? -1 : 1;

      const [archivos, total] = await Promise.all([
        Archivo.find(filtros)
          .sort({ [ordenPor]: sortOrder })
          .limit(parseInt(limite))
          .skip(skip)
          .populate('usuario', 'nombre email'),
        Archivo.countDocuments(filtros)
      ]);

      return {
        archivos,
        paginacion: {
          paginaActual: parseInt(pagina),
          totalPaginas: Math.ceil(total / parseInt(limite)),
          totalElementos: total,
          elementosPorPagina: parseInt(limite)
        }
      };

    } catch (error) {
      console.error('Error al listar archivos:', error);
      throw new Error('Error al obtener la lista de archivos');
    }
  }

  /**
   * Eliminar archivo
   */
  async eliminarArchivo(archivoId, usuarioId) {
    try {
      const archivo = await Archivo.findOne({
        _id: archivoId,
        usuario: usuarioId
      });

      if (!archivo) {
        throw new Error('Archivo no encontrado');
      }

      // Eliminar archivos físicos
      await this.eliminarArchivoFisico(archivo.ruta);
      
      if (archivo.rutaOptimizada) {
        await this.eliminarArchivoFisico(archivo.rutaOptimizada);
      }
      
      if (archivo.rutaThumbnail) {
        await this.eliminarArchivoFisico(archivo.rutaThumbnail);
      }

      // Eliminar registro de la base de datos
      await Archivo.findByIdAndDelete(archivoId);

      return true;

    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      throw error;
    }
  }

  /**
   * Eliminar archivo físico
   */
  async eliminarArchivoFisico(rutaArchivo) {
    try {
      await fs.unlink(rutaArchivo);
    } catch (error) {
      // No lanzar error si el archivo no existe
      if (error.code !== 'ENOENT') {
        console.error('Error al eliminar archivo físico:', error);
      }
    }
  }

  /**
   * Obtener estadísticas de archivos del usuario
   */
  async obtenerEstadisticas(usuarioId) {
    try {
      const estadisticas = await Archivo.aggregate([
        { $match: { usuario: mongoose.Types.ObjectId(usuarioId) } },
        {
          $group: {
            _id: null,
            totalArchivos: { $sum: 1 },
            tamanoTotal: { $sum: '$tamano' },
            tiposMime: { $addToSet: '$tipoMime' },
            categorias: { $addToSet: '$categoria' }
          }
        },
        {
          $project: {
            _id: 0,
            totalArchivos: 1,
            tamanoTotal: 1,
            tamanoTotalMB: { $divide: ['$tamanoTotal', 1048576] },
            tiposMime: 1,
            categorias: 1
          }
        }
      ]);

      const estadisticasPorTipo = await Archivo.aggregate([
        { $match: { usuario: mongoose.Types.ObjectId(usuarioId) } },
        {
          $group: {
            _id: '$tipoMime',
            cantidad: { $sum: 1 },
            tamanoTotal: { $sum: '$tamano' }
          }
        },
        { $sort: { cantidad: -1 } }
      ]);

      const estadisticasPorCategoria = await Archivo.aggregate([
        { $match: { usuario: mongoose.Types.ObjectId(usuarioId) } },
        {
          $group: {
            _id: '$categoria',
            cantidad: { $sum: 1 },
            tamanoTotal: { $sum: '$tamano' }
          }
        },
        { $sort: { cantidad: -1 } }
      ]);

      return {
        resumen: estadisticas[0] || {
          totalArchivos: 0,
          tamanoTotal: 0,
          tamanoTotalMB: 0,
          tiposMime: [],
          categorias: []
        },
        porTipo: estadisticasPorTipo,
        porCategoria: estadisticasPorCategoria
      };

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw new Error('Error al obtener estadísticas de archivos');
    }
  }

  /**
   * Limpiar archivos temporales antiguos
   */
  async limpiarArchivosTemporales(horasAntiguedad = 24) {
    try {
      const tempDir = path.join(this.uploadsDir, 'temp');
      const files = await fs.readdir(tempDir);
      const ahora = Date.now();
      const limiteTiempo = horasAntiguedad * 60 * 60 * 1000;
      let archivosEliminados = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (ahora - stats.mtime.getTime() > limiteTiempo) {
          await this.eliminarArchivoFisico(filePath);
          archivosEliminados++;
        }
      }

      return archivosEliminados;

    } catch (error) {
      console.error('Error al limpiar archivos temporales:', error);
      return 0;
    }
  }

  /**
   * Validar archivo antes de la subida
   */
  validarArchivo(file) {
    const errores = [];

    // Verificar tipo de archivo
    if (!this.allowedTypes.includes(file.mimetype)) {
      errores.push(`Tipo de archivo no permitido: ${file.mimetype}`);
    }

    // Verificar tamaño
    if (file.size > this.maxFileSize) {
      errores.push(`Archivo demasiado grande. Máximo permitido: ${this.maxFileSize / 1048576}MB`);
    }

    // Verificar nombre de archivo
    if (file.originalname.length > 255) {
      errores.push('Nombre de archivo demasiado largo');
    }

    // Verificar caracteres peligrosos en el nombre
    const nombrePeligroso = /[<>:"/\\|?*\x00-\x1f]/;
    if (nombrePeligroso.test(file.originalname)) {
      errores.push('Nombre de archivo contiene caracteres no permitidos');
    }

    return {
      esValido: errores.length === 0,
      errores
    };
  }

  /**
   * Generar URL de acceso al archivo
   */
  generarUrlArchivo(archivo, tipo = 'original') {
    const baseUrl = config.servidor.urlBase || `http://localhost:${config.servidor.puerto}`;
    
    switch (tipo) {
      case 'thumbnail':
        return archivo.rutaThumbnail ? `${baseUrl}/api/archivos/${archivo._id}/thumbnail` : null;
      case 'optimized':
        return archivo.rutaOptimizada ? `${baseUrl}/api/archivos/${archivo._id}/optimized` : null;
      default:
        return `${baseUrl}/api/archivos/${archivo._id}`;
    }
  }

  /**
   * Obtener información del archivo sin descargarlo
   */
  async obtenerInfoArchivo(archivoId, usuarioId = null) {
    try {
      const archivo = await this.obtenerArchivo(archivoId, usuarioId);
      
      return {
        id: archivo._id,
        nombreOriginal: archivo.nombreOriginal,
        tipoMime: archivo.tipoMime,
        tamano: archivo.tamano,
        categoria: archivo.categoria,
        descripcion: archivo.descripcion,
        fechaSubida: archivo.fechaSubida,
        metadata: archivo.metadata,
        urls: {
          original: this.generarUrlArchivo(archivo, 'original'),
          optimized: this.generarUrlArchivo(archivo, 'optimized'),
          thumbnail: this.generarUrlArchivo(archivo, 'thumbnail')
        }
      };

    } catch (error) {
      console.error('Error al obtener info del archivo:', error);
      throw error;
    }
  }
}

module.exports = FileService;