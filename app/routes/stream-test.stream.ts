import type { LoaderFunctionArgs } from "@remix-run/node";
import { popeyeWords } from "../popeye-lyrics";

const PACE_MS = { fast: 40, medium: 140, slow: 320 } as const;

function delayForPace(url: URL): number {
  const pace = url.searchParams.get("pace");
  if (pace === "fast") return PACE_MS.fast;
  if (pace === "slow") return PACE_MS.slow;
  if (pace === "medium") return PACE_MS.medium;

  const raw = Number(url.searchParams.get("delayMs"));
  if (Number.isFinite(raw)) {
    return Math.min(2000, Math.max(15, Math.round(raw)));
  }
  return PACE_MS.medium;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const delayMs = delayForPace(new URL(request.url));
  const words = popeyeWords();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(enc.encode(`${word}\n`));
        if (delayMs > 0) {
          await new Promise<void>((r) => setTimeout(r, delayMs));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
