/**
 * site.ts — TODO lo editable del sitio salvo la carta de vinos (ver wines.ts).
 *
 * ⚠️ ANTES DE PUBLICAR: rellena `contact` y `titular` con datos REALES. La web
 * deriva pedidos por WhatsApp (contratación a distancia), así que la LSSI exige
 * identificar al vendedor (nombre/NIF/domicilio/email/teléfono) en el Aviso Legal.
 */

export interface SiteConfig {
  brandName: string;
  contact: {
    /** Número de WhatsApp en formato E.164 SIN '+'. ⚠️ RELLENAR con el real. */
    whatsappNumber: string;
    email: string;
    telefono: string;
  };
  /** Datos del titular para el Aviso Legal (LSSI art. 10). ⚠️ RELLENAR. */
  titular: {
    nombre: string;
    nif: string;
    domicilio: string;
  };
  reparto: {
    zona: string;
    envioNacional: boolean;
    pedidoMinimo: string;
    plazo: string;
    nota: string;
  };
  hero: { h1: string; sub: string };
  story: { title: string; body: string };
  benefits: { icon: 'grape' | 'heart-handshake' | 'truck' | 'message-circle'; title: string; body: string }[];
  testimonials: { text: string; who: string }[];
  faq: { q: string; a: string }[];
  finalCta: { headline: string; sub: string };
  /** Plantilla del mensaje de WhatsApp. {{NOMBRE}} y {{ANADA}} se sustituyen. */
  whatsappTemplate: string;
  /** Microcopy fijo bajo cada CTA (no es pago, edad en entrega). No quitar. */
  ctaMicrocopy: string;
  legalNotices: {
    edad: string;       // venta prohibida a menores
    salud: string;      // advertencia sanitaria (tono advertencia, no reclamo)
    embarazo: string;   // grupos vulnerables
  };
}

export const site: SiteConfig = {
  brandName: 'Bodega Viento de Almara',

  contact: {
    // ⚠️ RELLENAR: número real con prefijo de país, sin '+'. Ej. 34699111222
    whatsappNumber: '34600000000',
    email: 'hola@vientodealmara.example', // ⚠️ RELLENAR
    telefono: '+34 600 000 000',           // ⚠️ RELLENAR
  },

  titular: {
    nombre: '⚠️ RELLENAR — Nombre y apellidos o razón social del titular',
    nif: '⚠️ RELLENAR — NIF/CIF',
    domicilio: '⚠️ RELLENAR — Domicilio fiscal',
  },

  reparto: {
    zona: 'Comunidad Valenciana y alrededores', // ⚠️ ajustar a la zona real
    envioNacional: false,
    pedidoMinimo: '6 botellas (puedes combinar referencias)',
    plazo: '2-4 días laborables',
    nota: 'Entrega coordinada por WhatsApp. En la entrega podemos pedir un documento que acredite la mayoría de edad.',
  },

  hero: {
    h1: 'Vinos que saben al lugar donde nacen',
    sub: 'Una bodega familiar en el corazón de España. Pocas botellas, mucho oficio. Elige tu vino y pídelo directamente por WhatsApp.',
  },

  story: {
    title: 'Tres generaciones, una misma tierra',
    body:
      'Almara empezó con una hilera de viñas viejas y la terquedad de un abuelo que creía que el vino se hace en el campo, no en el despacho. Seguimos igual: vendimia a mano, producciones cortas y la paciencia de dejar que cada añada diga lo que tenga que decir. No somos una gran marca ni queremos serlo: cuidamos cada botella como si fuera la primera. Aquí no hay carrito ni letra pequeña. Escríbenos, te asesoramos como en la barra de siempre y coordinamos tu pedido por WhatsApp.',
  },

  benefits: [
    { icon: 'grape', title: 'Selección del bodeguero', body: 'Producciones cortas, vendimia a mano. Solo lo que firmaríamos con nuestro nombre.' },
    { icon: 'message-circle', title: 'Trato directo', body: 'Sin intermediarios. Hablas con quien hace el vino y te asesora de verdad.' },
    { icon: 'truck', title: 'Entrega cercana', body: 'Coordinamos la entrega por WhatsApp en nuestra zona de reparto.' },
  ],

  testimonials: [
    { text: 'El trato es de bodega de pueblo, cercano y honesto. Acertaron con la recomendación a la primera.', who: 'Cliente habitual' },
    { text: 'Pedí por WhatsApp y me lo explicaron todo con paciencia. Vinos con carácter.', who: 'Aficionada al vino' },
  ],

  faq: [
    { q: '¿Cómo hago el pedido?', a: 'Pulsa el botón de WhatsApp del vino que te interese. Se abre una conversación con un mensaje listo para enviar; nosotros te confirmamos disponibilidad, precio y entrega. No se realiza ningún pago en esta web.' },
    { q: '¿A qué zona entregáis?', a: 'Repartimos en la Comunidad Valenciana y alrededores. Si tienes dudas con tu zona, pregúntanos por WhatsApp antes de pedir.' },
    { q: '¿Hay pedido mínimo?', a: 'Sí, el pedido mínimo es de 6 botellas y puedes combinar referencias.' },
    { q: '¿Cómo se paga?', a: 'El pago se acuerda directamente con nosotros al cerrar el pedido (no se paga en la web).' },
    { q: '¿Hay que ser mayor de edad?', a: 'Sí. La venta y el suministro de alcohol están prohibidos a menores de 18 años. En la entrega podemos solicitar un documento que acredite la edad.' },
    { q: '¿Cómo conservo el vino?', a: 'En un lugar fresco, oscuro y sin vibraciones, las botellas tumbadas. Te indicamos la temperatura de servicio de cada vino en su ficha.' },
  ],

  finalCta: {
    headline: '¿Hablamos de vino?',
    sub: 'Cuéntanos qué te apetece y para cuándo. Te respondemos personalmente por WhatsApp y preparamos tu pedido.',
  },

  whatsappTemplate: 'Hola, soy mayor de 18 años y me interesa el vino «{{NOMBRE}}»{{ANADA}}. ¿Me cuentas disponibilidad, precio y cómo hacer el pedido? ¡Gracias!',

  ctaMicrocopy: 'Se abre WhatsApp para consultar. No se realiza ningún pago en esta web; en la entrega podemos pedir un documento que acredite tu edad.',

  legalNotices: {
    edad: 'Venta y suministro prohibidos a menores de 18 años (Ley 6/2025).',
    salud: 'El consumo excesivo de alcohol es perjudicial para la salud.',
    embarazo: 'El consumo de alcohol durante el embarazo o la lactancia conlleva riesgos graves para la salud.',
  },
};
