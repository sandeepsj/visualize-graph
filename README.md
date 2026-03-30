# react-graph-visualizer

Interactive React component **and** headless engine for graph visualization, node selection, path finding, and data export. Supports directed and undirected graphs.

---

## Table of Contents

- [Install](#install)
- [Quick Start — Visual Mode](#quick-start--visual-mode)
- [Quick Start — Headless Mode](#quick-start--headless-mode)
- [Data Format](#data-format)
- [Visual Component API](#visual-component-api)
  - [Props](#props)
  - [Interaction Guide](#interaction-guide)
  - [Selection Modes](#selection-modes)
- [Headless APIs](#headless-apis)
  - [GraphEngine (class)](#graphengine-class)
  - [useGraphEngine (React hook)](#usegraphengine-react-hook)
- [Export & Serialization](#export--serialization)
- [Type Reference](#type-reference)
- [Examples](#examples)
- [Running the Demo](#running-the-demo)

---

## Install

```bash
npm install react-graph-visualizer
```

Peer dependencies: `react >= 17`, `react-dom >= 17`.

---

## Quick Start — Visual Mode

Render an interactive force-directed graph with built-in selection UI, sidebar, and export buttons.

```tsx
import { GraphVisualizer } from "react-graph-visualizer";

const data = {
  directed: false,
  nodes: [
    { id: "a", label: "Alice" },
    { id: "b", label: "Bob" },
    { id: "c", label: "Charlie" },
    { id: "d", label: "Diana" },
  ],
  edges: [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "d" },
    { source: "a", target: "d" },
  ],
};

function App() {
  return (
    <GraphVisualizer
      data={data}
      width={900}
      height={600}
      onSelectionChange={(selected, connected) => {
        console.log("Selected:", selected, "Connected:", connected);
      }}
    />
  );
}
```

---

## Quick Start — Headless Mode

Use `GraphEngine` directly when you don't need any UI — works in Node.js, tests, scripts, or server-side code.

```ts
import { GraphEngine } from "react-graph-visualizer";

const engine = new GraphEngine({
  directed: true,
  nodes: [
    { id: "api", label: "API Gateway" },
    { id: "auth", label: "Auth Service" },
    { id: "db", label: "Database" },
    { id: "cache", label: "Cache" },
  ],
  edges: [
    { source: "api", target: "auth" },
    { source: "auth", target: "db" },
    { source: "auth", target: "cache" },
    { source: "api", target: "db" },
  ],
});

// Connected nodes
engine.getConnectedNodes("auth");
// => ["db", "cache", "api"]

// Inverted selection — everything NOT connected to "auth"
engine.getInvertedSelection("auth");
// => []  (all nodes happen to be connected in this small graph)

// All paths from api to db
engine.findAllPaths("api", "db");
// => [
//   { path: ["api", "auth", "db"], labels: ["API Gateway", "Auth Service", "Database"] },
//   { path: ["api", "db"],         labels: ["API Gateway", "Database"] }
// ]

// Shortest path
engine.findShortestPath("api", "db");
// => { path: ["api", "db"], labels: ["API Gateway", "Database"] }

// Graph stats
engine.getStats();
// => { nodeCount: 4, edgeCount: 4, directed: true, density: 0.3333, ... }

// Serialize results to CSV string (no DOM needed)
const csv = GraphEngine.toCSV(engine.getConnectedNodesWithLabels("auth"));
```

Or use the **React hook** `useGraphEngine` for headless usage inside React apps (manages selection state for you):

```tsx
import { useGraphEngine } from "react-graph-visualizer";

function MyCustomUI({ data }) {
  const graph = useGraphEngine(data);

  // Select a node programmatically
  graph.selectNode("auth");

  // Reactive results
  console.log(graph.connectedNodes); // [{ id: "db", label: "Database" }, ...]
  console.log(graph.invertedNodes);  // nodes NOT connected
  console.log(graph.paths);          // auto-computed when 2+ selected

  // Serialize current results
  const csv = graph.toCSV();
  const json = graph.pathsToJSON();

  return <div>{/* build your own UI */}</div>;
}
```

---

## Data Format

### `GraphData`

```ts
interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean; // default: false
}
```

### `GraphNode`

```ts
interface GraphNode {
  id: string;                          // unique identifier
  label?: string;                      // display name (defaults to id)
  color?: string;                      // per-node color override
  size?: number;                       // per-node radius override
  metadata?: Record<string, unknown>;  // arbitrary data attached to node
}
```

### `GraphEdge`

```ts
interface GraphEdge {
  source: string;                      // source node id
  target: string;                      // target node id
  label?: string;                      // edge label
  weight?: number;                     // edge weight
  metadata?: Record<string, unknown>;  // arbitrary data attached to edge
}
```

---

## Visual Component API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `GraphData` | **required** | Graph nodes and edges |
| `width` | `number` | `900` | SVG canvas width in pixels |
| `height` | `number` | `600` | SVG canvas height in pixels |
| `onSelectionChange` | `(selectedIds: string[], connectedIds: string[]) => void` | — | Fires when selection changes |
| `nodeColor` | `string` | `#4f46e5` | Default node fill color |
| `highlightColor` | `string` | `#f59e0b` | Color for selected / connected nodes |
| `dimColor` | `string` | `#d1d5db` | Color for non-relevant nodes |
| `invertColor` | `string` | `#ef4444` | Color for inverted selection nodes |
| `nodeRadius` | `number` | `20` | Default circle radius |
| `showEdgeLabels` | `boolean` | `false` | Render edge labels on the graph |
| `showArrows` | `boolean` | `true` | Show arrowheads on directed edges |
| `className` | `string` | — | CSS class applied to the outer container |

### Interaction Guide

| Action | Effect |
|--------|--------|
| **Click** a node | Select it (replaces any previous selection) |
| **Ctrl/Cmd + Click** a node | Toggle it into/out of a multi-selection |
| **Click** the background | Clear all selections |
| **Drag** a node | Reposition it in the force layout |
| **Scroll wheel** | Zoom in/out |
| **Click + drag** background | Pan the viewport |

### Selection Modes

The sidebar provides three toggle modes:

| Mode | Behavior |
|------|----------|
| **Connected** | Highlights direct neighbors of the selected node. Lists them in the sidebar. |
| **Inverted** | Highlights every node that is NOT a direct neighbor (selection inverter). |
| **Paths** | When 2+ nodes are selected, finds and lists all paths connecting them. Highlights path edges. |

The sidebar includes **Export** buttons to download results as CSV/JSON and the graph image as SVG/PNG.

---

## Headless APIs

### `GraphEngine` (class)

Import: `import { GraphEngine } from "react-graph-visualizer"`

No React or DOM dependency. Works in Node.js, tests, server-side, scripts — anywhere.

#### Constructor

```ts
const engine = new GraphEngine(data: GraphData);
```

#### Node Accessors

| Method | Returns | Description |
|--------|---------|-------------|
| `getNode(id)` | `GraphNode \| undefined` | Get full node object |
| `getLabel(id)` | `string` | Display label |
| `getNodeIds()` | `string[]` | All node ids |
| `getNodes()` | `GraphNode[]` | All node objects |
| `getEdges()` | `GraphEdge[]` | All edge objects |
| `hasNode(id)` | `boolean` | Check existence |
| `hasEdge(source, target)` | `boolean` | Check if edge exists |
| `getNodeInfo(id)` | `NodeInfo \| null` | Rich info: label, degrees, all neighbors |

#### Neighbor Queries

| Method | Returns | Description |
|--------|---------|-------------|
| `getConnectedNodes(id)` | `string[]` | All direct neighbors (in + out) |
| `getConnectedNodesWithLabels(id)` | `{id, label}[]` | Same, with labels |
| `getOutgoingNeighbors(id)` | `string[]` | Only outgoing (directed) |
| `getIncomingNeighbors(id)` | `string[]` | Only incoming (directed) |

#### Degree

| Method | Returns | Description |
|--------|---------|-------------|
| `getDegree(id)` | `number` | Total unique neighbors |
| `getOutDegree(id)` | `number` | Outgoing edge count |
| `getInDegree(id)` | `number` | Incoming edge count |

#### Selection Inverter

| Method | Returns | Description |
|--------|---------|-------------|
| `getInvertedSelection(id)` | `string[]` | Nodes NOT connected to `id` |
| `getInvertedSelectionWithLabels(id)` | `{id, label}[]` | Same, with labels |

#### Path Finding

| Method | Returns | Description |
|--------|---------|-------------|
| `findAllPaths(from, to, maxDepth?)` | `PathResult[]` | All paths via DFS (default depth limit: 10) |
| `findShortestPath(from, to)` | `PathResult \| null` | Shortest path via BFS |
| `findAllPathsBetweenMultiple(ids)` | `PathResult[]` | All pairwise paths between multiple nodes |
| `areConnected(from, to)` | `boolean` | Reachability check |

#### Edge Queries

| Method | Returns | Description |
|--------|---------|-------------|
| `getEdgesOfNode(id)` | `GraphEdge[]` | All edges touching a node |
| `getEdgesForNodes(idSet)` | `GraphEdge[]` | Edges where both endpoints are in the set |
| `getEdgesOnPaths(paths)` | `Set<string>` | Edge keys (`"a->b"`) on given paths |

#### Subgraph Extraction

| Method | Returns | Description |
|--------|---------|-------------|
| `getSubgraph(ids)` | `SubgraphResult` | Subgraph of specified nodes + their internal edges |
| `getNeighborhoodSubgraph(id)` | `SubgraphResult` | Node + all neighbors + connecting edges |

#### Graph Analytics

| Method | Returns | Description |
|--------|---------|-------------|
| `getStats()` | `GraphStats` | Node/edge count, density, avg/max/min degree, components, isolated nodes |
| `getNodesByDegree()` | `{id, label, degree}[]` | All nodes sorted by degree (descending) |

#### Serialization (string output, no DOM)

| Method | Returns | Description |
|--------|---------|-------------|
| `GraphEngine.toCSV(nodes)` | `string` | CSV of `{id, label}[]` |
| `GraphEngine.toJSON(nodes)` | `string` | JSON of `{id, label}[]` |
| `GraphEngine.pathsToCSV(paths)` | `string` | CSV of `PathResult[]` |
| `GraphEngine.pathsToJSON(paths)` | `string` | JSON of `PathResult[]` |
| `engine.toGraphJSON()` | `string` | Full graph data as JSON |

#### Meta

| Method | Returns | Description |
|--------|---------|-------------|
| `isDirected()` | `boolean` | Whether graph is directed |
| `nodeCount()` | `number` | Number of nodes |
| `edgeCount()` | `number` | Number of edges |

---

### `useGraphEngine` (React hook)

Import: `import { useGraphEngine } from "react-graph-visualizer"`

A React hook that wraps `GraphEngine` with reactive selection state. Use it to build your own custom UI or to drive headless logic inside a React app.

```ts
const graph = useGraphEngine(data: GraphData): UseGraphEngineReturn;
```

#### Selection State

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `selectedNodes` | `string[]` | Currently selected node ids |
| `selectNode(id)` | `void` | Select a single node (clears previous) |
| `toggleNode(id)` | `void` | Add/remove node from multi-selection |
| `selectNodes(ids)` | `void` | Select multiple nodes at once |
| `clearSelection()` | `void` | Deselect everything |

#### Reactive Results (auto-update when selection changes)

| Property | Type | Description |
|----------|------|-------------|
| `connectedNodes` | `{id, label}[]` | Neighbors of all selected nodes |
| `invertedNodes` | `{id, label}[]` | Non-neighbors (when 1 node selected) |
| `paths` | `PathResult[]` | All paths between selected nodes (when 2+ selected) |

#### Direct Query Methods

Same as `GraphEngine` methods — `getNodeInfo`, `findAllPaths`, `findShortestPath`, `findAllPathsBetweenMultiple`, `areConnected`, `getInvertedSelection`, `getConnectedNodes`, `getSubgraph`, `getNeighborhoodSubgraph`, `getNodesByDegree`, `getStats`.

#### Serialization

| Method | Description |
|--------|-------------|
| `toCSV(nodes?)` | CSV string of provided nodes or current `connectedNodes` |
| `toJSON(nodes?)` | JSON string of provided nodes or current `connectedNodes` |
| `pathsToCSV(paths?)` | CSV string of provided paths or current `paths` |
| `pathsToJSON(paths?)` | JSON string of provided paths or current `paths` |
| `toGraphJSON()` | Full graph data as JSON string |

---

## Export & Serialization

### Headless (string output — no DOM required)

Use `GraphEngine` static methods to get raw strings you can write to a file, send over an API, or process further:

```ts
import { GraphEngine } from "react-graph-visualizer";

const engine = new GraphEngine(data);

// Get CSV string of connected nodes
const csv = GraphEngine.toCSV(engine.getConnectedNodesWithLabels("a"));
// => "ID,Label\n\"a\",\"Alice\"\n..."

// Get JSON string of all paths
const json = GraphEngine.pathsToJSON(engine.findAllPaths("a", "d"));

// Full graph as JSON
const graphJson = engine.toGraphJSON();
```

### Browser (triggers file download — requires DOM)

```ts
import {
  exportNodeListAsCSV,
  exportNodeListAsJSON,
  exportPathsAsCSV,
  exportPathsAsJSON,
  exportSVG,
  exportPNG,
} from "react-graph-visualizer";

// Download a node list
exportNodeListAsCSV([{ id: "a", label: "Alice" }], "my-nodes.csv");

// Download paths
exportPathsAsJSON(paths, "routes.json");

// Download graph image (pass the SVG DOM element)
exportSVG(svgElement, "graph.svg");
exportPNG(svgElement, "graph.png", 2); // 2x scale
```

---

## Type Reference

### `PathResult`

```ts
interface PathResult {
  path: string[];    // ordered node ids
  labels: string[];  // ordered node labels
}
```

### `NodeInfo`

```ts
interface NodeInfo {
  id: string;
  label: string;
  metadata?: Record<string, unknown>;
  outDegree: number;
  inDegree: number;
  degree: number;
  outgoingNeighbors: { id: string; label: string }[];
  incomingNeighbors: { id: string; label: string }[];
  allNeighbors: { id: string; label: string }[];
}
```

### `GraphStats`

```ts
interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  directed: boolean;
  density: number;             // 0-1
  avgDegree: number;
  maxDegree: number;
  minDegree: number;
  connectedComponents: number; // weakly connected components
  isolatedNodes: string[];     // nodes with 0 connections
}
```

### `SubgraphResult`

```ts
interface SubgraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
}
```

---

## Examples

### Headless: Find all paths and export to CSV (Node.js / script)

```ts
import { GraphEngine } from "react-graph-visualizer";
import { writeFileSync } from "fs";

const engine = new GraphEngine({
  directed: false,
  nodes: [
    { id: "1", label: "Start" },
    { id: "2", label: "Mid A" },
    { id: "3", label: "Mid B" },
    { id: "4", label: "End" },
  ],
  edges: [
    { source: "1", target: "2" },
    { source: "1", target: "3" },
    { source: "2", target: "4" },
    { source: "3", target: "4" },
    { source: "2", target: "3" },
  ],
});

const paths = engine.findAllPaths("1", "4");
console.log(`Found ${paths.length} paths`);

// Write to file
writeFileSync("paths.csv", GraphEngine.pathsToCSV(paths));
writeFileSync("paths.json", GraphEngine.pathsToJSON(paths));
```

### Headless: Graph analytics

```ts
const engine = new GraphEngine(data);

// Who are the most connected nodes?
const ranked = engine.getNodesByDegree();
console.log("Top nodes:", ranked.slice(0, 5));

// Overall graph health
const stats = engine.getStats();
console.log(`Density: ${stats.density}, Components: ${stats.connectedComponents}`);
console.log(`Isolated nodes: ${stats.isolatedNodes.join(", ") || "none"}`);

// Can user A reach user D?
console.log(engine.areConnected("a", "d")); // true/false

// What's the shortest route?
const shortest = engine.findShortestPath("a", "d");
console.log(shortest?.labels.join(" → "));
```

### Headless: Selection inverter

```ts
const engine = new GraphEngine(data);

// "Show me everything NOT connected to node X"
const isolated = engine.getInvertedSelectionWithLabels("api");
console.log("Disconnected from API:", isolated);
const csv = GraphEngine.toCSV(isolated);
```

### React hook: Custom UI with headless engine

```tsx
import { useGraphEngine } from "react-graph-visualizer";

function DependencyExplorer({ data }) {
  const graph = useGraphEngine(data);

  return (
    <div>
      <h3>Services</h3>
      <ul>
        {graph.engine.getNodes().map((node) => (
          <li
            key={node.id}
            onClick={() => graph.selectNode(node.id)}
            style={{
              fontWeight: graph.selectedNodes.includes(node.id)
                ? "bold"
                : "normal",
            }}
          >
            {node.label ?? node.id} (degree: {graph.engine.getDegree(node.id)})
          </li>
        ))}
      </ul>

      {graph.connectedNodes.length > 0 && (
        <div>
          <h4>Connected to selection:</h4>
          <ul>
            {graph.connectedNodes.map((n) => (
              <li key={n.id}>{n.label}</li>
            ))}
          </ul>
          <button onClick={() => console.log(graph.toCSV())}>
            Copy as CSV
          </button>
        </div>
      )}

      {graph.paths.length > 0 && (
        <div>
          <h4>Paths ({graph.paths.length}):</h4>
          {graph.paths.map((p, i) => (
            <div key={i}>{p.labels.join(" → ")}</div>
          ))}
          <button onClick={() => console.log(graph.pathsToCSV())}>
            Copy paths as CSV
          </button>
        </div>
      )}
    </div>
  );
}
```

### Visual + headless combined

```tsx
import { GraphVisualizer, useGraphEngine } from "react-graph-visualizer";

function App() {
  const graph = useGraphEngine(data);

  return (
    <div>
      {/* Visual graph */}
      <GraphVisualizer
        data={data}
        onSelectionChange={(sel) => graph.selectNodes(sel)}
      />

      {/* Programmatic access alongside the visual */}
      <pre>{graph.toGraphJSON()}</pre>
      <pre>Stats: {JSON.stringify(graph.getStats(), null, 2)}</pre>
    </div>
  );
}
```

---

## Running the Demo

```bash
git clone <repo>
cd visualize-graph
npm install
npm run demo
```

Opens at `http://localhost:5173` with two sample graphs (social network + microservices).

---

## License

MIT
