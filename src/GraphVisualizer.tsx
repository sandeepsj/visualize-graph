import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { GraphVisualizerProps, SelectionMode, PathResult } from "./types";
import { GraphEngine } from "./graphEngine";
import {
  exportNodeListAsCSV,
  exportNodeListAsJSON,
  exportPathsAsCSV,
  exportPathsAsJSON,
  exportSVG,
  exportPNG,
} from "./exportUtils";

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  color?: string;
  size?: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  label?: string;
  weight?: number;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  data,
  width = 900,
  height = 600,
  onSelectionChange,
  nodeColor = "#4f46e5",
  highlightColor = "#f59e0b",
  dimColor = "#d1d5db",
  invertColor = "#ef4444",
  nodeRadius = 20,
  showEdgeLabels = false,
  showArrows = true,
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<SelectionMode>("connected");
  const [connectedNodes, setConnectedNodes] = useState<string[]>([]);
  const [invertedNodes, setInvertedNodes] = useState<string[]>([]);
  const [paths, setPaths] = useState<PathResult[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const engine = useMemo(() => new GraphEngine(data), [data]);
  const directed = data.directed ?? false;

  // Build simulation data
  const simNodes: SimNode[] = useMemo(
    () =>
      data.nodes.map((n) => ({
        id: n.id,
        label: n.label ?? n.id,
        color: n.color,
        size: n.size,
      })),
    [data.nodes]
  );

  const simLinks: SimLink[] = useMemo(
    () =>
      data.edges.map((e) => ({
        source: e.source,
        target: e.target,
        label: e.label,
        weight: e.weight,
      })),
    [data.edges]
  );

  const handleNodeClick = useCallback(
    (nodeId: string, event: MouseEvent) => {
      setSelectedNodes((prev) => {
        const next = new Set(prev);
        if (event.ctrlKey || event.metaKey) {
          // Multi-select with ctrl/cmd
          if (next.has(nodeId)) next.delete(nodeId);
          else next.add(nodeId);
        } else {
          if (next.has(nodeId) && next.size === 1) {
            next.clear();
          } else {
            next.clear();
            next.add(nodeId);
          }
        }
        return next;
      });
    },
    []
  );

  // Compute connected/inverted/paths based on selection and mode
  useEffect(() => {
    const ids = Array.from(selectedNodes);
    if (ids.length === 0) {
      setConnectedNodes([]);
      setInvertedNodes([]);
      setPaths([]);
      onSelectionChange?.([], []);
      return;
    }

    if (ids.length === 1) {
      const connected = engine.getConnectedNodes(ids[0]);
      setConnectedNodes(connected);
      setInvertedNodes(engine.getInvertedSelection(ids[0]));
      setPaths([]);
      onSelectionChange?.(ids, connected);
    } else {
      // Multiple selected: find paths
      const connected = new Set<string>();
      for (const id of ids) {
        for (const c of engine.getConnectedNodes(id)) connected.add(c);
      }
      setConnectedNodes(Array.from(connected));
      const allPaths = engine.findAllPathsBetweenMultiple(ids);
      setPaths(allPaths);
      const pathNodeIds = new Set<string>();
      for (const p of allPaths) for (const n of p.path) pathNodeIds.add(n);
      onSelectionChange?.(ids, Array.from(pathNodeIds));
    }
  }, [selectedNodes, engine, onSelectionChange]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Arrow marker for directed graphs
    if (directed && showArrows) {
      svg
        .append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", nodeRadius + 10)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#94a3b8");

      svg
        .select("defs")
        .append("marker")
        .attr("id", "arrowhead-highlight")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", nodeRadius + 10)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", highlightColor);
    }

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(nodeRadius + 10));

    // Links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", directed && showArrows ? "url(#arrowhead)" : null);

    // Edge labels
    let edgeLabel: d3.Selection<any, SimLink, SVGGElement, unknown> | null = null;
    if (showEdgeLabels) {
      edgeLabel = g
        .append("g")
        .attr("class", "edge-labels")
        .selectAll("text")
        .data(simLinks)
        .join("text")
        .text((d) => d.label ?? "")
        .attr("font-size", 10)
        .attr("fill", "#64748b")
        .attr("text-anchor", "middle");
    }

    // Node groups
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => d.size ?? nodeRadius)
      .attr("fill", (d) => d.color ?? nodeColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Node labels
    node
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("fill", "#fff")
      .attr("pointer-events", "none");

    // Click handler
    node.on("click", (event: MouseEvent, d) => {
      event.stopPropagation();
      handleNodeClick(d.id, event);
    });

    // Hover
    node
      .on("mouseenter", (_, d) => setHoveredNode(d.id))
      .on("mouseleave", () => setHoveredNode(null));

    // Click on background to deselect
    svg.on("click", () => {
      setSelectedNodes(new Set());
    });

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      if (edgeLabel) {
        edgeLabel
          .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
          .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 5);
      }

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [
    data,
    simNodes,
    simLinks,
    width,
    height,
    nodeColor,
    directed,
    showArrows,
    showEdgeLabels,
    nodeRadius,
    handleNodeClick,
    highlightColor,
  ]);

  // Update visual highlighting when selection changes
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const ids = Array.from(selectedNodes);
    const hasSelection = ids.length > 0;

    // Build highlight sets
    const selectedSet = new Set(ids);
    const connectedSet = new Set(connectedNodes);
    const invertedSet = new Set(invertedNodes);

    // Edges on paths
    const pathEdgeKeys = engine.getEdgesOnPaths(paths);
    const pathNodeSet = new Set<string>();
    for (const p of paths) for (const n of p.path) pathNodeSet.add(n);

    svg.selectAll<SVGGElement, SimNode>(".nodes g").each(function (d) {
      const circle = d3.select(this).select("circle");
      if (!hasSelection) {
        circle
          .attr("fill", d.color ?? nodeColor)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .attr("opacity", 1);
        d3.select(this).select("text").attr("opacity", 1);
        return;
      }

      if (selectedSet.has(d.id)) {
        circle
          .attr("fill", highlightColor)
          .attr("stroke", "#fff")
          .attr("stroke-width", 3)
          .attr("opacity", 1);
        d3.select(this).select("text").attr("opacity", 1);
      } else if (mode === "inverted" && invertedSet.has(d.id)) {
        circle
          .attr("fill", invertColor)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .attr("opacity", 1);
        d3.select(this).select("text").attr("opacity", 1);
      } else if (mode === "paths" && pathNodeSet.has(d.id)) {
        circle
          .attr("fill", highlightColor)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .attr("opacity", 1);
        d3.select(this).select("text").attr("opacity", 1);
      } else if (mode === "connected" && connectedSet.has(d.id)) {
        circle
          .attr("fill", highlightColor)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .attr("opacity", 0.9);
        d3.select(this).select("text").attr("opacity", 1);
      } else {
        circle
          .attr("fill", dimColor)
          .attr("stroke", "#e5e7eb")
          .attr("stroke-width", 1)
          .attr("opacity", 0.3);
        d3.select(this).select("text").attr("opacity", 0.3);
      }
    });

    // Highlight edges
    svg.selectAll<SVGLineElement, SimLink>(".links line").each(function (d) {
      const sourceId = String(typeof d.source === "object" ? (d.source as SimNode).id : d.source);
      const targetId = String(typeof d.target === "object" ? (d.target as SimNode).id : d.target);
      const edgeKey = `${sourceId}->${targetId}`;
      const reverseKey = `${targetId}->${sourceId}`;

      if (!hasSelection) {
        d3.select(this)
          .attr("stroke", "#94a3b8")
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6)
          .attr("marker-end", directed && showArrows ? "url(#arrowhead)" : null);
        return;
      }

      const isOnPath = pathEdgeKeys.has(edgeKey) || pathEdgeKeys.has(reverseKey);
      const involvesSelected =
        selectedSet.has(sourceId) || selectedSet.has(targetId);
      const connectsToSelected =
        (selectedSet.has(sourceId) && connectedSet.has(targetId)) ||
        (selectedSet.has(targetId) && connectedSet.has(sourceId));

      if (mode === "paths" && isOnPath) {
        d3.select(this)
          .attr("stroke", highlightColor)
          .attr("stroke-width", 3)
          .attr("stroke-opacity", 1)
          .attr("marker-end", directed && showArrows ? "url(#arrowhead-highlight)" : null);
      } else if (mode === "connected" && connectsToSelected) {
        d3.select(this)
          .attr("stroke", highlightColor)
          .attr("stroke-width", 2.5)
          .attr("stroke-opacity", 0.9)
          .attr("marker-end", directed && showArrows ? "url(#arrowhead-highlight)" : null);
      } else {
        d3.select(this)
          .attr("stroke", "#94a3b8")
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.15)
          .attr("marker-end", directed && showArrows ? "url(#arrowhead)" : null);
      }
    });
  }, [
    selectedNodes,
    connectedNodes,
    invertedNodes,
    paths,
    mode,
    nodeColor,
    highlightColor,
    dimColor,
    invertColor,
    directed,
    showArrows,
    engine,
  ]);

  const selectedArray = Array.from(selectedNodes);

  const displayList = useMemo(() => {
    if (selectedArray.length === 0) return [];
    if (mode === "connected") {
      return connectedNodes.map((id) => ({ id, label: engine.getLabel(id) }));
    }
    if (mode === "inverted") {
      return invertedNodes.map((id) => ({ id, label: engine.getLabel(id) }));
    }
    return [];
  }, [selectedArray, mode, connectedNodes, invertedNodes, engine]);

  const handleExportCSV = () => {
    if (mode === "paths" && paths.length > 0) {
      exportPathsAsCSV(paths);
    } else if (displayList.length > 0) {
      exportNodeListAsCSV(displayList);
    }
  };

  const handleExportJSON = () => {
    if (mode === "paths" && paths.length > 0) {
      exportPathsAsJSON(paths);
    } else if (displayList.length > 0) {
      exportNodeListAsJSON(displayList);
    }
  };

  const handleExportSVG = () => {
    if (svgRef.current) exportSVG(svgRef.current);
  };

  const handleExportPNG = () => {
    if (svgRef.current) exportPNG(svgRef.current);
  };

  return (
    <div
      ref={containerRef}
      className={`rgv-container ${className ?? ""}`}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: "flex",
        gap: 16,
      }}
    >
      {/* Graph canvas */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fafbfc",
          flex: "1 1 auto",
        }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ display: "block" }}
        />
      </div>

      {/* Sidebar panel */}
      <div
        style={{
          width: 300,
          minWidth: 260,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          fontSize: 13,
        }}
      >
        {/* Mode selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: 12, color: "#475569" }}>
            Selection Mode
          </label>
          <div style={{ display: "flex", gap: 4 }}>
            {(
              [
                ["connected", "Connected"],
                ["inverted", "Inverted"],
                ["paths", "Paths"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  border: `1px solid ${mode === m ? "#4f46e5" : "#d1d5db"}`,
                  borderRadius: 6,
                  background: mode === m ? "#4f46e5" : "#fff",
                  color: mode === m ? "#fff" : "#374151",
                  cursor: "pointer",
                  fontWeight: mode === m ? 600 : 400,
                  fontSize: 12,
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              lineHeight: 1.4,
              padding: "2px 0",
            }}
          >
            {mode === "connected" &&
              "Click a node to see its direct connections."}
            {mode === "inverted" &&
              "Click a node to highlight everything NOT connected to it."}
            {mode === "paths" &&
              "Ctrl/Cmd+Click 2+ nodes to find all paths between them."}
          </div>
        </div>

        {/* Selected nodes */}
        {selectedArray.length > 0 && (
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Selected ({selectedArray.length})
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              {selectedArray.map((id) => (
                <span
                  key={id}
                  style={{
                    background: highlightColor,
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {engine.getLabel(id)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Node list (connected or inverted mode) */}
        {displayList.length > 0 && (
          <div style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              {mode === "connected" ? "Connected Nodes" : "Inverted Selection"}{" "}
              ({displayList.length})
            </div>
            <div
              style={{
                flex: "1 1 auto",
                overflow: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                maxHeight: 260,
              }}
            >
              {displayList.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    padding: "6px 10px",
                    borderBottom:
                      i < displayList.length - 1 ? "1px solid #f1f5f9" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{n.label}</span>
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>{n.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paths list */}
        {mode === "paths" && paths.length > 0 && (
          <div style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Paths Found ({paths.length})
            </div>
            <div
              style={{
                flex: "1 1 auto",
                overflow: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                maxHeight: 260,
              }}
            >
              {paths.map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 10px",
                    borderBottom:
                      i < paths.length - 1 ? "1px solid #f1f5f9" : "none",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#64748b", marginRight: 6 }}>
                    #{i + 1}
                  </span>
                  {p.labels.join(" → ")}
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "paths" && selectedArray.length < 2 && (
          <div
            style={{
              color: "#94a3b8",
              fontSize: 12,
              fontStyle: "italic",
              textAlign: "center",
              padding: 20,
            }}
          >
            Ctrl/Cmd+Click to select 2 or more nodes
          </div>
        )}

        {selectedArray.length === 0 && (
          <div
            style={{
              color: "#94a3b8",
              fontSize: 12,
              fontStyle: "italic",
              textAlign: "center",
              padding: 20,
            }}
          >
            Click a node to start exploring
          </div>
        )}

        {/* Export buttons */}
        {(displayList.length > 0 || (mode === "paths" && paths.length > 0)) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#475569" }}>
              Export Data
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={handleExportCSV}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                CSV
              </button>
              <button
                onClick={handleExportJSON}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                JSON
              </button>
            </div>
          </div>
        )}

        {/* Graph export */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#475569" }}>
            Export Graph
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={handleExportSVG}
              style={{
                flex: 1,
                padding: "6px 0",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              SVG
            </button>
            <button
              onClick={handleExportPNG}
              style={{
                flex: 1,
                padding: "6px 0",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              PNG
            </button>
          </div>
        </div>

        {/* Info badge */}
        <div
          style={{
            marginTop: "auto",
            padding: "8px 10px",
            background: "#f8fafc",
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            fontSize: 11,
            color: "#94a3b8",
            lineHeight: 1.4,
          }}
        >
          {data.nodes.length} nodes · {data.edges.length} edges ·{" "}
          {directed ? "Directed" : "Undirected"}
        </div>
      </div>
    </div>
  );
};
