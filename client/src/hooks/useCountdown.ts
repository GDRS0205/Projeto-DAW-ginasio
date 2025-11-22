import { useEffect, useRef, useState } from "react";

/**
 * Contador decrescente simples (em segundos).
 * start(tempoEmSegundos), pause(), resume(), reset()
 */
export function useCountdown(initialSeconds = 60) {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [running, setRunning] = useState(false);
  const savedCb = useRef<(() => void) | null>(null);
  const intervalRef = useRef<number | null>(null);

  // limpa intervalo
  const clear = () => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clear();
  }, []);

  const tick = () => {
    setSecondsLeft((s) => {
      if (s <= 1) {
        clear();
        setRunning(false);
        savedCb.current?.();
        return 0;
      }
      return s - 1;
    });
  };

  function start(sec: number, onFinish?: () => void) {
    clear();
    savedCb.current = onFinish || null;
    setSecondsLeft(Math.max(0, Math.floor(sec)));
    setRunning(true);
    intervalRef.current = window.setInterval(tick, 1000);
  }

  function pause() {
    if (!running) return;
    clear();
    setRunning(false);
  }

  function resume() {
    if (running || secondsLeft <= 0) return;
    setRunning(true);
    intervalRef.current = window.setInterval(tick, 1000);
  }

  function reset(sec?: number) {
    clear();
    setRunning(false);
    setSecondsLeft(
      typeof sec === "number" ? Math.max(0, Math.floor(sec)) : initialSeconds
    );
  }

  return { secondsLeft, running, start, pause, resume, reset, setSecondsLeft };
}
