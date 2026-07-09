"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BPM, MAX_BPM, MIN_BPM, getChordAudioEngine, type Style } from "@/lib/audioEngine";
import { SONG_PRESETS } from "@/lib/songs";
import {
  ALL_DEGREES,
  DEGREE_MOOD,
  DEGREES,
  KEYS,
  type Degree,
  type Key,
  chordLabel,
  getTransitionMood,
} from "@/lib/theory";

const DEGREE_ACCENT: Record<Degree, string> = {
  0: "text-terracotta",
  1: "text-sky",
  2: "text-plum",
  3: "text-gold",
  4: "text-rose",
  5: "text-slate",
  6: "text-olive",
};

const DEGREE_BORDER: Record<Degree, string> = {
  0: "border-terracotta",
  1: "border-sky",
  2: "border-plum",
  3: "border-gold",
  4: "border-rose",
  5: "border-slate",
  6: "border-olive",
};

const STYLES: { value: Style; label: string }[] = [
  { value: "rock", label: "Rock" },
  { value: "piano", label: "Piano" },
  { value: "synth", label: "Synthpop" },
];

function PlayIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

function PauseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function DrumIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="8" rx="8" ry="4" />
      <path d="M4 8v8c0 2.2 3.6 4 8 4s8-1.8 8-4V8" />
      <path d="M7.5 5.5l-3 -3M16.5 5.5l3 -3" />
    </svg>
  );
}

export default function Home() {
  const [musicKey, setMusicKey] = useState<Key>("C");
  const [style, setStyle] = useState<Style>("piano");
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [drumsOn, setDrumsOn] = useState(true);
  const [slots, setSlots] = useState<(Degree | null)[]>([null, null, null, null]);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentIndex = slots.findIndex((s) => s === null);
  const isComplete = currentIndex === -1;

  useEffect(() => {
    const engine = getChordAudioEngine();
    engine.preload();
    return () => {
      engine.stop();
    };
  }, []);

  function stopIfPlaying() {
    if (isPlaying) {
      getChordAudioEngine().stop();
      setIsPlaying(false);
    }
  }

  function selectDegree(degree: Degree) {
    if (currentIndex === -1) return;
    const engine = getChordAudioEngine();
    const newSlots = slots.map((s, i) => (i === currentIndex ? degree : s));
    setSlots(newSlots);
    if (newSlots.every((s) => s !== null)) {
      // Start the loop from the chord that was just selected, then wrap around.
      const filled = newSlots as Degree[];
      const rotated = [...filled.slice(currentIndex), ...filled.slice(0, currentIndex)];
      engine.startLoop(rotated, style, musicKey, bpm, drumsOn);
      setIsPlaying(true);
    } else {
      engine.playChord(style, musicKey, degree, bpm);
    }
  }

  function editFromSlot(index: number) {
    if (slots[index] === null) return;
    stopIfPlaying();
    setSlots((prev) => prev.map((s, i) => (i < index ? s : null)));
  }

  function resetAll() {
    stopIfPlaying();
    setSlots([null, null, null, null]);
  }

  function applyPreset(degrees: Degree[]) {
    setSlots(degrees);
    getChordAudioEngine().startLoop(degrees, style, musicKey, bpm, drumsOn);
    setIsPlaying(true);
  }

  function togglePlay() {
    const engine = getChordAudioEngine();
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
      return;
    }
    if (!isComplete) return;
    engine.startLoop(slots as Degree[], style, musicKey, bpm, drumsOn);
    setIsPlaying(true);
  }

  function handleStyleChange(next: Style) {
    setStyle(next);
    if (isPlaying && isComplete) {
      getChordAudioEngine().resumeWithSettings(slots as Degree[], next, musicKey, bpm, drumsOn);
    }
  }

  function handleKeyChange(next: Key) {
    setMusicKey(next);
    if (isPlaying && isComplete) {
      getChordAudioEngine().resumeWithSettings(slots as Degree[], style, next, bpm, drumsOn);
    }
  }

  function handleBpmChange(next: number) {
    setBpm(next);
    if (isPlaying && isComplete) {
      getChordAudioEngine().resumeWithSettings(slots as Degree[], style, musicKey, next, drumsOn);
    }
  }

  function handleDrumsToggle() {
    const next = !drumsOn;
    setDrumsOn(next);
    if (isPlaying && isComplete) {
      getChordAudioEngine().resumeWithSettings(slots as Degree[], style, musicKey, bpm, next);
    }
  }

  const pickerMoodPrevDegree = currentIndex > 0 ? slots[currentIndex - 1] : null;
  const pickerMoods = ALL_DEGREES.map((d) =>
    pickerMoodPrevDegree === null ? DEGREE_MOOD[d] : getTransitionMood(pickerMoodPrevDegree, d)
  );

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-4xl flex flex-col gap-12">
        {/* Title / subtitle — its own section */}
        <header className="text-center flex flex-col gap-3 pb-8 border-b border-line">
          <h1 className="font-display italic text-5xl sm:text-6xl text-ink">
            Chord Progression Builder
          </h1>
          <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto">
            Every chord has a vibe. Every jump to the next one has its own plot twist.
            Build your own below — or steal a progression the pros already figured out.
          </p>
        </header>

        {/* Chord picker */}
        {!isComplete ? (
          <div className="flex flex-col gap-5">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted">
              {currentIndex === 0 ? "Select a chord" : `Select chord ${currentIndex + 1} of 4`}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {ALL_DEGREES.map((d) => (
                <button
                  key={d}
                  onClick={() => selectDegree(d)}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-card p-5 sm:p-6 transition hover:-translate-y-0.5 hover:shadow-md hover:border-transparent"
                >
                  <span className={`font-display italic text-5xl sm:text-6xl ${DEGREE_ACCENT[d]}`}>
                    {DEGREES[d]}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-ink-soft text-center leading-tight">
                    {pickerMoods[d]}
                  </span>
                  <span className="text-sm text-muted">{chordLabel(musicKey, d)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-ink-soft text-base -mb-4">
            Your progression is ready — press play to hear it loop.
          </p>
        )}

        {/* Selected chords */}
        <div className="flex flex-col gap-4 items-center w-full">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Selected chords</h2>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm sm:max-w-none sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 sm:w-auto">
            {slots.map((degree, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => editFromSlot(i)}
                  disabled={degree === null}
                  className={`w-full h-28 sm:w-32 sm:h-36 rounded-2xl border flex flex-col items-center justify-center gap-1 transition ${
                    degree !== null
                      ? `bg-card ${DEGREE_BORDER[degree]}/50 hover:brightness-95 cursor-pointer`
                      : i === currentIndex
                        ? "border-dashed border-terracotta/60 bg-terracotta/5"
                        : "border-dashed border-line bg-card/40"
                  }`}
                >
                  {degree !== null ? (
                    <>
                      <span className={`font-display italic text-4xl sm:text-6xl ${DEGREE_ACCENT[degree]}`}>
                        {DEGREES[degree]}
                      </span>
                      <span className="text-xs sm:text-sm text-muted">{chordLabel(musicKey, degree)}</span>
                      <span className="text-base sm:text-sm text-ink-soft italic text-center leading-tight px-1">
                        {DEGREE_MOOD[degree]}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted text-xs sm:text-sm">
                      {i === currentIndex ? "Choose…" : `Slot ${i + 1}`}
                    </span>
                  )}
                </button>
                {i < slots.length - 1 && (
                  <div className="hidden sm:flex flex-col items-center justify-center w-16 text-center">
                    {slots[i] !== null && slots[i + 1] !== null ? (
                      <>
                        <ArrowIcon />
                        <span className="text-xs text-ink-soft italic mt-0.5 leading-tight">
                          {getTransitionMood(slots[i] as Degree, slots[i + 1] as Degree)}
                        </span>
                      </>
                    ) : (
                      <span className="text-line">
                        <ArrowIcon />
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={resetAll}
            className="mt-4 text-base font-medium text-muted hover:text-ink-soft underline underline-offset-4 decoration-line"
          >
            Clear
          </button>
        </div>

        {/* Controls: play (above) / instrument / key / tempo / drums (below) */}
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-card/60 px-5 py-5">
          <button
            onClick={togglePlay}
            disabled={!isComplete}
            title={isComplete ? (isPlaying ? "Pause" : "Play") : "Select all 4 chords to play"}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-terracotta text-cream shadow-sm transition disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:brightness-110 enabled:active:scale-95"
          >
            {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[11px] uppercase tracking-wide text-muted">Style</span>
              <div className="flex items-center gap-1 rounded-full bg-card border border-line p-1">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleStyleChange(s.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      style === s.value ? "bg-terracotta text-cream" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1 items-center">
              <span className="text-[11px] uppercase tracking-wide text-muted">Key</span>
              <select
                value={musicKey}
                onChange={(e) => handleKeyChange(e.target.value as Key)}
                className="rounded-full bg-card border border-line px-3 py-1.5 text-ink font-medium focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              >
                {KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k} major
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 items-center">
              <span className="text-[11px] uppercase tracking-wide text-muted">Tempo · {bpm} BPM</span>
              <input
                type="range"
                min={MIN_BPM}
                max={MAX_BPM}
                step={1}
                value={bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                className="w-32 accent-terracotta"
              />
            </label>

            <div className="flex flex-col gap-1 items-center">
              <span className="text-[11px] uppercase tracking-wide text-muted">Drums</span>
              <button
                onClick={handleDrumsToggle}
                aria-pressed={drumsOn}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  drumsOn ? "bg-terracotta text-cream border-terracotta" : "bg-card text-ink-soft border-line"
                }`}
              >
                <DrumIcon />
                {drumsOn ? "On" : "Off"}
              </button>
            </div>
          </div>
        </div>

        {/* Popular songs */}
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-card/40 px-5 py-7">
          <div className="text-center flex flex-col gap-1">
            <h2 className="font-display italic text-3xl sm:text-4xl text-ink">Or borrow a progression</h2>
            <p className="text-sm text-muted">Classic 4-chord loops that have carried hit songs for decades</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SONG_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.degrees)}
                className="flex flex-col gap-1.5 rounded-2xl border border-line bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md hover:border-terracotta/40"
              >
                <span className="font-display italic text-xl text-ink">{preset.name}</span>
                <span className="text-sm text-muted">{preset.subtitle}</span>
                <span className="text-base font-semibold text-terracotta mt-1">
                  {preset.degrees.map((d) => DEGREES[d]).join(" – ")}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center flex flex-col gap-1">
          <p className="text-sm text-ink-soft">
            Made with love by{" "}
            <a
              href="https://andrea.casino"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-terracotta hover:underline"
            >
              andrea.casino
            </a>
          </p>
          <p className="text-[11px] text-muted">Piano &amp; guitar sounds: FluidR3 GM Soundfont (CC BY 3.0)</p>
        </div>
      </div>
    </main>
  );
}
