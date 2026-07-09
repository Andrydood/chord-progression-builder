import { type Degree, type Key, frequencyFromKey, triadOffsets } from './theory'

export type Style = 'rock' | 'piano' | 'synth'

export const STYLE_CHORD_DURATION: Record<Style, number> = {
  rock: 1.8,
  piano: 2.1,
  synth: 2.6,
}

function makeDistortionCurve(amount: number): Float32Array {
  const n = 256
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x))
  }
  return curve
}

type LiveNode = { stop: (when: number) => void }

class ChordAudioEngine {
  private ctx: AudioContext | null = null
  private activeNodes: LiveNode[] = []
  private timeoutId: number | null = null
  private generation = 0

  private getCtx(): AudioContext {
    if (!this.ctx) {
      const AudioContextCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioContextCtor()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  playChord(style: Style, key: Key, degree: Degree) {
    const ctx = this.getCtx()
    this.playChordAt(style, key, degree, ctx, ctx.currentTime + 0.02, STYLE_CHORD_DURATION[style])
  }

  startLoop(chords: Degree[], style: Style, key: Key) {
    this.stop()
    const myGeneration = ++this.generation
    const ctx = this.getCtx()
    const dur = STYLE_CHORD_DURATION[style]
    const total = dur * chords.length
    let cycleStart = ctx.currentTime + 0.08

    const scheduleCycle = (start: number) => {
      chords.forEach((degree, i) => {
        this.playChordAt(style, key, degree, ctx, start + i * dur, dur)
      })
    }
    scheduleCycle(cycleStart)

    const tick = () => {
      if (myGeneration !== this.generation) return
      cycleStart += total
      scheduleCycle(cycleStart)
      const delay = Math.max(50, (cycleStart - this.getCtx().currentTime - 0.3) * 1000)
      this.timeoutId = window.setTimeout(tick, delay)
    }
    const firstDelay = Math.max(50, (total - 0.3) * 1000)
    this.timeoutId = window.setTimeout(tick, firstDelay)
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

  private track(node: LiveNode) {
    this.activeNodes.push(node)
  }

  private playChordAt(style: Style, key: Key, degree: Degree, ctx: AudioContext, time: number, dur: number) {
    const offsets = triadOffsets(degree)
    if (style === 'rock') this.strumGuitar(ctx, key, offsets, time, dur)
    else if (style === 'piano') this.arpeggiatePiano(ctx, key, offsets, time, dur)
    else this.synthPad(ctx, key, offsets, time, dur)
  }

  private strumGuitar(ctx: AudioContext, key: Key, offsets: number[], time: number, dur: number) {
    // Voice like a barre chord across ~2 octaves, strummed low-to-high.
    const voicing = [offsets[0] - 12, offsets[2] - 12, offsets[0], offsets[1], offsets[2], offsets[0] + 12]
    const distortion = ctx.createWaveShaper()
    distortion.curve = makeDistortionCurve(10) as Float32Array<ArrayBuffer>
    distortion.oversample = '2x'

    const toneFilter = ctx.createBiquadFilter()
    toneFilter.type = 'lowpass'
    toneFilter.frequency.value = 3200

    const chordGain = ctx.createGain()
    chordGain.gain.value = 0.55
    distortion.connect(toneFilter)
    toneFilter.connect(chordGain)
    chordGain.connect(ctx.destination)

    voicing.forEach((offset, i) => {
      const freq = frequencyFromKey(key, offset, 3)
      const strumTime = time + i * 0.018
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = (Math.random() - 0.5) * 8

      const gain = ctx.createGain()
      const peak = 0.5 / voicing.length
      gain.gain.setValueAtTime(0, strumTime)
      gain.gain.linearRampToValueAtTime(peak, strumTime + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, strumTime + Math.min(dur, 1.4))

      osc.connect(gain)
      gain.connect(distortion)
      osc.start(strumTime)
      osc.stop(strumTime + dur)
      this.track({
        stop: (now) => {
          gain.gain.cancelScheduledValues(now)
          gain.gain.setValueAtTime(gain.gain.value, now)
          gain.gain.linearRampToValueAtTime(0.0001, now + 0.03)
          osc.stop(now + 0.04)
        },
      })
    })
  }

  private arpeggiatePiano(ctx: AudioContext, key: Key, offsets: number[], time: number, dur: number) {
    const pattern = [offsets[0], offsets[1], offsets[2], offsets[1], offsets[2], offsets[0] + 12]
    const noteSpacing = dur / (pattern.length + 1.5)

    pattern.forEach((offset, i) => {
      const freq = frequencyFromKey(key, offset, 4)
      const noteTime = time + i * noteSpacing
      const noteDur = Math.min(1.8, dur - i * noteSpacing)
      if (noteDur <= 0) return

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, noteTime)
      gain.gain.linearRampToValueAtTime(0.32, noteTime + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteDur)
      gain.connect(ctx.destination)

      const fundamental = ctx.createOscillator()
      fundamental.type = 'triangle'
      fundamental.frequency.value = freq
      fundamental.connect(gain)

      const overtone = ctx.createOscillator()
      overtone.type = 'sine'
      overtone.frequency.value = freq * 2
      const overtoneGain = ctx.createGain()
      overtoneGain.gain.value = 0.18
      overtone.connect(overtoneGain)
      overtoneGain.connect(gain)

      fundamental.start(noteTime)
      fundamental.stop(noteTime + noteDur)
      overtone.start(noteTime)
      overtone.stop(noteTime + noteDur)

      this.track({
        stop: (now) => {
          gain.gain.cancelScheduledValues(now)
          gain.gain.setValueAtTime(gain.gain.value, now)
          gain.gain.linearRampToValueAtTime(0.0001, now + 0.03)
          fundamental.stop(now + 0.04)
          overtone.stop(now + 0.04)
        },
      })
    })
  }

  private synthPad(ctx: AudioContext, key: Key, offsets: number[], time: number, dur: number) {
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
        gain.gain.setValueAtTime(0, time)
        gain.gain.linearRampToValueAtTime(peak, time + attack)
        gain.gain.setValueAtTime(peak, time + Math.max(attack, dur - release))
        gain.gain.linearRampToValueAtTime(0.0001, time + dur)

        osc.connect(gain)
        gain.connect(filter)
        osc.start(time)
        osc.stop(time + dur + 0.05)

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
}

let engine: ChordAudioEngine | null = null

export function getChordAudioEngine(): ChordAudioEngine {
  if (!engine) engine = new ChordAudioEngine()
  return engine
}
