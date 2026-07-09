// Music theory helpers for the Chord Progression Builder.
// Only major-scale diatonic triads are supported (I ii iii IV V vi vii°).

export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export type Key = (typeof KEYS)[number]

const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
}

const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11]

export const DEGREES = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] as const
export type Degree = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const ALL_DEGREES: Degree[] = [0, 1, 2, 3, 4, 5, 6]

export const DEGREE_QUALITY = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'] as const

// 1-2 word mood of each degree on its own.
export const DEGREE_MOOD: Record<Degree, string> = {
  0: 'Home',
  1: 'Yearning',
  2: 'Bittersweet',
  3: 'Hopeful',
  4: 'Tension',
  5: 'Melancholy',
  6: 'Uneasy',
}

// Mood of moving FROM one degree TO another. Keyed as "from-to".
const TRANSITION_MOOD: Record<string, string> = {
  '0-1': 'Gentle drift', '0-2': 'Soft shift', '0-3': 'Opening up', '0-4': 'Building tension', '0-5': 'Turning wistful', '0-6': 'Uneasy pull',
  '1-0': 'Settling down', '1-2': 'Rising ache', '1-3': 'Brightening', '1-4': 'Gathering tension', '1-5': 'Deepening', '1-6': 'Slipping',
  '2-0': 'Coming home', '2-1': 'Loosening', '2-3': 'Warming', '2-4': 'Pressing forward', '2-5': 'Falling deeper', '2-6': 'Edge of falling',
  '3-0': 'Resolving', '3-1': 'Softening', '3-2': 'Wistful turn', '3-4': 'Pushing forward', '3-5': 'Bittersweet fall', '3-6': 'Restless pull',
  '4-0': 'Coming home', '4-1': 'Unexpected turn', '4-2': 'Lingering', '4-3': 'Easing back', '4-5': 'Surprise ache', '4-6': 'Sliding tension',
  '5-0': 'Brightening up', '5-1': 'Continuing ache', '5-2': 'Deepening sorrow', '5-3': 'Finding hope', '5-4': 'Rising urgency', '5-6': 'Growing unease',
  '6-0': 'Release', '6-1': 'Uneasy drift', '6-2': 'Lingering doubt', '6-3': 'Softening', '6-4': 'Mounting tension', '6-5': 'Falling further',
}

export function getTransitionMood(from: Degree, to: Degree): string {
  if (from === to) return 'Staying put'
  return TRANSITION_MOOD[`${from}-${to}`] ?? 'Shifting mood'
}

// Semitone offset of a diatonic scale step (0-indexed, can exceed 6 to climb octaves) from the key root.
function scaleStepSemitone(step: number): number {
  const octaveShift = Math.floor(step / 7)
  const idx = ((step % 7) + 7) % 7
  return octaveShift * 12 + MAJOR_SCALE_STEPS[idx]
}

// Semitone offsets (from key root) of the three notes of a triad built on a given scale degree.
export function triadOffsets(degree: Degree): [number, number, number] {
  return [scaleStepSemitone(degree), scaleStepSemitone(degree + 2), scaleStepSemitone(degree + 4)]
}

function noteFrequency(noteIndex: number, octave: number): number {
  const midi = (octave + 1) * 12 + noteIndex
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Frequency of a semitone offset from the key's root, at a given base octave for the root.
export function frequencyFromKey(key: Key, semitoneOffset: number, baseOctave: number): number {
  const rootIndex = NOTE_INDEX[key]
  const totalSemitones = rootIndex + semitoneOffset
  const octave = baseOctave + Math.floor(totalSemitones / 12)
  const noteIndex = ((totalSemitones % 12) + 12) % 12
  return noteFrequency(noteIndex, octave)
}

// Name of the root note of a triad built on a scale degree, in the given key.
export function chordRootName(key: Key, degree: Degree): string {
  const rootIndex = NOTE_INDEX[key]
  const offset = triadOffsets(degree)[0]
  const noteIndex = (((rootIndex + offset) % 12) + 12) % 12
  return KEYS[noteIndex]
}

export function chordLabel(key: Key, degree: Degree): string {
  const quality = DEGREE_QUALITY[degree]
  const root = chordRootName(key, degree)
  if (quality === 'maj') return root
  if (quality === 'min') return `${root}m`
  return `${root}°`
}
