import { useMemo } from "react";
import { useCountdown } from "../hooks/useCountdown.ts";

type Props = {
  presets?: number[]; // em segundos
};

export default function RestTimer({ presets = [45, 60, 90] }: Props) {
  const { secondsLeft, running, start, pause, resume, reset, setSecondsLeft } =
    useCountdown(60);

  // mm:ss
  const label = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  function beep() {
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 800);
    } catch {
      // silenciosamente ignora se o browser bloquear
    }
  }

  return (
    <div
      className="rest-timer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 12,
        background: "var(--panel)",
      }}
      title="Temporizador de descanso"
    >
      <strong style={{ minWidth: 64, textAlign: "center" }}>{label}</strong>

      {presets.map((p) => (
        <button key={p} onClick={() => start(p, beep)}>
          {p}s
        </button>
      ))}

      {!running ? (
        <button onClick={() => resume()}>▶</button>
      ) : (
        <button onClick={() => pause()}>⏸</button>
      )}
      <button onClick={() => reset()}>↺</button>

      <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
        <button onClick={() => setSecondsLeft((s) => Math.max(0, s - 15))}>
          −15s
        </button>
        <button onClick={() => setSecondsLeft((s) => s + 15)}>+15s</button>
      </div>
    </div>
  );
}
