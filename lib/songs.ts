import type { Degree } from './theory'

export type SongPreset = {
  name: string
  subtitle: string
  degrees: [Degree, Degree, Degree, Degree]
}

// A few textbook 4-chord loops, labeled with well-known songs that ride them.
// (Roman-numeral analysis only — no lyrics or melody reproduced.)
export const SONG_PRESETS: SongPreset[] = [
  { name: 'The Axis Progression', subtitle: "Let It Be · Don't Stop Believin' · No Woman No Cry · With or Without You", degrees: [0, 4, 5, 3] },
  { name: 'The Other Axis', subtitle: 'Africa · Grenade · Umbrella · Can You Feel the Love Tonight', degrees: [3, 0, 4, 5] },
  { name: 'The Pop-Punk Loop', subtitle: 'Zombie · She Will Be Loved · Poker Face · Apologize', degrees: [5, 3, 0, 4] },
  { name: '50s Doo-Wop', subtitle: 'Stand By Me · Every Breath You Take · Blue Moon · Earth Angel', degrees: [0, 5, 3, 4] },
  { name: 'Three-Chord Rock', subtitle: 'Twist and Shout · La Bamba · Wild Thing · Louie Louie', degrees: [0, 3, 4, 0] },
  { name: 'Simple Blues Loop', subtitle: 'Sweet Home Alabama · Johnny B. Goode · La Grange · Get Back', degrees: [0, 3, 0, 4] },
  { name: 'Jazz Turnaround', subtitle: 'Fly Me to the Moon · Autumn Leaves · All of Me · Blue Bossa', degrees: [5, 1, 4, 0] },
  { name: "Pachelbel's Canon", subtitle: "Canon in D · Basket Case · Don't Look Back in Anger · Kiss From a Rose", degrees: [0, 4, 5, 2] },
  { name: 'Circle of Fifths Loop', subtitle: 'I Will Survive · Have You Ever Seen the Rain · Message in a Bottle · Girl From Ipanema', degrees: [1, 4, 0, 5] },
]
