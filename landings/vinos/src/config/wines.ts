/**
 * wines.ts — la carta de vinos. Tu amigo edita SOLO este archivo para añadir,
 * quitar o cambiar vinos: cambia textos y colores y la web se repuebla.
 *
 * Reglas legales (España, Ley 6/2025 + etiquetado UE) que NO debes quitar:
 *  - `graduacion` (% vol.) es obligatoria y se muestra en cada ficha.
 *  - `contieneSulfitos` muestra el alérgeno obligatorio "Contiene sulfitos".
 *  - El copy NO puede asociar el vino a éxito social/sexual, rendimiento, ni
 *    presentarlo como saludable; ni usar "consumo responsable" como reclamo.
 */

export interface Wine {
  id: string;            // slug único (ancla de navegación)
  nombre: string;
  tipo: string;          // "Tinto Crianza", "Blanco", "Rosado", "Tinto Reserva"...
  denominacion: string;  // D.O. / D.O.Ca. / IGP
  uvas: string;
  anada: string;         // año, o "s/a" si sin añada
  graduacion: string;    // "% vol." — OBLIGATORIO
  contieneSulfitos: boolean; // true → muestra "Contiene sulfitos" (alérgeno UE)
  notasCata: string;
  maridaje: string;
  descripcionCorta: string;
  premios?: string;      // solo si es real y verificable
  colorEtiqueta: string; // hex — color de la etiqueta del placeholder de botella
  colorVidrio: string;   // hex — color del vidrio del placeholder de botella
  disponible?: boolean;  // false → tarjeta atenuada + "Consultar disponibilidad"
  temperatura?: string;
  volumen?: string;
  imagen?: string;       // si hay foto real, sustituye al placeholder SVG
  infoProductoUrl?: string; // enlace/QR a ingredientes + info nutricional (Reg. UE 2021/2117)
  waMensaje?: string;    // sobrescribe la plantilla global de WhatsApp para este vino
}

export const wines: Wine[] = [
  {
    id: 'goye-malbec-roble',
    nombre: 'GOYE Malbec Roble',
    tipo: 'Tinto · Roble',
    denominacion: 'San Rafael · Mendoza (Argentina)',
    uvas: 'Malbec',
    anada: '2022',
    graduacion: '14% vol.', // ⚠️ verifica el grado real en la contraetiqueta
    contieneSulfitos: true,
    notasCata:
      'Rojo violáceo intenso y brillante. En nariz, ciruela y mora maduras con un fondo de vainilla y especias dulces del paso por roble. En boca es amable y goloso, de taninos suaves y un final medio, equilibrado.',
    maridaje: 'Carnes a la parrilla, asados, pastas con salsa de tomate y quesos semicurados.',
    descripcionCorta: 'Nuestro Malbec con paso por roble: redondo, especiado y muy fácil de querer.',
    colorEtiqueta: '#6e1423',
    colorVidrio: '#20331f',
    disponible: true,
    temperatura: '16-18 °C',
    volumen: '75 cl',
    imagen: '/assets/photos/goye.webp',
  },
  {
    id: 'vall-del-silenci-albarino',
    nombre: 'Vall del Silenci Albariño',
    tipo: 'Blanco',
    denominacion: 'D.O. Rías Baixas',
    uvas: 'Albariño 100%',
    anada: '2023',
    graduacion: '12,5% vol.',
    contieneSulfitos: true,
    notasCata:
      'Amarillo pajizo con destellos verdosos. Nariz franca y atlántica: manzana verde, melocotón blanco, flor de azahar y un punto salino. En boca es vibrante y fresco, de acidez marcada y final cítrico persistente.',
    maridaje: 'Mariscos, pulpo a feira, pescados a la plancha, sushi y arroces marineros.',
    descripcionCorta: 'Un albariño atlántico, salino y luminoso, de producción corta.',
    premios: 'Medalla de Plata, Concurso Mundial de Bruselas 2024',
    colorEtiqueta: '#c9b458',
    colorVidrio: '#3c5a34',
    disponible: true,
    temperatura: '8-10 °C',
    volumen: '75 cl',
    imagen: '/assets/photos/blanco.webp',
  },
  {
    id: 'hora-magica-rosado',
    nombre: 'Hora Mágica Rosado',
    tipo: 'Rosado',
    denominacion: 'D.O. Navarra',
    uvas: 'Garnacha 100%',
    anada: '2023',
    graduacion: '13% vol.',
    contieneSulfitos: true,
    notasCata:
      'Rosa pálido de tono frambuesa con lágrima fina. En nariz, fresón, grosella y pétalos de rosa. En boca es seco, jugoso y delicado, con una acidez fresca y un final afrutado.',
    maridaje: 'Ensaladas, arroces, embutidos ibéricos, sushi y aperitivos.',
    descripcionCorta: 'Garnacha sangrada: un rosado seco y luminoso.',
    colorEtiqueta: '#7a1224',
    colorVidrio: '#caa0a6',
    disponible: true,
    temperatura: '6-8 °C',
    volumen: '75 cl',
  },
  {
    id: 'el-legado-reserva',
    nombre: 'El Legado Reserva',
    tipo: 'Tinto Reserva',
    denominacion: 'D.O. Ribera del Duero',
    uvas: 'Tinta del País (Tempranillo) 100%',
    anada: '2018',
    graduacion: '14,5% vol.',
    contieneSulfitos: true,
    notasCata:
      'Rojo cereza profundo con ribete teja. Nariz compleja: fruta negra madura, cacao, tabaco de pipa y especias dulces tras 18 meses en barrica y dos años en botella. Boca amplia y estructurada, de taninos firmes pero domados y un final muy largo.',
    maridaje: 'Carnes rojas a la parrilla, lechazo, caza mayor y quesos azules.',
    descripcionCorta: 'La joya de la casa: una reserva paciente de Ribera.',
    premios: '92 puntos James Suckling 2023',
    colorEtiqueta: '#3b1018',
    colorVidrio: '#241016',
    disponible: true,
    temperatura: '17-18 °C',
    volumen: '75 cl',
  },
];
