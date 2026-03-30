import { PathResult } from "./types";

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportNodeListAsCSV(
  nodes: { id: string; label: string }[],
  filename: string = "nodes.csv"
) {
  const header = "ID,Label\n";
  const rows = nodes.map((n) => `"${n.id}","${n.label}"`).join("\n");
  downloadFile(header + rows, filename, "text/csv");
}

export function exportNodeListAsJSON(
  nodes: { id: string; label: string }[],
  filename: string = "nodes.json"
) {
  downloadFile(JSON.stringify(nodes, null, 2), filename, "application/json");
}

export function exportPathsAsCSV(
  paths: PathResult[],
  filename: string = "paths.csv"
) {
  const header = "Path #,Nodes,Labels\n";
  const rows = paths
    .map(
      (p, i) =>
        `${i + 1},"${p.path.join(" -> ")}","${p.labels.join(" -> ")}"`
    )
    .join("\n");
  downloadFile(header + rows, filename, "text/csv");
}

export function exportPathsAsJSON(
  paths: PathResult[],
  filename: string = "paths.json"
) {
  downloadFile(JSON.stringify(paths, null, 2), filename, "application/json");
}

export function exportSVG(svgElement: SVGSVGElement, filename: string = "graph.svg") {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  downloadFile(svgString, filename, "image/svg+xml");
}

export function exportPNG(
  svgElement: SVGSVGElement,
  filename: string = "graph.png",
  scale: number = 2
) {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const canvas = document.createElement("canvas");
  const bbox = svgElement.getBoundingClientRect();
  canvas.width = bbox.width * scale;
  canvas.height = bbox.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  img.src = url;
}
