/**
 * Constants shared by the capture UI and the server-side World Labs client.
 * They live apart from worldlabs.server.ts for the same reason kiri.ts lives
 * apart from kiri.server.ts: importing them into a client component can never
 * drag the API key into the browser bundle.
 *
 * Everything here was confirmed against the live API rather than read off the
 * docs, which disagree with it in a few places noted below.
 */

/**
 * https://docs.worldlabs.ai/marble/models
 *
 * The exact strings the generate endpoint accepts. The API is FastAPI-backed
 * and answers an unknown model with a 422 enumerating the literals, which is
 * how these were confirmed; it also still accepts three legacy display names
 * ("Marble 0.1-mini" and friends) that are not worth carrying.
 */
export const WORLDLABS_MODELS = {
  draft: "marble-1.0-draft",
  legacy: "marble-1.0",
  standard: "marble-1.1",
  plus: "marble-1.1-plus",
} as const;

export type WorldLabsModel =
  (typeof WORLDLABS_MODELS)[keyof typeof WORLDLABS_MODELS];

/**
 * The one hard limit found so far, and it is not in the docs: the signed upload
 * URL comes back carrying `x-goog-content-length-range: 0,104857600`, so
 * storage refuses anything past 100 MB before generation is ever reached.
 *
 * Worth checking before the upload rather than after — the failure otherwise
 * arrives from Google Cloud Storage as a bare 4xx, having already spent the
 * bandwidth of the whole file.
 */
export const MAX_UPLOAD_BYTES = 104857600;

/**
 * Splat detail comes back at three sizes, keyed exactly as below — the docs
 * call the largest "full" and the API calls it `full_res`.
 *
 * `500k` is the one to store. It lands at 5.6 MB, which is within a rounding
 * error of the 4.9 MB a KIRI room already costs, so nothing downstream has to
 * change. `full_res` is 2.3M splats and 24.9 MB — five times the payload, on a
 * feed that mounts live scenes while you scroll and on phones that have to pull
 * them over cell service.
 */
export const SPLAT_RESOLUTIONS = ["100k", "500k", "full_res"] as const;

export type SplatResolution = (typeof SPLAT_RESOLUTIONS)[number];

/** What a place is saved at, absent a reason to pick another. */
export const DEFAULT_SPLAT_RESOLUTION: SplatResolution = "500k";
