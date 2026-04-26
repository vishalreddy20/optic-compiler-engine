import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { ASTNode, OptimizationSuggestion } from '../engine/types';
import { 
  buildTreeLayout, 
  getNodeColors, 
  NODE_W, 
  NODE_H 
} from './ASTViewer';

interface ASTCompareViewProps {
  beforeAST: ASTNode | null;
  afterAST: ASTNode | null;
  suggestions: OptimizationSuggestion[];
}

type NodeStatus = 'unchanged' | 'changed' | 'added' | 'removed';

export function ASTCompareView({ beforeAST, afterAST, suggestions }: ASTCompareViewProps) {
  const leftSvgRef = useRef<SVGSVGElement>(null);
  const rightSvgRef = useRef<SVGSVGElement>(null);
  const leftGRef = useRef<SVGGElement>(null);
  const rightGRef = useRef<SVGGElement>(null);
  
  const sharedZoom = useRef(1);
  const sharedPanX = useRef(0);
  const sharedPanY = useRef(0);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [zoomDisplay, setZoomDisplay] = useState(100);
  
  const [leftCollapsed, setLeftCollapsed] = useState<Set<number>>(new Set());
  const [rightCollapsed, setRightCollapsed] = useState<Set<number>>(new Set());

  // Diffing logic
  const diffMap = useMemo(() => {
    const map = new Map<ASTNode, NodeStatus>();
    if (!beforeAST || !afterAST) return map;

    // Helper to get child properties dynamically
    function getProps(n: any): Record<string, any> {
      const p: Record<string, any> = {};
      for (const k of Object.keys(n)) {
        if (k !== 'line' && k !== 'column' && k !== 'raw' && typeof n[k] === 'object') {
          p[k] = n[k];
        }
      }
      return p;
    }

    // Zip traversal
    function walk(b: any, a: any) {
      if (!b && !a) return;
      
      if (b && !a) {
        map.set(b, 'removed');
        walkChildren(b, 'removed');
        return;
      }
      if (!b && a) {
        map.set(a, 'added');
        walkChildren(a, 'added');
        return;
      }
      
      if (b.type !== a.type) {
        map.set(b, 'removed');
        walkChildren(b, 'removed');
        map.set(a, 'added');
        walkChildren(a, 'added');
        return;
      }

      // Check values
      let isChanged = false;
      if (b.value !== a.value || b.name !== a.name || b.operator !== a.operator) {
        isChanged = true;
      }

      if (isChanged) {
        map.set(b, 'changed');
        map.set(a, 'changed');
        (b as any)._oldValue = b.value || b.name || b.operator;
        (a as any)._oldValue = b.value || b.name || b.operator;
      } else {
        map.set(b, 'unchanged');
        map.set(a, 'unchanged');
      }

      // Arrays and objects
      const bProps = getProps(b);
      const aProps = getProps(a);
      
      const allKeys = new Set([...Object.keys(bProps), ...Object.keys(aProps)]);
      for (const k of allKeys) {
        const bVal = bProps[k];
        const aVal = aProps[k];
        
        if (Array.isArray(bVal) || Array.isArray(aVal)) {
          const bArr = Array.isArray(bVal) ? bVal : [];
          const aArr = Array.isArray(aVal) ? aVal : [];
          const maxLen = Math.max(bArr.length, aArr.length);
          for (let i = 0; i < maxLen; i++) {
            walk(bArr[i], aArr[i]);
          }
        } else if (bVal && bVal.type) {
          // Object
          walk(bVal, aVal);
        } else if (aVal && aVal.type) {
          walk(null, aVal);
        }
      }
    }
    
    function walkChildren(n: any, status: NodeStatus) {
      if (!n || typeof n !== 'object') return;
      if (n.type) map.set(n, status);
      for (const k of Object.keys(n)) {
        if (k !== 'line' && k !== 'column' && k !== 'raw' && typeof n[k] === 'object') {
          if (Array.isArray(n[k])) {
            for (const item of n[k]) walkChildren(item, status);
          } else {
            walkChildren(n[k], status);
          }
        }
      }
    }

    walk(beforeAST, afterAST);
    return map;
  }, [beforeAST, afterAST]);

  const leftLayout = useMemo(() => buildTreeLayout(beforeAST, leftCollapsed), [beforeAST, leftCollapsed]);
  const rightLayout = useMemo(() => buildTreeLayout(afterAST, rightCollapsed), [afterAST, rightCollapsed]);

  const applyTransform = useCallback(() => {
    const t = `translate(${sharedPanX.current},${sharedPanY.current}) scale(${sharedZoom.current})`;
    if (leftGRef.current) leftGRef.current.setAttribute('transform', t);
    if (rightGRef.current) rightGRef.current.setAttribute('transform', t);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const newZoom = Math.max(0.1, Math.min(5, sharedZoom.current + delta));
    
    if (leftSvgRef.current) {
      const rect = leftSvgRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const scale = newZoom / sharedZoom.current;
      sharedPanX.current = mx - scale * (mx - sharedPanX.current);
      sharedPanY.current = my - scale * (my - sharedPanY.current);
    }
    
    sharedZoom.current = newZoom;
    setZoomDisplay(Math.round(newZoom * 100));
    applyTransform();
  }, [applyTransform]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - sharedPanX.current, y: e.clientY - sharedPanY.current };
    if (leftSvgRef.current) leftSvgRef.current.style.cursor = 'grabbing';
    if (rightSvgRef.current) rightSvgRef.current.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    sharedPanX.current = e.clientX - dragStart.current.x;
    sharedPanY.current = e.clientY - dragStart.current.y;
    applyTransform();
  }, [applyTransform]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (leftSvgRef.current) leftSvgRef.current.style.cursor = 'grab';
    if (rightSvgRef.current) rightSvgRef.current.style.cursor = 'grab';
  }, []);

  const fitToScreen = useCallback(() => {
    if (!leftSvgRef.current) return;
    const rect = leftSvgRef.current.getBoundingClientRect();
    // Use the max width of both
    const totalW = Math.max(leftLayout.totalWidth, rightLayout.totalWidth);
    const totalH = Math.max(leftLayout.totalHeight, rightLayout.totalHeight);
    
    const scaleX = rect.width / (totalW + 40);
    const scaleY = rect.height / (totalH + 40);
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    
    sharedZoom.current = newZoom;
    sharedPanX.current = (rect.width - totalW * newZoom) / 2;
    sharedPanY.current = 20;
    setZoomDisplay(Math.round(newZoom * 100));
    applyTransform();
  }, [leftLayout, rightLayout, applyTransform]);

  useEffect(() => {
    if ((beforeAST || afterAST) && leftSvgRef.current) {
      const timer = setTimeout(fitToScreen, 50);
      return () => clearTimeout(timer);
    }
  }, [beforeAST, afterAST, fitToScreen]);

  const toggleLeftNode = useCallback((nodeId: number) => {
    setLeftCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) { next.delete(nodeId); next.add(-nodeId); }
      else { next.delete(-nodeId); next.add(nodeId); }
      return next;
    });
  }, []);

  const toggleRightNode = useCallback((nodeId: number) => {
    setRightCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) { next.delete(nodeId); next.add(-nodeId); }
      else { next.delete(-nodeId); next.add(nodeId); }
      return next;
    });
  }, []);

  // Summary counts
  let removedC = 0, addedC = 0, changedC = 0, unchangedC = 0;
  for (const [, status] of diffMap.entries()) {
    // Only count from one AST or the other appropriately to avoid double counting changed
    if (status === 'removed') removedC++;
    if (status === 'added') addedC++;
    if (status === 'changed') changedC++; // Note: map has both before and after nodes as changed, but we divide by 2 later
    if (status === 'unchanged') unchangedC++;
  }
  changedC = changedC / 2;
  unchangedC = unchangedC / 2;

  if (!beforeAST && !afterAST) {
    return <div className="p-4 text-gray-500 text-center">Nothing to compare</div>;
  }

  function renderTree(layout: any, gRef: React.RefObject<SVGGElement>, toggleNode: (id: number) => void, isLeft: boolean) {
    return (
      <g ref={gRef}>
        {layout.layoutEdges.map((e: any) => {
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

        {layout.layoutNodes.map((n: any) => {
          const { fill, stroke } = getNodeColors(n.nodeType);
          const status = diffMap.get(n.astNode) || 'unchanged';
          
          let displayStroke = stroke;
          let extraProps: any = {};
          let badge = null;
          
          if (status === 'changed') {
            displayStroke = '#f59e0b'; // amber
            extraProps.filter = 'drop-shadow(0 0 4px rgba(245,158,11,0.5))';
          } else if (status === 'added') {
            displayStroke = '#10b981'; // green
            extraProps.fill = '#064e3b';
            badge = <text x={NODE_W+10} y={15} fill="#10b981" fontSize="10" fontWeight="bold">NEW</text>;
          } else if (status === 'removed') {
            displayStroke = '#ef4444'; // red
            extraProps.opacity = 0.5;
            badge = <text x={NODE_W+10} y={15} fill="#ef4444" fontSize="10" fontWeight="bold">DEL</text>;
          }

          const label = n.label;
          let subLabel = n.subLabel;
          
          if (status === 'changed' && !isLeft && n.astNode._oldValue !== undefined) {
             subLabel = `${n.astNode._oldValue} → ${subLabel}`;
          }

          return (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`} {...extraProps}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx="6"
                fill={extraProps.fill || fill}
                stroke={displayStroke}
                strokeWidth={status !== 'unchanged' ? "2.5" : "1.5"}
                strokeDasharray={n.collapsed ? '4,3' : 'none'}
                className="transition-opacity"
                style={{ cursor: n.childCount > 0 ? 'pointer' : 'default' }}
                onClick={(e) => { e.stopPropagation(); if (n.childCount > 0) toggleNode(n.id); }}
              />
              <text
                x={NODE_W / 2}
                y={subLabel ? 14 : 22}
                fill="#e2e8f0"
                fontSize="9"
                fontFamily="'JetBrains Mono', monospace"
                textAnchor="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', textDecoration: status === 'removed' ? 'line-through' : 'none' }}
              >
                {label}
              </text>
              {subLabel && (
                <text
                  x={NODE_W / 2}
                  y={27}
                  fill={displayStroke}
                  fontSize="9"
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none', userSelect: 'none', textDecoration: status === 'removed' ? 'line-through' : 'none' }}
                >
                  {subLabel}
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
              {badge}
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0e1a] overflow-hidden">
      {/* Header and Summary Bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#111827] border-b border-white/5 shrink-0 z-10">
        <div className="flex gap-2 text-xs font-mono">
          <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30">🔴 {removedC} removed</span>
          <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30">🟡 {changedC} changed</span>
          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">🟢 {addedC} added</span>
          <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded border border-gray-500/30">⚪ {unchangedC} unchanged</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-gray-400 font-mono text-center px-2">{zoomDisplay}%</span>
        <button onClick={fitToScreen} className="px-2 py-1 text-xs text-gray-300 hover:text-[#00d4ff] hover:bg-white/5 rounded border border-white/10 transition-colors">Fit to Screen</button>
      </div>

      {suggestions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-[#111827]/90 px-6 py-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-sm">
             <span className="text-gray-300">No optimizations detected — ASTs are identical</span>
          </div>
        </div>
      )}

      {/* Split view */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col border-r border-white/10 relative">
          <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded backdrop-blur-sm shadow-lg pointer-events-none">
            BEFORE (Original)
          </div>
          <svg
            ref={leftSvgRef}
            width="100%"
            height="100%"
            className="cursor-grab"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {renderTree(leftLayout, leftGRef, toggleLeftNode, true)}
          </svg>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col relative">
          <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded backdrop-blur-sm shadow-lg pointer-events-none">
            AFTER (Optimized)
          </div>
          <svg
            ref={rightSvgRef}
            width="100%"
            height="100%"
            className="cursor-grab"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {renderTree(rightLayout, rightGRef, toggleRightNode, false)}
          </svg>
        </div>
      </div>
    </div>
  );
}
