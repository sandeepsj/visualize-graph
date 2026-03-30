import { useMemo, useState, useCallback } from "react";
import { GraphData, PathResult, NodeInfo, GraphStats, SubgraphResult } from "./types";
import { GraphEngine } from "./graphEngine";

export interface UseGraphEngineReturn {
  /** The underlying engine instance */
  engine: GraphEngine;

  // --- Selection state ---
  /** Currently selected node ids */
  selectedNodes: string[];
  /** Select a single node (replaces selection) */
  selectNode: (id: string) => void;
  /** Toggle a node in/out of the multi-selection */
  toggleNode: (id: string) => void;
  /** Select multiple nodes at once */
  selectNodes: (ids: string[]) => void;
  /** Clear all selections */
  clearSelection: () => void;

  // --- Derived results (react to selection) ---
  /** Nodes connected to the current selection */
  connectedNodes: { id: string; label: string }[];
  /** Nodes NOT connected to the current selection (inverted) */
  invertedNodes: { id: string; label: string }[];
  /** All paths between currently selected nodes (when 2+ selected) */
  paths: PathResult[];

  // --- Direct queries (do not depend on selection state) ---
  /** Get rich info about any node */
  getNodeInfo: (id: string) => NodeInfo | null;
  /** Find all paths between two nodes */
  findAllPaths: (from: string, to: string, maxDepth?: number) => PathResult[];
  /** Find shortest path between two nodes */
  findShortestPath: (from: string, to: string) => PathResult | null;
  /** Find all paths between multiple nodes */
  findAllPathsBetweenMultiple: (ids: string[]) => PathResult[];
  /** Check reachability */
  areConnected: (from: string, to: string) => boolean;
  /** Get the inverted selection for any node */
  getInvertedSelection: (id: string) => { id: string; label: string }[];
  /** Get connected nodes for any node */
  getConnectedNodes: (id: string) => { id: string; label: string }[];
  /** Extract a subgraph of specific node ids */
  getSubgraph: (ids: string[]) => SubgraphResult;
  /** Get a node's neighborhood subgraph */
  getNeighborhoodSubgraph: (id: string) => SubgraphResult;
  /** Get nodes ranked by degree */
  getNodesByDegree: () => { id: string; label: string; degree: number }[];
  /** Get graph statistics */
  getStats: () => GraphStats;

  // --- Serialization ---
  /** Serialize connected/inverted node list to CSV string */
  toCSV: (nodes?: { id: string; label: string }[]) => string;
  /** Serialize connected/inverted node list to JSON string */
  toJSON: (nodes?: { id: string; label: string }[]) => string;
  /** Serialize current paths to CSV string */
  pathsToCSV: (paths?: PathResult[]) => string;
  /** Serialize current paths to JSON string */
  pathsToJSON: (paths?: PathResult[]) => string;
  /** Export full graph as JSON string */
  toGraphJSON: () => string;
}

/**
 * React hook for headless graph operations.
 * Provides all graph querying, selection state, and serialization
 * without rendering any UI.
 */
export function useGraphEngine(data: GraphData): UseGraphEngineReturn {
  const engine = useMemo(() => new GraphEngine(data), [data]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectNode = useCallback((id: string) => setSelected(new Set([id])), []);
  const toggleNode = useCallback(
    (id: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    []
  );
  const selectNodes = useCallback((ids: string[]) => setSelected(new Set(ids)), []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectedArray = useMemo(() => Array.from(selected), [selected]);

  const connectedNodes = useMemo(() => {
    if (selectedArray.length === 0) return [];
    const all = new Set<string>();
    for (const id of selectedArray) {
      for (const c of engine.getConnectedNodes(id)) all.add(c);
    }
    return Array.from(all).map((id) => ({ id, label: engine.getLabel(id) }));
  }, [selectedArray, engine]);

  const invertedNodes = useMemo(() => {
    if (selectedArray.length !== 1) return [];
    return engine.getInvertedSelectionWithLabels(selectedArray[0]);
  }, [selectedArray, engine]);

  const paths = useMemo(() => {
    if (selectedArray.length < 2) return [];
    return engine.findAllPathsBetweenMultiple(selectedArray);
  }, [selectedArray, engine]);

  return {
    engine,
    selectedNodes: selectedArray,
    selectNode,
    toggleNode,
    selectNodes,
    clearSelection,
    connectedNodes,
    invertedNodes,
    paths,

    getNodeInfo: (id) => engine.getNodeInfo(id),
    findAllPaths: (from, to, maxDepth) => engine.findAllPaths(from, to, maxDepth),
    findShortestPath: (from, to) => engine.findShortestPath(from, to),
    findAllPathsBetweenMultiple: (ids) => engine.findAllPathsBetweenMultiple(ids),
    areConnected: (from, to) => engine.areConnected(from, to),
    getInvertedSelection: (id) => engine.getInvertedSelectionWithLabels(id),
    getConnectedNodes: (id) => engine.getConnectedNodesWithLabels(id),
    getSubgraph: (ids) => engine.getSubgraph(ids),
    getNeighborhoodSubgraph: (id) => engine.getNeighborhoodSubgraph(id),
    getNodesByDegree: () => engine.getNodesByDegree(),
    getStats: () => engine.getStats(),

    toCSV: (nodes) => GraphEngine.toCSV(nodes ?? connectedNodes),
    toJSON: (nodes) => GraphEngine.toJSON(nodes ?? connectedNodes),
    pathsToCSV: (p) => GraphEngine.pathsToCSV(p ?? paths),
    pathsToJSON: (p) => GraphEngine.pathsToJSON(p ?? paths),
    toGraphJSON: () => engine.toGraphJSON(),
  };
}
