// ============================================================================
// NINA Target Export — Minimalist format for use with existing NINA templates
// Only exports: target coordinates, start time, exposures (filter, duration, count)
// No slew/guiding/autofocus/triggers — your NINA template handles that.
// ============================================================================

import type { Project } from '../../types/project';
import type { PlannerResult } from '../plannerService';

// --- NINA JSON types (minimal subset) ---

let _idCounter = 1;
function nextId(): string { return String(_idCounter++); }
function resetIdCounter(): void { _idCounter = 1; }

interface NinaObj {
  $id: string;
  $type: string;
  [key: string]: unknown;
}

interface NinaCollection {
  $id: string;
  $type: string;
  $values: NinaObj[];
}

function mkCollection(type: string, values: NinaObj[] = []): NinaCollection {
  return {
    $id: nextId(),
    $type: `System.Collections.ObjectModel.ObservableCollection\`1[[${type}, NINA.Sequencer]], System`,
    $values: values,
  };
}

function mkInstruction(typeName: string, fields: Record<string, unknown> = {}): NinaObj {
  return {
    $id: nextId(),
    $type: `NINA.Sequencer.SequenceItem.${typeName}, NINA.Sequencer`,
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
    ...fields,
  };
}

function mkSequentialContainer(name: string, items: NinaObj[]): NinaObj {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.Container.SequentialContainer, NINA.Sequencer',
    Strategy: { $type: 'NINA.Sequencer.Container.ExecutionStrategy.SequentialStrategy, NINA.Sequencer' },
    Name: name,
    Conditions: mkCollection('NINA.Sequencer.Conditions.ISequenceCondition, NINA.Sequencer'),
    IsExpanded: true,
    Items: mkCollection('NINA.Sequencer.SequenceItem.ISequenceItem, NINA.Sequencer', items),
    Triggers: mkCollection('NINA.Sequencer.Trigger.ISequenceTrigger, NINA.Sequencer'),
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

// --- Helpers ---

function parseRA(ra: string | number): { hours: number; minutes: number; seconds: number } {
  if (typeof ra === 'number') {
    // Already in hours (decimal)
    return {
      hours: Math.floor(ra),
      minutes: Math.floor((ra % 1) * 60),
      seconds: Math.round(((ra % 1) * 60 % 1) * 60),
    };
  }
  const parts = ra.split(':').map(Number);
  return {
    hours: Math.floor(parts[0] || 0),
    minutes: Math.floor(parts[1] || 0),
    seconds: parseFloat(parts[2]?.toString() || '0'),
  };
}

function parseDec(dec: string | number): { degrees: number; minutes: number; seconds: number } {
  if (typeof dec === 'number') {
    const sign = dec < 0 ? -1 : 1;
    const abs = Math.abs(dec);
    return {
      degrees: sign * Math.floor(abs),
      minutes: Math.floor((abs % 1) * 60),
      seconds: Math.round(((abs % 1) * 60 % 1) * 60),
    };
  }
  const sign = dec.startsWith('-') ? -1 : 1;
  if (!dec.includes(':')) {
    const val = parseFloat(dec) || 0;
    const abs = Math.abs(val);
    return {
      degrees: sign * Math.floor(abs),
      minutes: Math.floor((abs % 1) * 60),
      seconds: Math.round(((abs % 1) * 60 % 1) * 60),
    };
  }
  const parts = dec.replace(/^[+-]/, '').split(':').map(Number);
  return {
    degrees: sign * Math.floor(parts[0] || 0),
    minutes: Math.floor(parts[1] || 0),
    seconds: parseFloat(parts[2]?.toString() || '0'),
  };
}

// --- Export function ---

export interface NinaExportOptions {
  rotation?: number;
  gain?: number;
  offset?: number;
  binning?: number;
  startTimeISO?: string;  // ISO string for WaitForTime
}

export function exportNinaTargetFile(
  project: Project,
  planner?: PlannerResult | null,
  options: NinaExportOptions = {},
): string {
  resetIdCounter();

  const {
    rotation = 0.0,
    gain = 121,
    offset = 30,
    binning = 1,
    startTimeISO,
  } = options;

  const ra = parseRA(project.targetRa);
  const dec = parseDec(project.targetDec);

  // Target
  const target: NinaObj = {
    $id: nextId(),
    $type: 'NINA.Astrometry.InputTarget, NINA.Astrometry',
    Expanded: true,
    TargetName: project.targetName,
    Rotation: rotation,
    InputCoordinates: {
      $id: nextId(),
      $type: 'NINA.Astrometry.InputCoordinates, NINA.Astrometry',
      RAHours: ra.hours,
      RAMinutes: ra.minutes,
      RASeconds: ra.seconds,
      DecDegrees: dec.degrees,
      DecMinutes: dec.minutes,
      DecSeconds: dec.seconds,
    },
  };

  // Instructions — minimal: just exposures (+ optional start time)
  const instructions: NinaObj[] = [];

  // Optional: wait for start time
  if (startTimeISO) {
    const startDate = new Date(startTimeISO);
    const timeStr = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    instructions.push(mkInstruction('Utility.WaitForTime', {
      TimeMode: 'SpecificTime',
      Time: timeStr,
      TimeOffsetMinutes: 0,
    }));
  }

  // Exposures — one TakeExposure block per filter in exposurePlan
  for (const plan of project.exposurePlan || []) {
    // If planner provided, use capped count from the best window
    let subCount = plan.subCount;
    if (planner?.bestWindow) {
      // Calculate how many subs fit in the capped window
      const cappedMs = planner.bestWindow.cappedEndTime
        ? planner.bestWindow.cappedEndTime.getTime() - planner.bestWindow.startTime.getTime()
        : planner.bestWindow.endTime.getTime() - planner.bestWindow.startTime.getTime();
      const cappedMinutes = cappedMs / 60000;
      const subsPerFilter = Math.floor(cappedMinutes * 60 / plan.subExposure);
      // Distribute across filters proportionally
      const totalFilters = (project.exposurePlan || []).length;
      const adjustedCount = Math.min(plan.subCount, Math.floor(subsPerFilter / totalFilters));
      if (adjustedCount > 0) subCount = adjustedCount;
    }

    // Switch filter
    instructions.push(mkInstruction('FilterWheel.SwitchFilter', {
      SelectedFilter: { Name: plan.filter, Id: null },
    }));

    // TakeExposure — one instruction per sub (NINA expects individual items)
    for (let i = 0; i < subCount; i++) {
      instructions.push(mkInstruction('Camera.TakeExposure', {
        ExposureTime: plan.subExposure,
        Binning: `${binning}x${binning}`,
        Gain: gain,
        Offset: offset,
        ImageType: 0,  // LIGHT
        Dither: i > 0 && i % 3 === 0,  // dither every 3 subs
        DitherEvery: 0,  // manual dither via individual flags
      }));
    }
  }

  // Assemble DeepSkyObjectContainer
  const container: NinaObj = {
    $id: nextId(),
    $type: 'NINA.Sequencer.Container.DeepSkyObjectContainer, NINA.Sequencer',
    Target: target,
    Strategy: { $type: 'NINA.Sequencer.Container.ExecutionStrategy.SequentialStrategy, NINA.Sequencer' },
    Name: project.targetName,
    Conditions: mkCollection('NINA.Sequencer.Conditions.ISequenceCondition, NINA.Sequencer'),
    IsExpanded: true,
    Items: mkCollection('NINA.Sequencer.SequenceItem.ISequenceItem, NINA.Sequencer', instructions),
    Triggers: mkCollection('NINA.Sequencer.Trigger.ISequenceTrigger, NINA.Sequencer'),
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };

  return JSON.stringify(container, null, 2);
}

export function generateNinaFileName(project: Project): string {
  const date = new Date().toISOString().split('T')[0];
  const safeName = project.targetName.replace(/[^a-zA-Z0-9]/g, '_');
  return `NINA_${safeName}_${date}.json`;
}