import { GraphData, GraphEdge, GraphNode, PathResult, NodeInfo, GraphStats, SubgraphResult } from "./types";

export class GraphEngine {
  private adjacency: Map<string, Set<string>> = new Map();
  private incomingAdjacency: Map<string, Set<string>> = new Map();
  private directed: boolean;
  private edges: GraphEdge[];
  private nodes: GraphNode[];
  private labelMap: Map<string, string> = new Map();
  private nodeMap: Map<string, GraphNode> = new Map();

  constructor(data: GraphData) {
    this.directed = data.directed ?? false;
    this.edges = data.edges;
    this.nodes = data.nodes;

    for (const node of data.nodes) {
      this.adjacency.set(node.id, new Set());
      this.incomingAdjacency.set(node.id, new Set());
      this.labelMap.set(node.id, node.label ?? node.id);
      this.nodeMap.set(node.id, node);
    }

    for (const edge of data.edges) {
      this.adjacency.get(edge.source)?.add(edge.target);
      this.incomingAdjacency.get(edge.target)?.add(edge.source);
      if (!this.directed) {
        this.adjacency.get(edge.target)?.add(edge.source);
        this.incomingAdjacency.get(edge.source)?.add(edge.target);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Node accessors
  // ---------------------------------------------------------------------------

  /** Get display label for a node */
  getLabel(id: string): string {
    return this.labelMap.get(id) ?? id;
  }

  /** Get full node object by id */
  getNode(id: string): GraphNode | undefined {
    return this.nodeMap.get(id);
  }

  /** Get all node ids */
  getNodeIds(): string[] {
    return Array.from(this.adjacency.keys());
  }

  /** Get all nodes */
  getNodes(): GraphNode[] {
    return [...this.nodes];
  }

  /** Get all edges */
  getEdges(): GraphEdge[] {
    return [...this.edges];
  }

  /** Check if a node exists */
  hasNode(id: string): boolean {
    return this.adjacency.has(id);
  }

  /** Check if an edge exists between source and target */
  hasEdge(source: string, target: string): boolean {
    return this.adjacency.get(source)?.has(target) ?? false;
  }

  /** Get rich info about a node: label, degree, neighbors */
  getNodeInfo(nodeId: string): NodeInfo | null {
    if (!this.hasNode(nodeId)) return null;
    const outgoing = Array.from(this.adjacency.get(nodeId) ?? []);
    const incoming = Array.from(this.incomingAdjacency.get(nodeId) ?? []);
    const allNeighbors = new Set([...outgoing, ...incoming]);
    return {
      id: nodeId,
      label: this.getLabel(nodeId),
      metadata: this.nodeMap.get(nodeId)?.metadata,
      outDegree: outgoing.length,
      inDegree: incoming.length,
      degree: allNeighbors.size,
      outgoingNeighbors: outgoing.map((id) => ({ id, label: this.getLabel(id) })),
      incomingNeighbors: incoming.map((id) => ({ id, label: this.getLabel(id) })),
      allNeighbors: Array.from(allNeighbors).map((id) => ({ id, label: this.getLabel(id) })),
    };
  }

  // ---------------------------------------------------------------------------
  // Neighbor queries
  // ---------------------------------------------------------------------------

  /** Get all directly connected nodes (outgoing + incoming for directed, all for undirected) */
  getConnectedNodes(nodeId: string): string[] {
    const connected = new Set<string>();
    const outgoing = this.adjacency.get(nodeId);
    if (outgoing) {
      for (const id of outgoing) connected.add(id);
    }
    if (this.directed) {
      for (const edge of this.edges) {
        if (edge.target === nodeId) connected.add(edge.source);
      }
    }
    return Array.from(connected);
  }

  /** Get connected nodes with labels */
  getConnectedNodesWithLabels(nodeId: string): { id: string; label: string }[] {
    return this.getConnectedNodes(nodeId).map((id) => ({
      id,
      label: this.getLabel(id),
    }));
  }

  /** Get only outgoing neighbors (directed graphs) */
  getOutgoingNeighbors(nodeId: string): string[] {
    return Array.from(this.adjacency.get(nodeId) ?? []);
  }

  /** Get only incoming neighbors (directed graphs) */
  getIncomingNeighbors(nodeId: string): string[] {
    return Array.from(this.incomingAdjacency.get(nodeId) ?? []);
  }

  // ---------------------------------------------------------------------------
  // Degree
  // ---------------------------------------------------------------------------

  /** Out-degree of a node */
  getOutDegree(nodeId: string): number {
    return this.adjacency.get(nodeId)?.size ?? 0;
  }

  /** In-degree of a node */
  getInDegree(nodeId: string): number {
    return this.incomingAdjacency.get(nodeId)?.size ?? 0;
  }

  /** Total degree (unique neighbors count) */
  getDegree(nodeId: string): number {
    const all = new Set([
      ...Array.from(this.adjacency.get(nodeId) ?? []),
      ...Array.from(this.incomingAdjacency.get(nodeId) ?? []),
    ]);
    return all.size;
  }

  // ---------------------------------------------------------------------------
  // Selection inverter
  // ---------------------------------------------------------------------------

  /** Get all nodes NOT connected to the given node */
  getInvertedSelection(nodeId: string): string[] {
    const connected = new Set(this.getConnectedNodes(nodeId));
    connected.add(nodeId);
    return Array.from(this.adjacency.keys()).filter((id) => !connected.has(id));
  }

  /** Get inverted selection with labels */
  getInvertedSelectionWithLabels(nodeId: string): { id: string; label: string }[] {
    return this.getInvertedSelection(nodeId).map((id) => ({
      id,
      label: this.getLabel(id),
    }));
  }

  // ---------------------------------------------------------------------------
  // Path finding
  // ---------------------------------------------------------------------------

  /** Find all paths between two nodes using DFS (with cycle prevention and depth limit) */
  findAllPaths(startId: string, endId: string, maxDepth: number = 10): PathResult[] {
    const results: PathResult[] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[]) => {
      if (path.length > maxDepth) return;
      if (current === endId) {
        results.push({
          path: [...path],
          labels: path.map((id) => this.getLabel(id)),
        });
        return;
      }
      visited.add(current);
      const neighbors = this.adjacency.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, [...path, neighbor]);
          }
        }
      }
      visited.delete(current);
    };

    dfs(startId, [startId]);
    return results;
  }

  /** Find the shortest path between two nodes using BFS */
  findShortestPath(startId: string, endId: string): PathResult | null {
    if (startId === endId) {
      return { path: [startId], labels: [this.getLabel(startId)] };
    }
    const visited = new Set<string>([startId]);
    const queue: string[][] = [[startId]];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      const neighbors = this.adjacency.get(current);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        const newPath = [...path, neighbor];
        if (neighbor === endId) {
          return {
            path: newPath,
            labels: newPath.map((id) => this.getLabel(id)),
          };
        }
        visited.add(neighbor);
        queue.push(newPath);
      }
    }
    return null;
  }

  /** Find all paths connecting multiple nodes (pairwise) */
  findAllPathsBetweenMultiple(nodeIds: string[]): PathResult[] {
    const allPaths: PathResult[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const paths = this.findAllPaths(nodeIds[i], nodeIds[j]);
        for (const p of paths) {
          const key = p.path.join("->");
          if (!seen.has(key)) {
            seen.add(key);
            allPaths.push(p);
          }
        }
        if (this.directed) {
          const reversePaths = this.findAllPaths(nodeIds[j], nodeIds[i]);
          for (const p of reversePaths) {
            const key = p.path.join("->");
            if (!seen.has(key)) {
              seen.add(key);
              allPaths.push(p);
            }
          }
        }
      }
    }
    return allPaths;
  }

  /** Check if two nodes are reachable from each other */
  areConnected(startId: string, endId: string): boolean {
    return this.findShortestPath(startId, endId) !== null;
  }

  // ---------------------------------------------------------------------------
  // Edge queries
  // ---------------------------------------------------------------------------

  /** Get all edges connected to a set of nodes (both endpoints in the set) */
  getEdgesForNodes(nodeIds: Set<string>): GraphEdge[] {
    return this.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
  }

  /** Get all edges touching a node (as source or target) */
  getEdgesOfNode(nodeId: string): GraphEdge[] {
    return this.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId
    );
  }

  /** Get edges on specific paths (returns set of "source->target" keys) */
  getEdgesOnPaths(paths: PathResult[]): Set<string> {
    const edgeKeys = new Set<string>();
    for (const { path } of paths) {
      for (let i = 0; i < path.length - 1; i++) {
        edgeKeys.add(`${path[i]}->${path[i + 1]}`);
        if (!this.directed) {
          edgeKeys.add(`${path[i + 1]}->${path[i]}`);
        }
      }
    }
    return edgeKeys;
  }

  // ---------------------------------------------------------------------------
  // Subgraph extraction
  // ---------------------------------------------------------------------------

  /** Extract a subgraph containing only the specified nodes and edges between them */
  getSubgraph(nodeIds: string[]): SubgraphResult {
    const idSet = new Set(nodeIds);
    const nodes = this.nodes.filter((n) => idSet.has(n.id));
    const edges = this.edges.filter(
      (e) => idSet.has(e.source) && idSet.has(e.target)
    );
    return { nodes, edges, directed: this.directed };
  }

  /** Get the neighborhood subgraph: the node + all its direct neighbors + connecting edges */
  getNeighborhoodSubgraph(nodeId: string): SubgraphResult {
    const neighborIds = this.getConnectedNodes(nodeId);
    return this.getSubgraph([nodeId, ...neighborIds]);
  }

  // ---------------------------------------------------------------------------
  // Graph-level analytics
  // ---------------------------------------------------------------------------

  /** Get summary stats about the graph */
  getStats(): GraphStats {
    const nodeCount = this.nodes.length;
    const edgeCount = this.edges.length;
    const degrees = this.nodes.map((n) => this.getDegree(n.id));
    const avgDegree = nodeCount > 0 ? degrees.reduce((a, b) => a + b, 0) / nodeCount : 0;
    const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
    const minDegree = degrees.length > 0 ? Math.min(...degrees) : 0;
    const density =
      nodeCount > 1
        ? this.directed
          ? edgeCount / (nodeCount * (nodeCount - 1))
          : (2 * edgeCount) / (nodeCount * (nodeCount - 1))
        : 0;

    // Find connected components via BFS
    const visited = new Set<string>();
    let componentCount = 0;
    for (const nodeId of this.adjacency.keys()) {
      if (visited.has(nodeId)) continue;
      componentCount++;
      const queue = [nodeId];
      visited.add(nodeId);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const neighbor of this.adjacency.get(current) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
        if (this.directed) {
          for (const neighbor of this.incomingAdjacency.get(current) ?? []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
      }
    }

    // Isolated nodes (degree 0)
    const isolatedNodes = this.nodes.filter((n) => this.getDegree(n.id) === 0).map((n) => n.id);

    return {
      nodeCount,
      edgeCount,
      directed: this.directed,
      density: Math.round(density * 10000) / 10000,
      avgDegree: Math.round(avgDegree * 100) / 100,
      maxDegree,
      minDegree,
      connectedComponents: componentCount,
      isolatedNodes,
    };
  }

  /** Get nodes sorted by degree (descending) */
  getNodesByDegree(): { id: string; label: string; degree: number }[] {
    return this.nodes
      .map((n) => ({ id: n.id, label: this.getLabel(n.id), degree: this.getDegree(n.id) }))
      .sort((a, b) => b.degree - a.degree);
  }

  // ---------------------------------------------------------------------------
  // Serialization (headless-friendly — returns strings, not browser downloads)
  // ---------------------------------------------------------------------------

  /** Serialize a node list to CSV string */
  static toCSV(nodes: { id: string; label: string }[]): string {
    const header = "ID,Label";
    const rows = nodes.map((n) => `"${n.id}","${n.label}"`);
    return [header, ...rows].join("\n");
  }

  /** Serialize paths to CSV string */
  static pathsToCSV(paths: PathResult[]): string {
    const header = "Path #,Nodes,Labels";
    const rows = paths.map(
      (p, i) => `${i + 1},"${p.path.join(" -> ")}","${p.labels.join(" -> ")}"`
    );
    return [header, ...rows].join("\n");
  }

  /** Serialize a node list to JSON string */
  static toJSON(nodes: { id: string; label: string }[]): string {
    return JSON.stringify(nodes, null, 2);
  }

  /** Serialize paths to JSON string */
  static pathsToJSON(paths: PathResult[]): string {
    return JSON.stringify(paths, null, 2);
  }

  /** Export the full graph data as JSON string */
  toGraphJSON(): string {
    return JSON.stringify(
      { nodes: this.nodes, edges: this.edges, directed: this.directed },
      null,
      2
    );
  }

  // ---------------------------------------------------------------------------
  // Meta
  // ---------------------------------------------------------------------------

  isDirected(): boolean {
    return this.directed;
  }

  nodeCount(): number {
    return this.nodes.length;
  }

  edgeCount(): number {
    return this.edges.length;
  }
}
