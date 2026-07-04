// ============================================================================
// NINA Target Export — Generates NINA Advanced Sequencer JSON files
// from AstroSuite project data.
//
// Format: DeepSkyObjectContainer (NINA 3.x Advanced Sequencer)
// Can be drag-and-dropped or loaded via "Load Sequence" in NINA.
// ============================================================================

import type { Project, ProjectExposurePlan } from '../types/project';

// --- Types NINA (subset of the real format) ---

interface NinaInputCoordinates {
  $id: string;
  $type: string;
  RAHours: number;
  RAMinutes: number;
  RASeconds: number;
  DecDegrees: number;
  DecMinutes: number;
  DecSeconds: number;
}

interface NinaInputTarget {
  $id: string;
  $type: string;
  Expanded: boolean;
  TargetName: string;
  Rotation: number;
  InputCoordinates: NinaInputCoordinates;
}

interface NinaObservableCollection<T> {
  $id: string;
  $type: string;
  $values: T[];
}

interface NinaInstruction {
  $id: string;
  $type: string;
  [key: string]: unknown;
}

interface NinaTrigger {
  $id: string;
  $type: string;
  [key: string]: unknown;
}

interface NinaDeepSkyObjectContainer {
  $id: string;
  $type: string;
  Target: NinaInputTarget;
  Strategy: { $type: string };
  Name: string;
  Conditions: NinaObservableCollection<unknown>;
  IsExpanded: boolean;
  Items: NinaObservableCollection<NinaInstruction>;
  Triggers: NinaObservableCollection<NinaTrigger>;
  Parent: string | null;
  ErrorBehavior: number;
  Attempts: number;
}

// --- Helpers ---

let _idCounter = 1;
function nextId(): string {
  return String(_idCounter++);
}

function resetIdCounter(): void {
  _idCounter = 1;
}

/**
 * Parse RA string "HH:MM:SS.ss" → { hours, minutes, seconds }
 */
function parseRA(raStr: string): { hours: number; minutes: number; seconds: number } {
  const parts = raStr.split(':').map(Number);
  return {
    hours: Math.floor(parts[0] || 0),
    minutes: Math.floor(parts[1] || 0),
    seconds: parseFloat(parts[2]?.toString() || '0'),
  };
}

/**
 * Parse DEC string "+DD:MM:SS.s" → { degrees, minutes, seconds }
 */
function parseDec(decStr: string): { degrees: number; minutes: number; seconds: number } {
  const sign = decStr.startsWith('-') ? -1 : 1;
  const clean = decStr.replace(/^[+-]/, '');
  const parts = clean.split(':').map(Number);
  return {
    degrees: sign * Math.floor(parts[0] || 0),
    minutes: Math.floor(parts[1] || 0),
    seconds: parseFloat(parts[2]?.toString() || '0'),
  };
}

// --- NINA Instruction Builders ---

function makeAnnotation(text: string): NinaInstruction {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Utility.Annotation, NINA.Sequencer',
    Text: text,
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

function makeSequentialContainer(name: string, items: NinaInstruction[]): NinaInstruction {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.Container.SequentialContainer, NINA.Sequencer',
    Strategy: { $type: 'NINA.Sequencer.Container.ExecutionStrategy.SequentialStrategy, NINA.Sequencer' },
    Name: name,
    Conditions: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Conditions.ISequenceCondition, NINA.Sequencer]], System',
      $values: [],
    },
    IsExpanded: true,
    Items: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.SequenceItem.ISequenceItem, NINA.Sequencer]], System',
      $values: items,
    },
    Triggers: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Trigger.ISequenceTrigger, NINA.Sequencer]], System',
      $values: [],
    },
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

function makeSwitchFilter(filterName: string): NinaInstruction {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.FilterWheel.SwitchFilter, NINA.Sequencer',
    SelectedFilter: { Name: filterName, Id: null },
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

function makeSlewAndCenter(): NinaInstruction {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Telescope.SlewAndCenter, NINA.Sequencer',
    CenteringPrecision: 0.1,
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 3,
  };
}

function makeStartGuiding(): NinaInstruction {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Guider.StartGuiding, NINA.Sequencer',
    ForceCalibration: false,
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

function makeStopGuiding(): NinaInstruction {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Guider.StopGuiding, NINA.Sequencer',
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

function makeRunAutofocus(): NinaInstruction {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Focuser.RunAutofocus, NINA.Sequencer',
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

function makeSmartExposure(
  filterName: string,
  exposureTime: number,
  count: number,
  gain: number = 121,
  offset: number = 30,
  binning: number = 1,
  ditherEvery: number = 3,
): NinaInstruction {
  const switchFilter = makeSwitchFilter(filterName);
  const takeExposure = {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Camera.TakeExposure, NINA.Sequencer',
    ExposureTime: exposureTime,
    Binning: `${binning}x${binning}`,
    Gain: gain,
    Offset: offset,
    ImageType: 0, // LIGHT
    Dither: ditherEvery > 0,
    DitherEvery: ditherEvery,
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };

  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Camera.SmartExposure, NINA.Sequencer',
    Name: 'Smart Exposure',
    Strategy: { $type: 'NINA.Sequencer.Container.ExecutionStrategy.SequentialStrategy, NINA.Sequencer' },
    Conditions: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Conditions.ISequenceCondition, NINA.Sequencer]], System',
      $values: [],
    },
    IsExpanded: true,
    Items: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.SequenceItem.ISequenceItem, NINA.Sequencer]], System',
      $values: [switchFilter, takeExposure],
    },
    Triggers: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Trigger.ISequenceTrigger, NINA.Sequencer]], System',
      $values: [],
    },
    // Smart Exposure specific fields
    TotalExposureCount: count,
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

function makeWaitUntilAboveHorizon(): NinaInstruction {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Utility.WaitUntilAboveHorizon, NINA.Sequencer',
    AltitudeOffset: 0,
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

function makeWaitForTime(timeMode: string): NinaInstruction {
  // timeMode: 'NauticalDusk', 'AstronomicalDusk', 'Sunset', etc.
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.SequenceItem.Utility.WaitForTime, NINA.Sequencer',
    TimeMode: timeMode,
    TimeOffsetMinutes: 0,
    Time: '00:00:00',
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };
}

// --- Triggers ---

function makeMeridianFlipTrigger(): NinaTrigger {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.Trigger.MeridianFlip, NINA.Sequencer',
    Parent: null,
  };
}

function makeAutofocusAfterHfrTrigger(thresholdPercent: number = 10): NinaTrigger {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.Trigger.AutofocusAfterHFRIncrease, NINA.Sequencer',
    ThresholdPercent: thresholdPercent,
    Parent: null,
  };
}

function makeCenterAfterDriftTrigger(exposures: number = 5, maxArcmin: number = 2): NinaTrigger {
  return {
    $id: nextId(),
    $type: 'NINA.Sequencer.Trigger.CenteringDrift, NINA.Sequencer',
    Exposures: exposures,
    MaxArcmin: maxArcmin,
    Parent: null,
  };
}

// --- Main Export Function ---

export interface NinaExportOptions {
  gain?: number;
  offset?: number;
  binning?: number;
  ditherEvery?: number;
  rotation?: number;
  includeAutofocus?: boolean;
  includeMeridianFlip?: boolean;
  includeCenteringDrift?: boolean;
  autofocusAfterHfrPercent?: number;
  centerAfterExposures?: number;
  centerMaxArcmin?: number;
  startTimeMode?: string;  // 'NauticalDusk', 'AstronomicalDusk', 'Sunset'
  waitForHorizon?: boolean;
}

export function generateNinaTargetFile(
  project: Project,
  options: NinaExportOptions = {},
): NinaDeepSkyObjectContainer {
  resetIdCounter();

  const {
    gain = 121,
    offset = 30,
    binning = 1,
    ditherEvery = 3,
    rotation = 0.0,
    includeAutofocus = true,
    includeMeridianFlip = true,
    includeCenteringDrift = true,
    autofocusAfterHfrPercent = 10,
    centerAfterExposures = 5,
    centerMaxArcmin = 2,
    startTimeMode = 'AstronomicalDusk',
    waitForHorizon = true,
  } = options;

  // Parse coordinates
  const ra = parseRA(project.targetRa);
  const dec = parseDec(project.targetDec);

  // Build target
  const target: NinaInputTarget = {
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

  // Build instructions
  const instructions: NinaInstruction[] = [];

  // Annotation with project info
  instructions.push(makeAnnotation(
    `AstroSuite Export — ${project.title} | Target: ${project.targetName} (${project.targetId}) | Filter: ${project.primaryFilter} | SNR Target: ${project.snrTarget}`
  ));

  // Prepare target container
  const prepareItems: NinaInstruction[] = [];

  // Wait for dark if requested
  if (startTimeMode) {
    prepareItems.push(makeWaitForTime(startTimeMode));
  }

  // Wait until above horizon if requested
  if (waitForHorizon) {
    prepareItems.push(makeWaitUntilAboveHorizon());
  }

  // Slew and center
  prepareItems.push(makeSlewAndCenter());

  // Autofocus before imaging
  if (includeAutofocus) {
    prepareItems.push(makeRunAutofocus());
  }

  // Start guiding
  prepareItems.push(makeStartGuiding());

  if (prepareItems.length > 0) {
    instructions.push(makeSequentialContainer('PREPARE_TARGET', prepareItems));
  }

  // Imaging instructions — one SmartExposure per filter in exposurePlan
  const imagingItems: NinaInstruction[] = [];

  for (const plan of project.exposurePlan) {
    imagingItems.push(
      makeSmartExposure(
        plan.filter,
        plan.subExposure,
        plan.subCount,
        gain,
        offset,
        binning,
        ditherEvery,
      )
    );
  }

  if (imagingItems.length > 0) {
    instructions.push(makeSequentialContainer('IMAGING', imagingItems));
  }

  // Stop guiding after imaging
  instructions.push(makeStopGuiding());

  // Build triggers
  const triggers: NinaTrigger[] = [];
  if (includeMeridianFlip) {
    triggers.push(makeMeridianFlipTrigger());
  }
  if (includeAutofocus) {
    triggers.push(makeAutofocusAfterHfrTrigger(autofocusAfterHfrPercent));
  }
  if (includeCenteringDrift) {
    triggers.push(makeCenterAfterDriftTrigger(centerAfterExposures, centerMaxArcmin));
  }

  // Assemble the DeepSkyObjectContainer
  const container: NinaDeepSkyObjectContainer = {
    $id: nextId(),
    $type: 'NINA.Sequencer.Container.DeepSkyObjectContainer, NINA.Sequencer',
    Target: target,
    Strategy: { $type: 'NINA.Sequencer.Container.ExecutionStrategy.SequentialStrategy, NINA.Sequencer' },
    Name: project.targetName,
    Conditions: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Conditions.ISequenceCondition, NINA.Sequencer]], System',
      $values: [],
    },
    IsExpanded: true,
    Items: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.SequenceItem.ISequenceItem, NINA.Sequencer]], System',
      $values: instructions,
    },
    Triggers: {
      $id: nextId(),
      $type: 'System.Collections.ObjectModel.ObservableCollection`1[[NINA.Sequencer.Trigger.ISequenceTrigger, NINA.Sequencer]], System',
      $values: triggers,
    },
    Parent: null,
    ErrorBehavior: 0,
    Attempts: 1,
  };

  return container;
}

/**
 * Generate and download the NINA target file as a JSON blob.
 * Returns the JSON string.
 */
export function exportNinaTargetFile(
  project: Project,
  options: NinaExportOptions = {},
): string {
  const data = generateNinaTargetFile(project, options);
  return JSON.stringify(data, null, 2);
}

/**
 * Generate a filename for the NINA target file.
 */
export function generateNinaFileName(project: Project): string {
  const date = new Date().toISOString().split('T')[0];
  const safeName = project.targetName.replace(/[^a-zA-Z0-9]/g, '_');
  return `NINA_${safeName}_${date}.json`;
}