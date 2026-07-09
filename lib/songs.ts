import type { Degree } from './theory'

export type SongPreset = {
  name: string
  subtitle: string
  degrees: [Degree, Degree, Degree, Degree]
}

// A few textbook 4-chord loops, labeled with well-known songs that ride them.
// (Roman-numeral analysis only — no lyrics or melody reproduced.)
export const SONG_PRESETS: SongPreset[] = [
  { name: 'The Axis Progression', subtitle: "Let It Be · Don't Stop Believin'", degrees: [0, 4, 5, 3] },
  { name: 'The Other Axis', subtitle: 'Africa · Someone Like You', degrees: [3, 0, 4, 5] },
  { name: 'The Pop-Punk Loop', subtitle: 'Zombie · She Will Be Loved', degrees: [5, 3, 0, 4] },
  { name: '50s Doo-Wop', subtitle: 'Stand By Me · Every Breath You Take', degrees: [0, 5, 3, 4] },
  { name: 'Three-Chord Rock', subtitle: 'Twist and Shout · La Bamba', degrees: [0, 3, 4, 0] },
  { name: 'Simple Blues Loop', subtitle: 'The classic 12-bar feel', degrees: [0, 3, 0, 4] },
  { name: 'Jazz Turnaround', subtitle: 'The vi–ii–V–I cadence', degrees: [5, 1, 4, 0] },
  { name: "Pachelbel's Canon", subtitle: 'The wedding-song progression', degrees: [0, 4, 5, 2] },
  { name: 'Circle of Fifths Loop', subtitle: 'A smooth jazzy resolution', degrees: [1, 4, 0, 5] },
]
