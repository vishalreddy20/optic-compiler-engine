import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { ASTNode } from '../engine/types';

interface ASTViewerProps {
  ast: ASTNode | null;
}

interface LayoutNode {
  id: number;
  x: number;
  y: number;
  label: string;
  subLabel: string;
  nodeType: string;
  depth: number;
  childCount: number;
  collapsed: boolean;
}

interface LayoutEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const NODE_W = 100;
const NODE_H = 36;
const GAP_X = 30;
const GAP_Y = 80;
const MAX_VISIBLE = 500;
const DEFAULT_COLLAPSE_DEPTH = 4;

// Color mapping by node type
function getNodeColors(nodeType: string): { fill: string; stroke: string } {
  switch (nodeType) {
    case 'FunctionDeclaration': return { fill: '#1a4a7a', stroke: '#00d4ff' };
    case 'IfStatement': case 'ForStatement': case 'WhileStatement':
      return { fill: '#4a3a0a', stroke: '#f59e0b' };
    case 'ReturnStatement': return { fill: '#4a0a0a', stroke: '#ef4444' };
    case 'BinaryExpression': case 'AssignmentExpression':
      return { fill: '#0a3a1a', stroke: '#10b981' };
    case 'UnaryExpression': case 'UpdateExpression':
      return { fill: '#1a2a3a', stroke: '#6366f1' };
    case 'CallExpression': return { fill: '#3a1a4a', stroke: '#a855f7' };
    case 'Identifier': case 'Literal':
      return { fill: '#1a1a2e', stroke: '#475569' };
    case 'VariableDeclaration': return { fill: '#1a2a2a', stroke: '#14b8a6' };
    case 'BlockStatement': case 'Program':
      return { fill: '#1e1e2e', stroke: '#334155' };
    default: return { fill: '#1a1a1a', stroke: '#334155' };
  }
}

function getChildren(n: ASTNode): ASTNode[] {
  const c: ASTNode[] = [];
  if ('params' in n && Array.isArray(n.params)) {
    // Don't render params as child nodes (they are metadata)
  }
  if ('body' in n) {
    if (Array.isArray(n.body)) c.push(...n.body);
    else if (n.body && typeof n.body === 'object' && 'type' in n.body) c.push(n.body as ASTNode);
  }
  if ('init' in n && n.init && typeof n.init === 'object' && 'type' in n.init) c.push(n.init as ASTNode);
  if ('condition' in n && n.condition) c.push(n.condition as ASTNode);
  if ('update' in n && n.update) c.push(n.update as ASTNode);
  if ('test' in n && n.test) c.push(n.test as ASTNode);
  if ('consequent' in n && n.consequent) c.push(n.consequent as ASTNode);
  if ('alternate' in n && n.alternate) c.push(n.alternate as ASTNode);
  if ('left' in n && n.left) c.push(n.left as ASTNode);
  if ('right' in n && n.right) c.push(n.right as ASTNode);
  if ('argument' in n && n.argument && typeof n.argument === 'object' && 'type' in n.argument) c.push(n.argument as ASTNode);
  if ('arguments' in n && Array.isArray(n.arguments)) c.push(...n.arguments);
  if ('expression' in n && n.expression) c.push(n.expression as ASTNode);
  if ('callee' in n && n.callee) c.push(n.callee as ASTNode);
  return c;
}

function getLabel(node: ASTNode): { label: string; subLabel: string } {
  let label = node.type;
  let subLabel = '';
  if (label.length > 14) label = label.slice(0, 13) + '…';
  if ('name' in node && node.name) subLabel = String(node.name);
  else if ('operator' in node && node.operator) subLabel = String(node.operator);
  else if ('value' in node && node.value !== undefined) subLabel = String(node.value);
  if (subLabel.length > 14) subLabel = subLabel.slice(0, 13) + '…';
  return { label, subLabel };
}

function countChildren(n: ASTNode): number {
  let count = 0;
  const ch = getChildren(n);
  count += ch.length;
  for (const child of ch) count += countChildren(child);
  return count;
}

export function ASTViewer({ ast }: ASTViewerProps) {
  // Zoom/pan state via refs for performance (no re-render on every mouse move)
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Build tree layout
  const { layoutNodes, layoutEdges, totalWidth, totalHeight, totalNodeCount } = useMemo(() => {
    if (!ast) return { layoutNodes: [], layoutEdges: [], totalWidth: 0, totalHeight: 0, totalNodeCount: 0 };

    const nodes: LayoutNode[] = [];
    const edges: LayoutEdge[] = [];
    let nodeId = 0;
    let totalCount = 0;

    // Iterative Reingold-Tilford inspired layout
    function computeLayout(
      astNode: ASTNode,
      depth: number,
      xOffset: number,
      collapsed: Set<number>
    ): { id: number; width: number; x: number } {
      const id = nodeId++;
      totalCount++;
      const children = getChildren(astNode);
      const { label, subLabel } = getLabel(astNode);
      const cc = countChildren(astNode);
      const isCollapsed = collapsed.has(id) || (depth >= DEFAULT_COLLAPSE_DEPTH && !collapsed.has(-id));

      let myX = xOffset;
      const myY = depth * GAP_Y + 40;
      let childrenWidth = 0;
      const childPositions: { id: number; x: number }[] = [];

      if (children.length > 0 && !isCollapsed && totalCount < MAX_VISIBLE) {
        let currentX = xOffset;
        for (const child of children) {
          const result = computeLayout(child, depth + 1, currentX, collapsed);
          childPositions.push({ id: result.id, x: result.x });
          currentX += result.width + GAP_X;
          childrenWidth += result.width + GAP_X;
        }
        childrenWidth -= GAP_X;
        myX = xOffset + childrenWidth / 2 - NODE_W / 2;

        for (const cp of childPositions) {
          edges.push({
            id: `e-${id}-${cp.id}`,
            x1: myX + NODE_W / 2,
            y1: myY + NODE_H,
            x2: cp.x + NODE_W / 2,
            y2: myY + GAP_Y,
          });
        }
      } else {
        childrenWidth = NODE_W;
      }

      nodes.push({
        id,
        x: myX,
        y: myY,
        label,
        subLabel,
        nodeType: astNode.type,
        depth,
        childCount: cc,
        collapsed: isCollapsed && children.length > 0,
      });

      return { id, width: Math.max(NODE_W, childrenWidth), x: myX };
    }

    const { width: totalW } = computeLayout(ast, 0, 40, collapsedNodes);

    return {
      layoutNodes: nodes,
      layoutEdges: edges,
      totalWidth: Math.max(totalW + 120, 800),
      totalHeight: nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) + 120 : 400,
      totalNodeCount: totalCount,
    };
  }, [ast, collapsedNodes]);

  // Apply transform to g element directly
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
    
    // Zoom towards cursor position
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

  // Double-click → fit to screen
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

  const handleDoubleClick = useCallback(() => {
    fitToScreen();
  }, [fitToScreen]);

  // Zoom controls
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

  // Collapse/Expand
  const toggleNode = useCallback((nodeId: number) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        next.add(-nodeId); // Mark as explicitly expanded
      } else {
        next.delete(-nodeId);
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allCollapsed) {
      // Expand all: clear collapsed set and mark all as expanded
      const expanded = new Set<number>();
      for (let i = 0; i < totalNodeCount; i++) expanded.add(-i);
      setCollapsedNodes(expanded);
      setAllCollapsed(false);
    } else {
      // Collapse all to depth 1
      const collapsed = new Set<number>();
      layoutNodes.forEach(n => { if (n.depth >= 1 && n.childCount > 0) collapsed.add(n.id); });
      setCollapsedNodes(collapsed);
      setAllCollapsed(true);
    }
  }, [allCollapsed, totalNodeCount, layoutNodes]);

  // Auto fit on first render
  useEffect(() => {
    if (ast && svgRef.current) {
      const timer = setTimeout(fitToScreen, 50);
      return () => clearTimeout(timer);
    }
  }, [ast, fitToScreen]);

  if (!ast) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg className="w-12 h-12 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" />
        </svg>
        <p className="text-sm">Type code to see the AST</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0e1a] overflow-hidden">
      {/* Controls Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#111827] border-b border-white/5 shrink-0 z-10">
        <span className="text-[#00d4ff] font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" /></svg>
          AST
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-black/30 rounded-lg border border-white/10 p-0.5">
          <button onClick={handleZoomOut} className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="Zoom Out">−</button>
          <span className="text-xs text-gray-400 font-mono w-10 text-center">{zoomDisplay}%</span>
          <button onClick={handleZoomIn} className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors" title="Zoom In">+</button>
        </div>
        <button onClick={fitToScreen} className="px-2 py-1 text-xs text-gray-300 hover:text-[#00d4ff] hover:bg-white/5 rounded border border-white/10 transition-colors">Fit</button>
        <button onClick={toggleAll} className="px-2 py-1 text-xs text-gray-300 hover:text-[#00d4ff] hover:bg-white/5 rounded border border-white/10 transition-colors">
          {allCollapsed ? 'Expand All' : 'Collapse All'}
        </button>
        <span className="text-xs text-gray-500 font-mono bg-black/20 px-2 py-1 rounded">{totalNodeCount} nodes</span>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 overflow-hidden relative">
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
          <g ref={gRef}>
            {/* Edges — bezier curves */}
            {layoutEdges.map(e => {
              const midY = (e.y1 + e.y2) / 2;
              return (
                <path
                  key={e.id}
                  d={`M ${e.x1} ${e.y1} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}`}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              );
            })}

            {/* Nodes */}
            {layoutNodes.map(n => {
              const { fill, stroke } = getNodeColors(n.nodeType);
              return (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx="6"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="1.5"
                    strokeDasharray={n.collapsed ? '4,3' : 'none'}
                    className="transition-opacity"
                    style={{ cursor: n.childCount > 0 ? 'pointer' : 'default' }}
                    onClick={(e) => { e.stopPropagation(); if (n.childCount > 0) toggleNode(n.id); }}
                  />
                  <text
                    x={NODE_W / 2}
                    y={n.subLabel ? 14 : 22}
                    fill="#e2e8f0"
                    fontSize="9"
                    fontFamily="'JetBrains Mono', monospace"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {n.label}
                  </text>
                  {n.subLabel && (
                    <text
                      x={NODE_W / 2}
                      y={27}
                      fill={stroke}
                      fontSize="9"
                      fontFamily="'JetBrains Mono', monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {n.subLabel}
                    </text>
                  )}
                  {n.collapsed && (
                    <text
                      x={NODE_W + 6}
                      y={22}
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="'JetBrains Mono', monospace"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      ▶ {n.childCount}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
