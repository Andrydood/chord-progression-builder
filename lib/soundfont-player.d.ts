declare module 'soundfont-player' {
  export interface SoundfontPlayOptions {
    duration?: number
    gain?: number
    attack?: number
    decay?: number
    sustain?: number
    release?: number
  }

  export interface SoundfontNode {
    stop(when?: number): void
  }

  export interface SoundfontInstrument {
    play(note: number | string, when?: number, options?: SoundfontPlayOptions): SoundfontNode
    stop(): void
  }

  export interface InstrumentOptions {
    soundfont?: 'MusyngKite' | 'FluidR3_GM'
    format?: 'mp3' | 'ogg'
    from?: string
    gain?: number
  }

  const Soundfont: {
    instrument(ac: AudioContext, name: string, options?: InstrumentOptions): Promise<SoundfontInstrument>
  }

  export default Soundfont
}
