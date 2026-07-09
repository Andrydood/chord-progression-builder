import Soundfont, { type SoundfontInstrument } from 'soundfont-player'
import { type Degree, type Key, frequencyFromKey, midiFromKey, triadOffsets } from './theory'

export type Style = 'rock' | 'piano' | 'synth'

export const DEFAULT_BPM = 120
export const MIN_BPM = 60
export const MAX_BPM = 160

function beatDuration(bpm: number): number {
  return 60 / bpm
}

function barDuration(bpm: number): number {
  return beatDuration(bpm) * 4
}

type LiveNode = { stop: (when: number) => void }

class ChordAudioEngine {
  private ctx: AudioContext | null = null
  private noiseBuffer: AudioBuffer | null = null
  private pianoPromise: Promise<SoundfontInstrument> | null = null
  private guitarPromise: Promise<SoundfontInstrument> | null = null
  private activeNodes: LiveNode[] = []
  private timeoutId: number | null = null
  private generation = 0
  private loopCycleStart = 0
  private loopBarDuration = 0
  private loopChordCount = 0

  private getCtx(): AudioContext {
    if (!this.ctx) {
      const AudioContextCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioContextCtor()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = ctx.sampleRate * 1
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buffer
    }
    return this.noiseBuffer
  }

  private getPiano(): Promise<SoundfontInstrument> {
    const ctx = this.getCtx()
    if (!this.pianoPromise) {
      this.pianoPromise = Soundfont.instrument(ctx, 'acoustic_grand_piano', { soundfont: 'FluidR3_GM' })
    }
    return this.pianoPromise
  }

  private getGuitar(): Promise<SoundfontInstrument> {
    const ctx = this.getCtx()
    if (!this.guitarPromise) {
      this.guitarPromise = Soundfont.instrument(ctx, 'overdriven_guitar', { soundfont: 'FluidR3_GM' })
    }
    return this.guitarPromise
  }

  // Kick off instrument downloads early so the first play() has no latency.
  preload() {
    this.getPiano().catch(() => {})
    this.getGuitar().catch(() => {})
  }

  private track(node: LiveNode) {
    this.activeNodes.push(node)
  }

  playChord(style: Style, key: Key, degree: Degree, bpm: number) {
    this.stop()
    const myGeneration = this.generation
    const ctx = this.getCtx()
    const offsets = triadOffsets(degree)
    const barStart = ctx.currentTime + 0.02
    if (style === 'rock') {
      this.getGuitar().then((guitar) => {
        if (myGeneration === this.generation) this.strumBar(guitar, key, offsets, barStart, bpm)
      })
    } else if (style === 'piano') {
      this.getPiano().then((piano) => {
        if (myGeneration === this.generation) this.arpeggioBar(piano, key, offsets, barStart, bpm)
      })
    } else {
      this.synthBar(ctx, key, offsets, barStart, barDuration(bpm))
    }
  }

  startLoop(chords: Degree[], style: Style, key: Key, bpm: number, drumsOn: boolean) {
    this.stop()
    const myGeneration = ++this.generation
    const ctx = this.getCtx()
    const bar = barDuration(bpm)
    const total = bar * chords.length
    let cycleStart = ctx.currentTime + 0.15
    this.loopBarDuration = bar
    this.loopChordCount = chords.length
    this.loopCycleStart = cycleStart

    const instrumentReady: Promise<SoundfontInstrument | null> =
      style === 'rock' ? this.getGuitar() : style === 'piano' ? this.getPiano() : Promise.resolve(null)

    instrumentReady.then((instrument) => {
      if (myGeneration !== this.generation) return

      const scheduleCycle = (start: number) => {
        chords.forEach((degree, i) => {
          const barStart = start + i * bar
          const offsets = triadOffsets(degree)
          if (style === 'rock' && instrument) this.strumBar(instrument, key, offsets, barStart, bpm)
          else if (style === 'piano' && instrument) this.arpeggioBar(instrument, key, offsets, barStart, bpm)
          else if (style === 'synth') this.synthBar(ctx, key, offsets, barStart, bar)
          if (drumsOn) this.drumBar(ctx, style, barStart, bpm)
        })
      }
      scheduleCycle(cycleStart)

      const tick = () => {
        if (myGeneration !== this.generation) return
        cycleStart += total
        this.loopCycleStart = cycleStart
        scheduleCycle(cycleStart)
        const delay = Math.max(50, (cycleStart - this.getCtx().currentTime - 0.3) * 1000)
        this.timeoutId = window.setTimeout(tick, delay)
      }
      const firstDelay = Math.max(50, (total - 0.3) * 1000)
      this.timeoutId = window.setTimeout(tick, firstDelay)
    })
  }

  // Which chord index (0-based) is currently sounding in the active loop.
  private getCurrentIndex(): number {
    if (!this.ctx || this.loopChordCount === 0 || this.loopBarDuration === 0) return 0
    const total = this.loopBarDuration * this.loopChordCount
    const elapsed = this.ctx.currentTime - this.loopCycleStart
    const mod = ((elapsed % total) + total) % total
    return Math.floor(mod / this.loopBarDuration)
  }

  // Re-applies style/key/bpm/drum settings to a running loop without restarting
  // the progression from chord 1 — playback continues from the current chord.
  resumeWithSettings(chords: Degree[], style: Style, key: Key, bpm: number, drumsOn: boolean) {
    const idx = this.getCurrentIndex()
    const rotated = idx > 0 ? ([...chords.slice(idx), ...chords.slice(0, idx)] as Degree[]) : chords
    this.startLoop(rotated, style, key, bpm, drumsOn)
  }

  stop() {
    this.generation++
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    const ctx = this.ctx
    if (ctx) {
      const now = ctx.currentTime
      this.activeNodes.forEach((n) => {
        try {
          n.stop(now)
        } catch {
          // node may already be stopped/finished — safe to ignore
        }
      })
    }
    this.activeNodes = []
  }

  // --- Guitar: keeps strumming in 8th notes for the whole bar ---
  private strumBar(guitar: SoundfontInstrument, key: Key, offsets: number[], barStart: number, bpm: number) {
    const beat = beatDuration(bpm)
    const voicing = [offsets[0] - 12, offsets[2] - 12, offsets[0], offsets[1], offsets[2], offsets[0] + 12]
    for (let e = 0; e < 8; e++) {
      const t = barStart + e * 0.5 * beat
      const isDown = e % 2 === 0
      const gain = isDown ? 0.55 : 0.36
      voicing.forEach((offset, i) => {
        const strumTime = t + i * 0.012
        const midi = midiFromKey(key, offset, 3)
        const node = guitar.play(midi, strumTime, { duration: beat * 0.55, gain })
        this.track({ stop: (now) => node.stop(now) })
      })
    }
  }

  // --- Piano: keeps arpeggiating in 8th notes for the whole bar ---
  private arpeggioBar(piano: SoundfontInstrument, key: Key, offsets: number[], barStart: number, bpm: number) {
    const beat = beatDuration(bpm)
    const pattern = [offsets[0], offsets[1], offsets[2], offsets[1]]
    for (let e = 0; e < 8; e++) {
      const t = barStart + e * 0.5 * beat
      const offset = pattern[e % pattern.length]
      const midi = midiFromKey(key, offset, 4)
      const node = piano.play(midi, t, { duration: beat * 0.6, gain: 0.55 })
      this.track({ stop: (now) => node.stop(now) })
    }
  }

  // --- Synth: a sustained pad held for the whole bar ---
  private synthBar(ctx: AudioContext, key: Key, offsets: number[], barStart: number, dur: number) {
    const voicing = [offsets[0] - 12, offsets[0], offsets[1], offsets[2], offsets[2] + 12]
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1800
    filter.Q.value = 0.7
    filter.connect(ctx.destination)

    const attack = Math.min(0.35, dur * 0.2)
    const release = Math.min(0.6, dur * 0.3)

    voicing.forEach((offset) => {
      ;[-6, 6].forEach((detune) => {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = frequencyFromKey(key, offset, 3)
        osc.detune.value = detune

        const gain = ctx.createGain()
        const peak = 0.16 / voicing.length
        gain.gain.setValueAtTime(0, barStart)
        gain.gain.linearRampToValueAtTime(peak, barStart + attack)
        gain.gain.setValueAtTime(peak, barStart + Math.max(attack, dur - release))
        gain.gain.linearRampToValueAtTime(0.0001, barStart + dur)

        osc.connect(gain)
        gain.connect(filter)
        osc.start(barStart)
        osc.stop(barStart + dur + 0.05)

        this.track({
          stop: (now) => {
            gain.gain.cancelScheduledValues(now)
            gain.gain.setValueAtTime(gain.gain.value, now)
            gain.gain.linearRampToValueAtTime(0.0001, now + 0.08)
            osc.stop(now + 0.1)
          },
        })
      })
    })
  }

  // --- Drums: a style-matched synthesized beat for the bar ---
  private drumBar(ctx: AudioContext, style: Style, barStart: number, bpm: number) {
    const beat = beatDuration(bpm)
    if (style === 'rock') {
      ;[0, 2].forEach((b) => this.kick(ctx, barStart + b * beat, 0.9))
      ;[1, 3].forEach((b) => this.snare(ctx, barStart + b * beat, 0.8))
      for (let e = 0; e < 8; e++) this.hihat(ctx, barStart + e * 0.5 * beat, e % 2 === 0 ? 0.5 : 0.32)
    } else if (style === 'piano') {
      ;[0, 2].forEach((b) => this.kick(ctx, barStart + b * beat, 0.5))
      for (let q = 0; q < 4; q++) this.hihat(ctx, barStart + q * beat, 0.22)
    } else {
      for (let q = 0; q < 4; q++) this.kick(ctx, barStart + q * beat, 0.75)
      ;[1, 3].forEach((b) => this.clap(ctx, barStart + b * beat, 0.6))
      for (let e = 0; e < 8; e++) this.hihat(ctx, barStart + e * 0.5 * beat, 0.3)
    }
  }

  private kick(ctx: AudioContext, time: number, gain: number) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    const g = ctx.createGain()
    osc.frequency.setValueAtTime(150, time)
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.13)
    g.gain.setValueAtTime(gain, time)
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.28)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.3)
    this.track({
      stop: (now) => {
        g.gain.cancelScheduledValues(now)
        g.gain.setValueAtTime(g.gain.value, now)
        g.gain.linearRampToValueAtTime(0.0001, now + 0.03)
        osc.stop(now + 0.04)
      },
    })
  }

  private snare(ctx: AudioContext, time: number, gain: number) {
    const noise = ctx.createBufferSource()
    noise.buffer = this.getNoiseBuffer(ctx)
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 1800
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(gain, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16)
    noise.connect(bandpass)
    bandpass.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start(time)
    noise.stop(time + 0.18)

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 190
    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(gain * 0.5, time)
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
    osc.connect(oscGain)
    oscGain.connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.12)

    this.track({
      stop: (now) => {
        ;[noiseGain, oscGain].forEach((g) => {
          g.gain.cancelScheduledValues(now)
          g.gain.setValueAtTime(g.gain.value, now)
          g.gain.linearRampToValueAtTime(0.0001, now + 0.02)
        })
        noise.stop(now + 0.03)
        osc.stop(now + 0.03)
      },
    })
  }

  private hihat(ctx: AudioContext, time: number, gain: number) {
    const noise = ctx.createBufferSource()
    noise.buffer = this.getNoiseBuffer(ctx)
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 7500
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(gain, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
    noise.connect(highpass)
    highpass.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start(time)
    noise.stop(time + 0.07)
    this.track({
      stop: (now) => {
        noiseGain.gain.cancelScheduledValues(now)
        noiseGain.gain.setValueAtTime(noiseGain.gain.value, now)
        noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.02)
        noise.stop(now + 0.03)
      },
    })
  }

  private clap(ctx: AudioContext, time: number, gain: number) {
    ;[0, 0.01, 0.02].forEach((offset, i) => {
      const noise = ctx.createBufferSource()
      noise.buffer = this.getNoiseBuffer(ctx)
      const bandpass = ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 1500
      const noiseGain = ctx.createGain()
      const t = time + offset
      noiseGain.gain.setValueAtTime(gain * (i === 2 ? 1 : 0.6), t)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13)
      noise.connect(bandpass)
      bandpass.connect(noiseGain)
      noiseGain.connect(ctx.destination)
      noise.start(t)
      noise.stop(t + 0.14)
      this.track({
        stop: (now) => {
          noiseGain.gain.cancelScheduledValues(now)
          noiseGain.gain.setValueAtTime(noiseGain.gain.value, now)
          noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.02)
          noise.stop(now + 0.03)
        },
      })
    })
  }
}

let engine: ChordAudioEngine | null = null

export function getChordAudioEngine(): ChordAudioEngine {
  if (!engine) engine = new ChordAudioEngine()
  return engine
}
