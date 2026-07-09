import { site } from './site';

/**
 * legal.ts — textos legales base, parametrizados con los datos del titular de
 * site.ts. Son una BASE razonable, NO asesoramiento jurídico: conviene que un
 * profesional los revise antes de publicar, y rellenar los datos marcados ⚠️.
 */

export interface LegalDoc {
  id: string;
  title: string;
  body: string; // párrafos separados por \n\n
}

const t = site.titular;
const c = site.contact;

export const legalDocs: LegalDoc[] = [
  {
    id: 'aviso-legal',
    title: 'Aviso legal',
    body:
      `Titular del sitio web: ${t.nombre} · NIF/CIF: ${t.nif} · Domicilio: ${t.domicilio}. ` +
      `Contacto: ${c.email} · ${c.telefono}.\n\n` +
      `Este sitio es un escaparate informativo de los vinos de ${site.brandName}. No se realizan ventas ni cobros en la web: los pedidos se consultan y coordinan directamente por WhatsApp. El precio final, los gastos de envío, la forma de pago y la entrega se acuerdan con el titular.\n\n` +
      `La venta y el suministro de bebidas alcohólicas a menores de 18 años están prohibidos (Ley 6/2025). En el momento de la entrega se podrá exigir un documento oficial que acredite la mayoría de edad.\n\n` +
      `Queda prohibida la reproducción total o parcial de los contenidos sin autorización del titular.`,
  },
  {
    id: 'privacidad',
    title: 'Política de privacidad',
    body:
      `Responsable del tratamiento: ${t.nombre} (NIF ${t.nif}), ${t.domicilio}. Contacto: ${c.email}.\n\n` +
      `Finalidades y base jurídica: (1) atender tu consulta o pedido cuando nos escribes por WhatsApp — base: ejecución de medidas precontractuales a petición del interesado (art. 6.1.b RGPD); (2) medición de campañas mediante parámetros de origen (utm_*) y un evento de clic anónimo, solo si aceptas las cookies analíticas — base: consentimiento (art. 6.1.a RGPD).\n\n` +
      `Derivación a WhatsApp: al pulsar un botón de pedido se abre WhatsApp (Meta Platforms Ireland Ltd.). El tratamiento de tu número y tu mensaje queda sujeto también a la política de privacidad de WhatsApp, que puede implicar transferencias internacionales de datos.\n\n` +
      `Conservación: los datos se conservan el tiempo necesario para atender tu pedido y cumplir obligaciones legales. Derechos: puedes ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${c.email}, así como reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`,
  },
  {
    id: 'cookies',
    title: 'Política de cookies',
    body:
      `Almacenamiento técnico necesario: guardamos en tu navegador (localStorage) la confirmación de que eres mayor de edad para no volver a preguntártelo durante un tiempo. Es imprescindible para prestar el servicio y no requiere consentimiento.\n\n` +
      `Cookies/medición no esenciales: si las aceptas, registramos de forma anónima los clics en los botones de pedido y los parámetros de origen de la campaña (utm_*) para saber qué canales funcionan. Puedes rechazarlas: por defecto están desactivadas y no se envía ningún dato de medición hasta que las aceptas.\n\n` +
      `Puedes cambiar tu elección borrando los datos del sitio en tu navegador. No usamos cookies publicitarias de terceros.`,
  },
];
