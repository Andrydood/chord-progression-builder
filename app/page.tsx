"use client";

import { useEffect, useMemo, useState } from "react";
import { getChordAudioEngine, type Style } from "@/lib/audioEngine";
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

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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

export default function Home() {
  const [musicKey, setMusicKey] = useState<Key>("C");
  const [style, setStyle] = useState<Style>("piano");
  const [slots, setSlots] = useState<(Degree | null)[]>([null, null, null, null]);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentIndex = slots.findIndex((s) => s === null);
  const isComplete = currentIndex === -1;

  useEffect(() => {
    return () => {
      getChordAudioEngine().stop();
    };
  }, []);

  function selectDegree(degree: Degree) {
    if (currentIndex === -1) return;
    const engine = getChordAudioEngine();
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
    }
    engine.playChord(style, musicKey, degree);
    setSlots((prev) => prev.map((s, i) => (i === currentIndex ? degree : s)));
  }

  function editFromSlot(index: number) {
    if (slots[index] === null) return;
    const engine = getChordAudioEngine();
    engine.stop();
    setIsPlaying(false);
    setSlots((prev) => prev.map((s, i) => (i < index ? s : null)));
  }

  function resetAll() {
    const engine = getChordAudioEngine();
    engine.stop();
    setIsPlaying(false);
    setSlots([null, null, null, null]);
  }

  function togglePlay() {
    const engine = getChordAudioEngine();
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
      return;
    }
    if (!isComplete) return;
    engine.startLoop(slots as Degree[], style, musicKey);
    setIsPlaying(true);
  }

  function handleStyleChange(next: Style) {
    if (isPlaying) {
      getChordAudioEngine().stop();
      setIsPlaying(false);
    }
    setStyle(next);
  }

  function handleKeyChange(next: Key) {
    if (isPlaying) {
      getChordAudioEngine().stop();
      setIsPlaying(false);
    }
    setMusicKey(next);
  }

  const pickerMoods = useMemo(() => {
    const prevDegree = currentIndex > 0 ? slots[currentIndex - 1] : null;
    return ALL_DEGREES.map((d) => (prevDegree === null ? DEGREE_MOOD[d] : getTransitionMood(prevDegree, d)));
  }, [currentIndex, slots]);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-3xl flex flex-col gap-10">
        <header className="text-center flex flex-col gap-2">
          <h1 className="font-display italic text-4xl sm:text-5xl text-ink">
            Chord Progression Builder
          </h1>
          <p className="text-ink-soft text-sm sm:text-base max-w-xl mx-auto">
            Pick four chords by the way they feel. Each one shows the mood it brings,
            and the mood of the jump from the last chord — then play your progression on loop.
          </p>
        </header>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={togglePlay}
            disabled={!isComplete}
            title={isComplete ? (isPlaying ? "Pause" : "Play") : "Select all 4 chords to play"}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-terracotta text-cream shadow-sm transition disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:brightness-110 enabled:active:scale-95"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="flex items-center gap-1 rounded-full bg-card border border-line p-1">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStyleChange(s.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  style === s.value
                    ? "bg-terracotta text-cream"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Key
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

          <button
            onClick={resetAll}
            className="text-sm text-muted hover:text-ink-soft underline underline-offset-4 decoration-line"
          >
            Start over
          </button>
        </div>

        {/* Progression slots */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {slots.map((degree, i) => (
            <div key={i} className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => editFromSlot(i)}
                disabled={degree === null}
                className={`w-20 h-24 sm:w-24 sm:h-28 rounded-2xl border flex flex-col items-center justify-center gap-1 transition ${
                  degree !== null
                    ? `bg-card ${DEGREE_BORDER[degree]}/50 hover:brightness-95 cursor-pointer`
                    : i === currentIndex
                      ? "border-dashed border-terracotta/60 bg-terracotta/5"
                      : "border-dashed border-line bg-card/40"
                }`}
              >
                {degree !== null ? (
                  <>
                    <span className={`font-display italic text-3xl sm:text-4xl ${DEGREE_ACCENT[degree]}`}>
                      {DEGREES[degree]}
                    </span>
                    <span className="text-xs text-muted">{chordLabel(musicKey, degree)}</span>
                  </>
                ) : (
                  <span className="text-muted text-xs">
                    {i === currentIndex ? "Choose…" : `Slot ${i + 1}`}
                  </span>
                )}
              </button>
              {i < slots.length - 1 && (
                <div className="flex flex-col items-center justify-center w-14 sm:w-20 text-center">
                  {slots[i] !== null && slots[i + 1] !== null ? (
                    <>
                      <ArrowIcon />
                      <span className="text-[10px] sm:text-xs text-ink-soft italic mt-0.5 leading-tight">
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

        {/* Chord picker */}
        {!isComplete ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted">
              {currentIndex === 0 ? "Select a chord" : `Select chord ${currentIndex + 1} of 4`}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {ALL_DEGREES.map((d) => (
                <button
                  key={d}
                  onClick={() => selectDegree(d)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md hover:border-transparent"
                >
                  <span className={`font-display italic text-4xl ${DEGREE_ACCENT[d]}`}>
                    {DEGREES[d]}
                  </span>
                  <span className="text-sm font-semibold text-ink-soft text-center leading-tight">
                    {pickerMoods[d]}
                  </span>
                  <span className="text-xs text-muted">{chordLabel(musicKey, d)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-ink-soft text-sm">
            Your progression is ready — press play to hear it loop.
          </p>
        )}
      </div>
    </main>
  );
}
