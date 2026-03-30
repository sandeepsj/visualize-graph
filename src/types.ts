export interface GraphNode {
  id: string;
  label?: string;
  color?: string;
  size?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean;
}

export interface GraphVisualizerProps {
  data: GraphData;
  width?: number;
  height?: number;
  /** Called when node selection changes */
  onSelectionChange?: (selectedIds: string[], connectedIds: string[]) => void;
  /** Custom node color (default: #4f46e5) */
  nodeColor?: string;
  /** Highlight color for selected/connected nodes (default: #f59e0b) */
  highlightColor?: string;
  /** Color for dimmed (non-selected) nodes (default: #d1d5db) */
  dimColor?: string;
  /** Color for inverted selection highlight (default: #ef4444) */
  invertColor?: string;
  /** Node radius (default: 20) */
  nodeRadius?: number;
  /** Show edge labels */
  showEdgeLabels?: boolean;
  /** Show edge direction arrows for directed graphs */
  showArrows?: boolean;
  /** Custom CSS class for the container */
  className?: string;
}

export type SelectionMode = "connected" | "inverted" | "paths";

export interface PathResult {
  /** Ordered array of node ids forming the path */
  path: string[];
  /** Ordered array of node labels forming the path */
  labels: string[];
}

export interface NodeInfo {
  id: string;
  label: string;
  metadata?: Record<string, unknown>;
  /** Number of outgoing edges */
  outDegree: number;
  /** Number of incoming edges */
  inDegree: number;
  /** Total unique neighbors */
  degree: number;
  /** Nodes this node points to */
  outgoingNeighbors: { id: string; label: string }[];
  /** Nodes that point to this node */
  incomingNeighbors: { id: string; label: string }[];
  /** All unique neighbors */
  allNeighbors: { id: string; label: string }[];
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  directed: boolean;
  /** Edge density (0-1) */
  density: number;
  avgDegree: number;
  maxDegree: number;
  minDegree: number;
  /** Number of weakly connected components */
  connectedComponents: number;
  /** Nodes with zero connections */
  isolatedNodes: string[];
}

export interface SubgraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
}
