/**
 * Shared NDJSON streaming utilities for server and client.
 * Pattern extracted from /api/personas/generate/route.ts
 */

// ─── Server-side ───────────────────────────────────────────

type EmitFn = (event: Record<string, unknown>) => void;

/**
 * Creates a streaming NDJSON Response.
 * The handler receives an `emit` function to send events line by line.
 *
 * @example
 * return createNDJSONStream(async (emit) => {
 *   emit({ type: 'step', message: 'Starting...' });
 *   const result = await doWork();
 *   emit({ type: 'done', data: result });
 * });
 */
export function createNDJSONStream(
  handler: (emit: EmitFn) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit: EmitFn = (event) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        await handler(emit);
      } catch (error) {
        emit({
          type: "error",
          message: error instanceof Error ? error.message : "Stream failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

// ─── Client-side ───────────────────────────────────────────

/**
 * Reads an NDJSON stream from a fetch Response and calls `onEvent`
 * for each parsed JSON line. Handles partial lines (buffering).
 *
 * @example
 * const res = await fetch('/api/studies/generate-guide-stream', { method: 'POST', body });
 * await readNDJSONStream(res, (event) => {
 *   if (event.type === 'question') setQuestions(prev => [...prev, event]);
 * });
 */
export async function readNDJSONStream<T = Record<string, unknown>>(
  response: Response,
  onEvent: (event: T) => void,
  onError?: (error: Error) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    onError?.(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          onEvent(JSON.parse(trimmed) as T);
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        onEvent(JSON.parse(buffer.trim()) as T);
      } catch {
        // Skip malformed final line
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error("Stream read failed"));
  } finally {
    reader.releaseLock();
  }
}

// ─── Helpers ───────────────────────────────────────────────

/** Delay helper for adding natural pauses between streamed events */
export const streamDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
