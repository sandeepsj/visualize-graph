// Visual component
export { GraphVisualizer } from "./GraphVisualizer";

// Headless engine (works without React or DOM)
export { GraphEngine } from "./graphEngine";

// React hook for headless usage
export { useGraphEngine } from "./useGraphEngine";
export type { UseGraphEngineReturn } from "./useGraphEngine";

// Browser download helpers (require DOM)
export {
  exportNodeListAsCSV,
  exportNodeListAsJSON,
  exportPathsAsCSV,
  exportPathsAsJSON,
  exportSVG,
  exportPNG,
} from "./exportUtils";

// Types
export type {
  GraphNode,
  GraphEdge,
  GraphData,
  GraphVisualizerProps,
  SelectionMode,
  PathResult,
  NodeInfo,
  GraphStats,
  SubgraphResult,
} from "./types";
