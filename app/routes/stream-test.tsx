import { defer, type LoaderFunctionArgs } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";

export type LyticTier = "fast" | "medium" | "slow";

export type LyticEvent = {
  kind: "lytic";
  tier: LyticTier;
  /** How long this event was delayed server-side (simulated upstream latency). */
  simulatedLatencyMs: number;
  event: string;
  properties: Record<string, string | number | boolean>;
  receivedAt: string;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function clampMs(n: number, fallback: number, min = 50, max = 30_000) {
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseTierMs(
  url: URL,
  key: LyticTier,
  fallback: number
): number {
  const raw = url.searchParams.get(key);
  if (raw === null || raw === "") return fallback;
  return clampMs(Number(raw), fallback);
}

async function emitLytic(
  tier: LyticTier,
  simulatedLatencyMs: number,
  event: string,
  properties: Record<string, string | number | boolean>
): Promise<LyticEvent> {
  await sleep(simulatedLatencyMs);
  return {
    kind: "lytic",
    tier,
    simulatedLatencyMs,
    event,
    properties: { ...properties, tier },
    receivedAt: new Date().toISOString(),
  };
}

const DEFAULT_MS: Record<LyticTier, number> = {
  fast: 200,
  medium: 1400,
  slow: 3200,
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const fastMs = parseTierMs(url, "fast", DEFAULT_MS.fast);
  const mediumMs = parseTierMs(url, "medium", DEFAULT_MS.medium);
  const slowMs = parseTierMs(url, "slow", DEFAULT_MS.slow);

  const lyticsFast = emitLytic("fast", fastMs, "page.context", {
    path: url.pathname,
    referrer: "simulated",
  });

  const lyticsMedium = emitLytic("medium", mediumMs, "experiment.exposure", {
    flagKey: "stream_demo",
    variant: "b",
  });

  const lyticsSlow = emitLytic("slow", slowMs, "recommendations.loaded", {
    count: 12,
    cacheHit: false,
  });

  return defer({
    meta: {
      title: "Lytics streaming demo",
      hint: "Deferred lytic events resolve at fast / medium / slow simulated latencies and stream in the document response as each promise completes.",
      tiers: { fast: fastMs, medium: mediumMs, slow: slowMs } as const,
    },
    lyticsFast,
    lyticsMedium,
    lyticsSlow,
  });
}

function LyticPanel({
  title,
  promise,
}: {
  title: string;
  promise: Promise<LyticEvent>;
}) {
  return (
    <section style={{ marginTop: "1.25rem" }}>
      <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>{title}</h2>
      <Suspense
        fallback={
          <p style={{ color: "#666", margin: 0 }}>Streaming lytic…</p>
        }
      >
        <Await resolve={promise}>
          {(lytic: LyticEvent) => (
            <pre
              style={{
                background: "#f4f4f4",
                padding: "0.75rem",
                borderRadius: 8,
                margin: 0,
                overflow: "auto",
              }}
            >
              {JSON.stringify(lytic, null, 2)}
            </pre>
          )}
        </Await>
      </Suspense>
    </section>
  );
}

export default function StreamTestRoute() {
  const { meta, lyticsFast, lyticsMedium, lyticsSlow } =
    useLoaderData<typeof loader>();

  const { fast, medium, slow } = meta.tiers;
  const qs = `fast=${fast}&medium=${medium}&slow=${slow}`;

  return (
    <div id="contact" style={{ padding: "1rem" }}>
      <h1>{meta.title}</h1>
      <p>{meta.hint}</p>
      <p style={{ marginBottom: "0.25rem" }}>
        <strong>Simulated latencies (ms):</strong> fast{" "}
        <code>{fast}</code>, medium <code>{medium}</code>, slow{" "}
        <code>{slow}</code>
      </p>
      <p style={{ fontSize: "0.9rem", color: "#444" }}>
        Override:{" "}
        <a href={`?${qs}`}>current</a> ·{" "}
        <a href="?fast=80&medium=600&slow=5000">stress</a> ·{" "}
        <a href="?fast=100&medium=2500&slow=2500">medium race</a>
      </p>

      <LyticPanel title="Fast tier" promise={lyticsFast} />
      <LyticPanel title="Medium tier" promise={lyticsMedium} />
      <LyticPanel title="Slow tier" promise={lyticsSlow} />
    </div>
  );
}
