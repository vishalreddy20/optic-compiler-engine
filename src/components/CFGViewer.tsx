import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { CFGNode, ASTNode } from '../engine/types';

interface CFGViewerProps {
  cfg: CFGNode[] | null;
}

interface LayoutBlock {
  id: string;
  x: number;
  y: number;
  label: string;
  stmtCount: number;
  stmtPreview: string[];
  isReachable: boolean;
  isEntry: boolean;
  isExit: boolean;
}

interface LayoutEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  edgeType: 'true' | 'false' | 'unconditional' | 'back';
}

const BLOCK_W = 180;
const BLOCK_H = 70;

const LAYER_GAP_Y = 120;

function stmtToString(stmt: ASTNode): string {
  if (!stmt) return '';
  switch (stmt.type) {
    case 'VariableDeclaration':
      return `${stmt.varType} ${stmt.name}${stmt.init ? ' = ...' : ''}`;
    case 'ReturnStatement':
      return `return${stmt.argument ? ' ...' : ''}`;
    case 'Identifier': return stmt.name;
    case 'Literal': return String(stmt.raw || stmt.value);
    case 'BinaryExpression': return `${stmtToString(stmt.left)} ${stmt.operator} ${stmtToString(stmt.right)}`;
    case 'AssignmentExpression': return `${stmtToString(stmt.left)} ${stmt.operator} ...`;
    case 'UpdateExpression': return stmt.prefix ? `${stmt.operator}${stmtToString(stmt.argument)}` : `${stmtToString(stmt.argument)}${stmt.operator}`;
    case 'CallExpression': return `${stmtToString(stmt.callee)}(...)`;
    case 'ExpressionStatement': return stmtToString(stmt.expression);
    default: return stmt.type;
  }
}

export function CFGViewer({ cfg }: CFGViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  // Layered DAG layout (simplified Sugiyama)
  const { blocks, edges, totalWidth, totalHeight } = useMemo(() => {
    if (!cfg || cfg.length === 0) return { blocks: [], edges: [], totalWidth: 0, totalHeight: 0 };

    // Step 1: Assign layers via BFS from entries
    const layers = new Map<string, number>();
    const entries = cfg.filter(n => n.isEntry);
    if (entries.length === 0 && cfg.length > 0) entries.push(cfg[0]);
    
    const queue: { n: CFGNode; d: number }[] = entries.map(n => ({ n, d: 0 }));
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { n, d } = queue.shift()!;
      const key = n.id.toString();
      if (visited.has(key)) continue;
      visited.add(key);
      layers.set(key, Math.max(d, layers.get(key) || 0));

      for (const succ of n.successors) {
        const succNode = cfg.find(x => x.id === succ);
        if (succNode && !visited.has(succNode.id.toString())) {
          queue.push({ n: succNode, d: d + 1 });
        }
      }
    }

    // Unreachable nodes at the bottom
    let maxLayer = Math.max(0, ...Array.from(layers.values()));
    for (const n of cfg) {
      if (!layers.has(n.id.toString())) {
        layers.set(n.id.toString(), maxLayer + 1);
      }
    }

    // Step 2: Group by layer
    const byLayer: CFGNode[][] = [];
    for (const [id, l] of layers.entries()) {
      if (!byLayer[l]) byLayer[l] = [];
      const node = cfg.find(n => n.id.toString() === id);
      if (node) byLayer[l].push(node);
    }

    // Step 3: Sort within each layer by ID to minimize crossings
    byLayer.forEach(layer => layer.sort((a, b) => a.id - b.id));

    // Step 4: Position blocks
    const blocksArr: LayoutBlock[] = [];
    let maxW = 0;

    byLayer.forEach((layerNodes, lIdx) => {
      const layerW = layerNodes.length * BLOCK_W + (layerNodes.length - 1) * 40;
      const startX = Math.max(40, (800 / 2) - (layerW / 2));
      let currentX = startX;

      layerNodes.forEach(n => {
        const stmts = n.statements.map(s => stmtToString(s));
        const preview = stmts.slice(0, 2).map(s => s.length > 30 ? s.slice(0, 28) + '…' : s);

        blocksArr.push({
          id: n.id.toString(),
          x: currentX,
          y: lIdx * LAYER_GAP_Y + 40,
          label: `Block ${n.id}`,
          stmtCount: n.statements.length,
          stmtPreview: preview,
          isReachable: n.isReachable || false,
          isEntry: n.isEntry || false,
          isExit: n.isExit || false,
        });
        currentX += BLOCK_W + 40;
      });
      maxW = Math.max(maxW, currentX);
    });

    // Step 5: Build edges with type classification
    const edgesArr: LayoutEdge[] = [];
    for (const n of cfg) {
      const from = blocksArr.find(b => b.id === n.id.toString());
      if (!from) continue;

      const hasCondition = n.statements.some(s =>
        s.type === 'BinaryExpression' &&
        ['<', '>', '<=', '>=', '==', '!=', '&&', '||'].includes(s.operator)
      );

      n.successors.forEach((succ, idx) => {
        const to = blocksArr.find(b => b.id === succ.toString());
        if (!to) return;

        const isBackEdge = to.y <= from.y;
        let edgeType: LayoutEdge['edgeType'] = 'unconditional';

        if (isBackEdge) {
          edgeType = 'back';
        } else if (hasCondition && n.successors.length === 2) {
          edgeType = idx === 0 ? 'true' : 'false';
        }

        edgesArr.push({
          id: `${n.id}->${succ}`,
          x1: from.x + BLOCK_W / 2,
          y1: from.y + BLOCK_H,
          x2: to.x + BLOCK_W / 2,
          y2: to.y,
          edgeType,
        });
      });
    }

    return {
      blocks: blocksArr,
      edges: edgesArr,
      totalWidth: Math.max(maxW + 40, 800),
      totalHeight: byLayer.length * LAYER_GAP_Y + 120,
    };
  }, [cfg]);

  // Apply transform
  const applyTransform = useCallback(() => {
    if (gRef.current) {
      gRef.current.setAttribute(
        'transform',
        `translate(${panRef.current.x},${panRef.current.y}) scale(${zoomRef.current})`
      );
    }
  }, []);

  // Mouse wheel → zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const newZoom = Math.max(0.1, Math.min(5, zoomRef.current + delta));

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const scale = newZoom / zoomRef.current;
      panRef.current.x = mx - scale * (mx - panRef.current.x);
      panRef.current.y = my - scale * (my - panRef.current.y);
    }

    zoomRef.current = newZoom;
    setZoomDisplay(Math.round(newZoom * 100));
    applyTransform();
  }, [applyTransform]);

  // Mouse drag → pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    panRef.current.x = e.clientX - dragStart.current.x;
    panRef.current.y = e.clientY - dragStart.current.y;
    applyTransform();
  }, [applyTransform]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (svgRef.current) svgRef.current.style.cursor = 'grab';
  }, []);

  // Fit to screen
  const fitToScreen = useCallback(() => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = rect.width / (totalWidth + 40);
    const scaleY = rect.height / (totalHeight + 40);
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    zoomRef.current = newZoom;
    panRef.current.x = (rect.width - totalWidth * newZoom) / 2;
    panRef.current.y = 20;
    setZoomDisplay(Math.round(newZoom * 100));
    applyTransform();
  }, [totalWidth, totalHeight, applyTransform]);

  const handleDoubleClick = useCallback(() => { fitToScreen(); }, [fitToScreen]);

  const handleZoomIn = useCallback(() => {
    zoomRef.current = Math.min(5, zoomRef.current + 0.2);
    setZoomDisplay(Math.round(zoomRef.current * 100));
    applyTransform();
  }, [applyTransform]);

  const handleZoomOut = useCallback(() => {
    zoomRef.current = Math.max(0.1, zoomRef.current - 0.2);
    setZoomDisplay(Math.round(zoomRef.current * 100));
    applyTransform();
  }, [applyTransform]);

  // Auto fit on first render
  useEffect(() => {
    if (cfg && cfg.length > 0 && svgRef.current) {
      const timer = setTimeout(fitToScreen, 50);
      return () => clearTimeout(timer);
    }
  }, [cfg, fitToScreen]);

  // Edge color/style helpers
  function getEdgeColor(type: LayoutEdge['edgeType']): string {
    switch (type) {
      case 'true': return '#10b981';
      case 'false': return '#ef4444';
      case 'back': return '#f59e0b';
      default: return '#475569';
    }
  }

  function getEdgeLabel(type: LayoutEdge['edgeType']): string | null {
    switch (type) {
      case 'true': return 'T';
      case 'false': return 'F';
      default: return null;
    }
  }

  // Is this edge connected to the hovered block?
  function isEdgeHighlighted(edge: LayoutEdge): boolean {
    if (!hoveredBlock) return false;
    return edge.id.startsWith(hoveredBlock + '->') || edge.id.endsWith('->' + hoveredBlock);
  }

  if (!cfg || cfg.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg className="w-12 h-12 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <p className="text-sm">Type code to see the CFG</p>
      </div>
    );
  }

  // Selected block details panel
  const selectedBlockData = selectedBlock ? blocks.find(b => b.id === selectedBlock) : null;
  const selectedCfgNode = selectedBlock ? cfg.find(n => n.id.toString() === selectedBlock) : null;

  return (
    <div className="h-full flex flex-col bg-[#0a0e1a] overflow-hidden">
      {/* Controls Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#111827] border-b border-white/5 shrink-0 z-10">
        <span className="text-[#00d4ff] font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          CFG
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-black/30 rounded-lg border border-white/10 p-0.5">
          <button onClick={handleZoomOut} className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors">−</button>
          <span className="text-xs text-gray-400 font-mono w-10 text-center">{zoomDisplay}%</span>
          <button onClick={handleZoomIn} className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors">+</button>
        </div>
        <button onClick={fitToScreen} className="px-2 py-1 text-xs text-gray-300 hover:text-[#00d4ff] hover:bg-white/5 rounded border border-white/10 transition-colors">Fit</button>
        <span className="text-xs text-gray-500 font-mono bg-black/20 px-2 py-1 rounded">{blocks.length} blocks</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SVG Canvas */}
        <div className="flex-1 overflow-hidden">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="cursor-grab"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            <defs>
              <marker id="cfg-arrow-gray" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#475569" />
              </marker>
              <marker id="cfg-arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
              </marker>
              <marker id="cfg-arrow-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
              <marker id="cfg-arrow-amber" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
              </marker>
            </defs>

            <g ref={gRef}>
              {/* Edges */}
              {edges.map(e => {
                const color = getEdgeColor(e.edgeType);
                const label = getEdgeLabel(e.edgeType);
                const highlighted = isEdgeHighlighted(e);
                const markerId = e.edgeType === 'true' ? 'cfg-arrow-green'
                  : e.edgeType === 'false' ? 'cfg-arrow-red'
                  : e.edgeType === 'back' ? 'cfg-arrow-amber'
                  : 'cfg-arrow-gray';

                if (e.edgeType === 'back') {
                  // Curved back edge on the left side
                  const midX = Math.min(e.x1, e.x2) - 80;
                  return (
                    <g key={e.id}>
                      <path
                        d={`M ${e.x1} ${e.y1} C ${midX} ${e.y1}, ${midX} ${e.y2}, ${e.x2} ${e.y2}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={highlighted ? 2.5 : 1.5}
                        strokeDasharray="6,4"
                        opacity={highlighted ? 1 : 0.6}
                        markerEnd={`url(#${markerId})`}
                      />
                    </g>
                  );
                }

                const midY = (e.y1 + e.y2) / 2;
                return (
                  <g key={e.id}>
                    <path
                      d={`M ${e.x1} ${e.y1} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={highlighted ? 2.5 : 1.5}
                      opacity={highlighted ? 1 : 0.6}
                      markerEnd={`url(#${markerId})`}
                    />
                    {label && (
                      <text
                        x={(e.x1 + e.x2) / 2 + (e.edgeType === 'true' ? -12 : 6)}
                        y={midY - 4}
                        fill={color}
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Blocks */}
              {blocks.map(b => {
                const isHovered = hoveredBlock === b.id;
                const isSelected = selectedBlock === b.id;
                const borderColor = !b.isReachable ? '#ef4444' : isHovered || isSelected ? '#00d4ff' : '#334155';
                const bgColor = !b.isReachable ? '#1a0a0a' : '#0a1628';
                const opacity = !b.isReachable ? 0.5 : 1;

                return (
                  <g
                    key={b.id}
                    transform={`translate(${b.x}, ${b.y})`}
                    style={{ cursor: 'pointer', opacity }}
                    onMouseEnter={() => setHoveredBlock(b.id)}
                    onMouseLeave={() => setHoveredBlock(null)}
                    onClick={(e) => { e.stopPropagation(); setSelectedBlock(prev => prev === b.id ? null : b.id); }}
                  >
                    {/* Entry/Exit left strip */}
                    {b.isEntry && <rect x="0" y="0" width="4" height={BLOCK_H} rx="2" fill="#10b981" />}
                    {b.isExit && <rect x="0" y="0" width="4" height={BLOCK_H} rx="2" fill="#3b82f6" />}

                    {/* Block body */}
                    <rect
                      x="0"
                      y="0"
                      width={BLOCK_W}
                      height={BLOCK_H}
                      rx="8"
                      fill={bgColor}
                      stroke={borderColor}
                      strokeWidth={isHovered || isSelected ? 2 : 1.5}
                      strokeDasharray={!b.isReachable ? '5,3' : 'none'}
                    />

                    {/* Header */}
                    <text x="12" y="18" fill="#e2e8f0" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      {b.label}
                    </text>

                    {/* Reachability badge */}
                    <text x={BLOCK_W - 10} y="18" fill={b.isReachable ? '#4ade80' : '#ef4444'} fontSize="8" fontFamily="monospace" textAnchor="end">
                      {b.isReachable ? '●' : '○'}
                    </text>

                    {/* Statement previews */}
                    {b.stmtPreview.map((stmt, i) => (
                      <text key={i} x="12" y={34 + i * 14} fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="monospace">
                        {stmt}
                      </text>
                    ))}

                    {/* Statement count if more than preview */}
                    {b.stmtCount > 2 && (
                      <text x={BLOCK_W - 10} y={BLOCK_H - 8} fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace" textAnchor="end">
                        +{b.stmtCount - 2} more
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Side Panel — selected block details */}
        {selectedBlockData && selectedCfgNode && (
          <div className="w-56 bg-[#111827] border-l border-white/10 p-3 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[#00d4ff] font-semibold text-sm">{selectedBlockData.label}</h4>
              <button onClick={() => setSelectedBlock(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
            </div>
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Reachable</span>
                <span className={selectedBlockData.isReachable ? 'text-green-400' : 'text-red-400'}>
                  {selectedBlockData.isReachable ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Statements</span>
                <span className="text-white">{selectedBlockData.stmtCount}</span>
              </div>
              {selectedBlockData.isEntry && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">Entry</span>}
              {selectedBlockData.isExit && <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">Exit</span>}
            </div>
            <h5 className="text-xs text-gray-400 font-semibold mb-1">All Statements:</h5>
            <div className="space-y-1">
              {selectedCfgNode.statements.map((stmt, i) => (
                <div key={i} className="text-xs text-gray-300 bg-black/30 px-2 py-1 rounded font-mono break-all">
                  {stmtToString(stmt)}
                </div>
              ))}
              {selectedCfgNode.statements.length === 0 && (
                <p className="text-xs text-gray-600 italic">No statements</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
