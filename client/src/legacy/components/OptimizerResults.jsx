import React from 'react';
import Card from './Card';
import StatCard from './StatCard';
import Badge from './Badge';
import Button from './Button';
import { DollarSign, MousePointer, TrendingUp, Info } from 'lucide-react';

/**
 * Visual results for campaign optimization
 */
const OptimizerResults = ({ 
  results, 
  loading, 
  onLaunch, 
  budget, 
  onBudgetChange 
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-500 font-medium">Optimizando tu campaña...</p>
      </div>
    );
  }

  if (!results || !results.allocation || results.allocation.length === 0) {
    return (
      <Card className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
          <Info className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No se encontraron canales</h3>
        <p className="mt-1 text-sm text-gray-500">
          Intenta ajustar tu presupuesto o filtros para ver canales recomendados.
        </p>
      </Card>
    );
  }

  const { totalBudgetUsed, expectedClicks, allocation } = results;
  const estimatedCPC = expectedClicks > 0 ? (totalBudgetUsed / expectedClicks).toFixed(2) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Resultados estimados</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Presupuesto utilizado"
            value={`${totalBudgetUsed.toLocaleString()}€`}
            icon={<DollarSign className="h-6 w-6 text-primary-600" />}
          />
          <StatCard
            title="Clics esperados"
            value={expectedClicks.toLocaleString()}
            icon={<MousePointer className="h-6 w-6 text-primary-600" />}
          />
          <StatCard
            title="CPC estimado"
            value={`${estimatedCPC}€`}
            icon={<TrendingUp className="h-6 w-6 text-primary-600" />}
          />
        </div>
      </div>

      {/* Budget Adjustment */}
      <Card title="Ajustar Presupuesto" padding="default">
        <div className="px-2">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-medium text-gray-700">Límite de presupuesto</span>
            <span className="text-2xl font-bold text-primary-600">{budget}€</span>
          </div>
          <input
            type="range"
            min="10"
            max="5000"
            step="10"
            value={budget}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <div className="flex justify-between mt-3 text-xs text-gray-500 font-medium">
            <span>10€</span>
            <span>2500€</span>
            <span>5000€</span>
          </div>
        </div>
      </Card>

      {/* Allocation List */}
      <Card 
        title="Asignación Recomendada" 
        subtitle="Canales seleccionados basados en rendimiento, precio y relevancia"
      >
        <div className="overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {allocation.map((item, index) => (
              <li key={item.channelId} className="py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors px-4 -mx-4">
                <div className="flex flex-col mb-3 sm:mb-0">
                  <span className="text-base font-bold text-gray-900">{item.name}</span>
                  <div className="flex items-center mt-2 space-x-2">
                    {index === 0 && <Badge variant="success" size="sm">Mejor valor</Badge>}
                    {index === 1 && <Badge variant="primary" size="sm">Alto rendimiento</Badge>}
                    {index > 1 && <Badge variant="info" size="sm">Recomendado</Badge>}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:space-x-12">
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Precio</span>
                    <span className="text-lg font-bold text-gray-900">{item.price}€</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Clics previstos</span>
                    <span className="text-lg font-bold text-primary-600">{item.expectedClicks}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Explanation & CTA */}
      <div className="flex flex-col items-center space-y-6 py-4">
        <div className="flex items-center text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
          <Info className="h-4 w-4 mr-2 text-gray-400" />
          <p className="text-sm">
            La selección se actualiza dinámicamente según tu presupuesto.
          </p>
        </div>
        
        <Button size="lg" onClick={onLaunch} className="w-full md:w-auto px-16 py-4 text-lg shadow-lg hover:shadow-xl transition-all">
          Lanzar campaña ahora
        </Button>
        
        <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed">
          Al lanzar esta campaña, aceptas asignar el presupuesto especificado a través de estos canales optimizados.
        </p>
      </div>
    </div>
  );
};

export default OptimizerResults;
