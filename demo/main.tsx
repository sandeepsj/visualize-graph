import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { GraphVisualizer, GraphData } from "../src";

const undirectedGraph: GraphData = {
  directed: false,
  nodes: [
    { id: "a", label: "Alice" },
    { id: "b", label: "Bob" },
    { id: "c", label: "Charlie" },
    { id: "d", label: "Diana" },
    { id: "e", label: "Eve" },
    { id: "f", label: "Frank" },
    { id: "g", label: "Grace" },
    { id: "h", label: "Hank" },
  ],
  edges: [
    { source: "a", target: "b", label: "friends" },
    { source: "a", target: "c" },
    { source: "b", target: "c" },
    { source: "b", target: "d" },
    { source: "c", target: "e" },
    { source: "d", target: "e" },
    { source: "d", target: "f" },
    { source: "e", target: "g" },
    { source: "f", target: "g" },
    { source: "g", target: "h" },
    { source: "a", target: "h" },
  ],
};

const directedGraph: GraphData = {
  directed: true,
  nodes: [
    { id: "api", label: "API Gateway" },
    { id: "auth", label: "Auth Service" },
    { id: "users", label: "User Service" },
    { id: "orders", label: "Order Service" },
    { id: "payments", label: "Payment Service" },
    { id: "notify", label: "Notification" },
    { id: "db", label: "Database" },
    { id: "cache", label: "Cache" },
  ],
  edges: [
    { source: "api", target: "auth" },
    { source: "api", target: "users" },
    { source: "api", target: "orders" },
    { source: "auth", target: "db" },
    { source: "auth", target: "cache" },
    { source: "users", target: "db" },
    { source: "orders", target: "payments" },
    { source: "orders", target: "db" },
    { source: "payments", target: "notify" },
    { source: "payments", target: "db" },
    { source: "notify", target: "users" },
  ],
};

function App() {
  const [graphType, setGraphType] = useState<"undirected" | "directed">(
    "undirected"
  );
  const data = graphType === "undirected" ? undirectedGraph : directedGraph;

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>
        React Graph Visualizer
      </h1>
      <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 14 }}>
        Click a node to explore connections. Ctrl/Cmd+Click for multi-select.
        Use the mode toggle to switch between Connected, Inverted, and Paths
        views.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setGraphType("undirected")}
          style={{
            padding: "8px 16px",
            border: `2px solid ${graphType === "undirected" ? "#4f46e5" : "#d1d5db"}`,
            borderRadius: 8,
            background: graphType === "undirected" ? "#4f46e5" : "#fff",
            color: graphType === "undirected" ? "#fff" : "#374151",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Social Network (Undirected)
        </button>
        <button
          onClick={() => setGraphType("directed")}
          style={{
            padding: "8px 16px",
            border: `2px solid ${graphType === "directed" ? "#4f46e5" : "#d1d5db"}`,
            borderRadius: 8,
            background: graphType === "directed" ? "#4f46e5" : "#fff",
            color: graphType === "directed" ? "#fff" : "#374151",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Microservices (Directed)
        </button>
      </div>

      <GraphVisualizer
        data={data}
        width={900}
        height={550}
        showEdgeLabels={graphType === "undirected"}
        onSelectionChange={(selected, connected) => {
          console.log("Selection:", selected, "Connected:", connected);
        }}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
