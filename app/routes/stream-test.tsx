import { useEffect, useRef, useState } from "react";

type Pace = "fast" | "medium" | "slow";

async function consumeWordLines(
  response: Response,
  onLine: (word: string) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const dec = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const w = line.trim();
      if (w) onLine(w);
    }
  }

  const tail = buffer.trim();
  if (tail && !signal.aborted) onLine(tail);
}

export default function StreamTestRoute() {
  const [pace, setPace] = useState<Pace>("medium");
  const [words, setWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const ac = new AbortController();
    setError(null);
    setWords([]);
    setRunning(true);

    void (async () => {
      try {
        const res = await fetch(`/stream-test/stream?pace=${pace}`, {
          signal: ac.signal,
        });
        if (!res.ok) {
          if (seq.current === id) setError(`HTTP ${res.status}`);
          return;
        }
        await consumeWordLines(
          res,
          (word) => {
            if (seq.current !== id) return;
            setWords((prev) => [...prev, word]);
          },
          ac.signal
        );
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (seq.current === id) {
          setError(e instanceof Error ? e.message : "Stream failed");
        }
      } finally {
        if (seq.current === id) setRunning(false);
      }
    })();

    return () => {
      ac.abort();
    };
  }, [pace]);

  const prose = words.join(" ");

  return (
    <div id="contact" style={{ padding: "1rem" }}>
      <h1>Lyrics stream (word by word)</h1>
      <p style={{ maxWidth: "52rem" }}>
        The server sends one word per line over a{" "}
        <code>ReadableStream</code> from{" "}
        <code>/stream-test/stream</code>. This page reads the response as it
        arrives and prints each word. Pace is a simulated delay between words so
        you can try fast, medium, and slow in DevTools → Network.
      </p>

      <p style={{ marginTop: "0.75rem" }}>
        <strong>Pace:</strong>{" "}
        {(["fast", "medium", "slow"] as const).map((p) => (
          <button
            key={p}
            type="button"
            disabled={pace === p}
            onClick={() => setPace(p)}
            style={{
              marginRight: "0.35rem",
              fontWeight: pace === p ? 700 : 500,
            }}
          >
            {p}
          </button>
        ))}
        {running ? (
          <span style={{ color: "#666", marginLeft: "0.5rem" }}>
            Streaming…
          </span>
        ) : null}
      </p>

      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}

      <article
        style={{
          marginTop: "1.25rem",
          padding: "1rem",
          background: "#f8f8f8",
          borderRadius: 8,
          minHeight: "8rem",
          whiteSpace: "pre-wrap",
          fontSize: "1.05rem",
          lineHeight: 1.55,
        }}
        aria-live="polite"
        aria-busy={running}
      >
        {prose || (running ? "" : "(no words yet)")}
      </article>

      <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#555" }}>
        Words received: {words.length}
      </p>
    </div>
  );
}
