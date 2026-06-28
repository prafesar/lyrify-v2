import { AnalysisMode } from "../constants";

export type LegacyAnalysisVariant = "compact" | "rich";

/**
 * Maps legacy modes ("compact", "rich") or raw values to the canonical client-side AnalysisMode.
 */
export function mapLegacyToCanonicalMode(mode: string | null | undefined): AnalysisMode {
  if (!mode) return "overview";
  const m = mode.toLowerCase();
  if (m === "compact") return "overview";
  if (m === "rich") return "vocabulary"; // rich maps to vocabulary for detailed analysis compatibility
  if (m === "overview" || m === "vocabulary" || m === "phrases" || m === "style") {
    return m as AnalysisMode;
  }
  return "overview";
}

/**
 * Returns the default canonical mode.
 */
export function getDefaultAnalysisMode(): AnalysisMode {
  return "overview";
}

/**
 * Maps canonical client AnalysisMode to legacy backend/request formats if needed.
 */
export function mapCanonicalToLegacyRequest(mode: AnalysisMode): "compact" | "rich" {
  if (mode === "overview") return "compact";
  return "rich";
}
