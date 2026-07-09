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

// Plain, layman-readable mood of each degree on its own (up to 3 words).
export const DEGREE_MOOD: Record<Degree, string> = {
  0: 'Happy and Content',
  1: 'Wistful and Longing',
  2: 'Dreamy and Nostalgic',
  3: 'Warm and Hopeful',
  4: 'Excited but Anxious',
  5: 'Sad and Reflective',
  6: 'Nervous and Unsettled',
}

// Mood of moving FROM one degree TO another, in plain emotional terms anyone can
// recognize — not music-theory jargon. Keyed as "from-to". Up to 3 words.
const TRANSITION_MOOD: Record<string, string> = {
  '0-1': 'Slightly Wistful Shift', '0-2': 'Softly Turning Nostalgic', '0-3': 'Feeling More Hopeful', '0-4': 'Growing Slightly Excited', '0-5': 'Suddenly Feeling Sad', '0-6': 'Oddly Feeling Nervous',
  '1-0': 'Feeling Better Again', '1-2': 'A Bit Dreamier', '1-3': 'Brightening Up Nicely', '1-4': 'Getting More Excited', '1-5': 'Sinking Into Sadness', '1-6': 'Growing More Nervous',
  '2-0': 'Happily Coming Back', '2-1': 'Calming Down Some', '2-3': 'Slowly Feeling Warmer', '2-4': 'Building Some Excitement', '2-5': 'Falling Into Sadness', '2-6': 'Getting Pretty Nervous',
  '3-0': 'Happily Settling Down', '3-1': 'Easing Into Longing', '3-2': 'Drifting Back Nostalgic', '3-4': 'Getting Quite Excited', '3-5': 'Turning Bittersweet Suddenly', '3-6': 'Jumping Into Nervousness',
  '4-0': 'Finally Feeling Great', '4-1': 'Unexpectedly Feeling Wistful', '4-2': 'Excitement Left Hanging', '4-3': 'Calming Back Down', '4-5': 'Surprisingly Feeling Sad', '4-6': 'Swapping For Nervousness',
  '5-0': 'Cheering Back Up', '5-1': 'Still Feeling Wistful', '5-2': 'Sinking Into Nostalgia', '5-3': 'Finding Hope Again', '5-4': 'Getting Rather Excited', '5-6': 'Feeling Even Worse',
  '6-0': 'Big Relief Finally', '6-1': 'Nervously Drifting Along', '6-2': 'Still Feeling Doubtful', '6-3': 'Calming Down Unexpectedly', '6-4': 'Trading One Worry', '6-5': 'Sliding Into Sadness',
}

export function getTransitionMood(from: Degree, to: Degree): string {
  if (from === to) return 'Staying Put'
  return TRANSITION_MOOD[`${from}-${to}`] ?? 'Shifting Mood'
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

// MIDI note number of a semitone offset from the key's root, at a given base octave for the root.
// Used to trigger sampled instrument notes (soundfont-player expects MIDI numbers).
export function midiFromKey(key: Key, semitoneOffset: number, baseOctave: number): number {
  const rootIndex = NOTE_INDEX[key]
  const totalSemitones = rootIndex + semitoneOffset
  const octave = baseOctave + Math.floor(totalSemitones / 12)
  const noteIndex = ((totalSemitones % 12) + 12) % 12
  return (octave + 1) * 12 + noteIndex
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
