import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

/**
 * Tarjeta para mostrar detalles del anunciante
 * @param {{name: string, country: string, dateAdded: string, verified: boolean}} props
 */
export default function AdvertiserCard({ name, country, dateAdded, verified }) {
  return (
    <div className="bg-white shadow-md rounded-md p-4 max-w-sm">
      <h2 className="text-lg font-semibold mb-2">Anunciante</h2>
      <p><strong>Nombre:</strong> {name}</p>
      <p><strong>País:</strong> {country}</p>
      <p><strong>Fecha de alta:</strong> {new Date(dateAdded).toLocaleDateString('es-ES')}</p>
      <p className="flex items-center">
        <strong>Verificado:</strong>
        {verified ? (
          <CheckCircle className="ml-2 text-green-500" aria-label="Verificado" />
        ) : (
          <XCircle className="ml-2 text-red-500" aria-label="No verificado" />
        )}
      </p>
    </div>
  );
}
