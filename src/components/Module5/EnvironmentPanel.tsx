import React from 'react';
import {
  EnvironmentConditions,
  DewAlert,
  DewRiskLevel,
} from '../../types/module5';
import { generateDashboardAlerts } from '../../services/module5/sqmService';

interface DewAlertProps {
  alert: DewAlert;
}

/**
 * Composant alerte rosée (Point #4 v3)
 * Affiche une alerte conditionnelle selon le niveau de risque.
 */
export const DewAlertCard: React.FC<DewAlertProps> = ({ alert }) => {
  const colors: Record<DewRiskLevel, string> = {
    Safe: 'bg-green-50 border-green-200 text-green-800',
    Warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    Critical: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[alert.level]}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">
          {alert.level === 'Safe' && '✅'}
          {alert.level === 'Warning' && '⚠️'}
          {alert.level === 'Critical' && '🚨'}
        </span>
        <div>
          <p className="font-semibold">{alert.message}</p>
          <p className="text-sm mt-1 opacity-90">{alert.recommendation}</p>
        </div>
      </div>
    </div>
  );
};

interface EnvironmentPanelProps {
  conditions: EnvironmentConditions;
}

/**
 * Panneau environnement complet avec SQM + rosée + météo.
 */
export const EnvironmentPanel: React.FC<EnvironmentPanelProps> = ({ conditions }) => {
  const { dewAlert, sqmAlert } = generateDashboardAlerts(conditions);

  return (
    <div className="space-y-4">
      <DewAlertCard alert={dewAlert} />

      {sqmAlert && (
        <div
          className={`p-3 rounded-lg border ${
            sqmAlert.severity === 'critical'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          <p className="font-semibold">💡 {sqmAlert.message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded border">
          <p className="text-xs text-gray-500">Température</p>
          <p className="text-lg font-bold">{conditions.temperature}°C</p>
        </div>
        <div className="p-3 bg-white rounded border">
          <p className="text-xs text-gray-500">Point de rosée</p>
          <p className="text-lg font-bold">{conditions.dewpoint}°C</p>
        </div>
        <div className="p-3 bg-white rounded border">
          <p className="text-xs text-gray-500">Humidité</p>
          <p className="text-lg font-bold">{conditions.humidity}%</p>
        </div>
        <div className="p-3 bg-white rounded border">
          <p className="text-xs text-gray-500">Nuages</p>
          <p className="text-lg font-bold">{conditions.cloudCover}%</p>
        </div>
        <div className="p-3 bg-white rounded border">
          <p className="text-xs text-gray-500">Vent</p>
          <p className="text-lg font-bold">{conditions.windSpeed} km/h</p>
        </div>
        <div className="p-3 bg-white rounded border">
          <p className="text-xs text-gray-500">Seeing</p>
          <p className="text-lg font-bold">Antoniadi {conditions.seeing}</p>
        </div>
        <div className="p-3 bg-white rounded border">
          <p className="text-xs text-gray-500">Δ Rosée</p>
          <p className={`text-lg font-bold ${
            conditions.dewRisk === 'Critical' ? 'text-red-600' :
            conditions.dewRisk === 'Warning' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {conditions.dewPointDelta}°C
          </p>
        </div>
        <div className="p-3 bg-white rounded border">
          <p className="text-xs text-gray-500">SQM Effectif</p>
          <p className="text-lg font-bold">{conditions.sqm.sqmEffective}</p>
        </div>
      </div>
    </div>
  );
};
