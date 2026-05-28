import React, { useEffect, useRef, useState } from 'react';
import { CatalogTarget, FOVOverlay } from '../../types/module3';
import { createFOVOverlay, calculateFOV } from '../../services/module3/framingService';

interface AladinFramerProps {
  target: CatalogTarget;
  focalLength: number;
  sensorWidth: number;
  sensorHeight: number;
  rotationAngle: number;
  onRotationChange: (angle: number) => void;
}

/**
 * Framing Assistant avec Aladin Lite v3.
 * Intégration via iframe (script Aladin) ou div avec JS API.
 */
export const AladinFramer: React.FC<AladinFramerProps> = ({
  target,
  focalLength,
  sensorWidth,
  sensorHeight,
  rotationAngle,
  onRotationChange,
}) => {
  const aladinRef = useRef<HTMLDivElement>(null);
  const [aladinLoaded, setAladinLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  const fov = calculateFOV(sensorWidth, sensorHeight, focalLength);

  useEffect(() => {
    // Vérifier si Aladin est déjà chargé
    if ((window as any).A) {
      setAladinLoaded(true);
      return;
    }

    // Charger Aladin Lite v3 dynamiquement
    const script = document.createElement('script');
    script.src = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js';
    script.charset = 'utf-8';
    script.onload = () => {
      setAladinLoaded(true);
    };
    script.onerror = () => {
      console.error('Erreur chargement Aladin Lite');
      setScriptError(true);
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!aladinLoaded || !aladinRef.current || !(window as any).A) return;

    try {
      const A = (window as any).A;
      const aladin = A.aladin(aladinRef.current, {
        target: `${target.ra} ${target.dec}`,
        fov: fov.diagonalArcmin / 60,
        cooFrame: 'ICRS',
        showReticle: false,
        showZoomControl: true,
        showFullscreenControl: false,
        showLayersControl: true,
        showGotoControl: true,
        showCoordinates: true,
        showFrame: true,
        survey: 'P/DSS2/color',
      });

      // Overlay FOV
      const overlay = createFOVOverlay(
        target.raDeg,
        target.decDeg,
        fov.widthArcmin,
        fov.heightArcmin,
        rotationAngle
      );

      // Ajouter le rectangle FOV comme overlay
      const rect = A.graphicOverlay({
        name: 'FOV',
        color: overlay.color,
        lineWidth: 2,
      });
      aladin.addOverlay(rect);

      // Dessiner le rectangle pivoté (approximation avec 4 coins)
      const corners = getRotatedCorners(
        overlay.centerRADeg,
        overlay.centerDecDeg,
        overlay.widthArcmin / 60,
        overlay.heightArcmin / 60,
        overlay.rotationAngle
      );
      rect.addFootprints([A.polygon(corners)]);
    } catch (err) {
      console.error('Erreur initialisation Aladin:', err);
      setScriptError(true);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aladinLoaded, target, focalLength, sensorWidth, sensorHeight, rotationAngle]);

  // Afficher message d'erreur si Aladin ne charge pas
  if (scriptError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Framing — {target.catalogName}</h4>
        </div>
        <div className="p-8 rounded border bg-red-50 text-center">
          <p className="text-red-600 font-medium">⚠️ Erreur de chargement Aladin</p>
          <p className="text-sm text-red-500 mt-2">
            Impossible de charger le viewer. Vérifiez votre connexion internet.
          </p>
          <div className="mt-4 text-sm text-slate-600">
            <p>FOV: {fov.widthArcmin.toFixed(2)}′ × {fov.heightArcmin.toFixed(2)}′</p>
            <p>PA: {rotationAngle}°</p>
            <p>Cible: {target.ra} {target.dec}</p>
          </div>
        </div>
      </div>
    );
  }

  // Afficher loading pendant le chargement
  if (!aladinLoaded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Framing — {target.catalogName}</h4>
        </div>
        <div
          ref={aladinRef}
          style={{ width: '100%', height: '500px' }}
          className="rounded border flex items-center justify-center bg-slate-50"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-slate-500">Chargement d'Aladin Lite...</p>
          </div>
        </div>
      </div>
    );
  }

  // Rendu normal Aladin chargé
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Framing — {target.catalogName}</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">PA:</span>
          <input
            type="number"
            value={rotationAngle}
            onChange={(e) => onRotationChange(Number(e.target.value))}
            className="w-20 px-2 py-1 rounded border"
          />
          <span className="text-sm text-gray-500">°</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onRotationChange(rotationAngle - 90)}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          -90°
        </button>
        <button
          onClick={() => onRotationChange(rotationAngle + 90)}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          +90°
        </button>
        <button
          onClick={() => onRotationChange(0)}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          Reset
        </button>
      </div>

      <div
        ref={aladinRef}
        style={{ width: '100%', height: '500px' }}
        className="rounded border"
      />

      <div className="text-sm text-gray-500 flex justify-between">
        <span>FOV: {fov.widthArcmin.toFixed(2)}′ × {fov.heightArcmin.toFixed(2)}′</span>
        <span>PA: {rotationAngle}°</span>
      </div>
    </div>
  );
};

/**
 * Calcule les 4 coins d'un rectangle FOV pivoté.
 */
function getRotatedCorners(
  centerRA: number,
  centerDec: number,
  widthDeg: number,
  heightDeg: number,
  rotationDeg: number
): [number, number][] {
  const rotRad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  const hw = widthDeg / 2;
  const hh = heightDeg / 2;

  // Coins non pivotés (relatifs au centre)
  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];

  return corners.map(([x, y]) => {
    const rx = x * cosR - y * sinR;
    const ry = x * sinR + y * cosR;

    // Correction cos(dec) pour RA
    const ra = centerRA + rx / Math.cos((centerDec * Math.PI) / 180);
    const dec = centerDec + ry;

    return [ra, dec] as [number, number];
  });
}
