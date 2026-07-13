import { env } from "@/config/env.js";
import { UpstreamServiceError } from "@/lib/errors.js";

const TIMEOUT_MS = 15_000;

interface CallOptions {
  method?: string;
  path: string;
  body?: unknown;
  isFormData?: boolean;
  /** Defaults to "application/json"; irrelevant when isFormData is set. */
  accept?: string;
}

interface CallResult {
  status: number;
  headers: Headers;
  buffer: Buffer;
}

// Shared by both satellite-service clients (report-service, export-worker):
// attaches the internal auth header, enforces a timeout so a stuck
// downstream call can't hang a request indefinitely, and normalizes network
// failures into a typed error the route layer can map to a clean 502.
export async function callInternalService(baseUrl: string, options: CallOptions): Promise<CallResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "X-Internal-Api-Key": env.INTERNAL_API_KEY,
      Accept: options.accept ?? "application/json",
    };

    let body: string | FormData | undefined;
    if (options.body !== undefined) {
      if (options.isFormData) {
        body = options.body as FormData;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(options.body);
      }
    }

    const res = await fetch(`${baseUrl}${options.path}`, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: controller.signal,
    });

    const buffer = Buffer.from(await res.arrayBuffer());
    return { status: res.status, headers: res.headers, buffer };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamServiceError("Internal service timed out.");
    }
    throw new UpstreamServiceError();
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJsonResult<T>(result: CallResult): T {
  try {
    return JSON.parse(result.buffer.toString("utf-8")) as T;
  } catch {
    throw new UpstreamServiceError("Internal service returned an unexpected response.");
  }
}
