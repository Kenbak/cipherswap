'use client';

import { useEffect, useRef, useState } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force';

export interface GraphNode {
  id: string;
  label: string;
  count: number;
  color: string;
  kind: 'center' | 'protocol' | 'address' | 'exchange';
  href?: string;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  label: string;
  count: number;
  color: string;
  kind: GraphNode['kind'];
  href?: string;
  r: number;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
}

const HEIGHT = 460;
const CLICK_THRESHOLD_PX = 5;

function radiusFor(count: number, maxCount: number, kind: GraphNode['kind']): number {
  if (kind === 'center') return 34;
  const ratio = Math.sqrt(count / maxCount);
  return 24 + ratio * 28;
}

/** Fit a label inside a circle: shrink font, then truncate if still too wide. */
function fitLabel(label: string, r: number): { text: string; fontSize: number } {
  const available = r * 1.8;
  const CHAR_W = 0.62;
  let fontSize = Math.min(11, available / (label.length * CHAR_W));
  if (fontSize >= 7.5) return { text: label, fontSize };
  fontSize = 7.5;
  const maxChars = Math.max(4, Math.floor(available / (fontSize * CHAR_W)) - 1);
  return { text: label.slice(0, maxChars) + '…', fontSize };
}

export function BubbleGraph({ nodes, legend }: {
  nodes: GraphNode[];
  legend?: { color: string; label: string }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const dragRef = useRef<{
    node: SimNode;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const peripherals = nodes.filter(n => n.kind !== 'center');
    if (peripherals.length === 0) return;
    const maxCount = Math.max(...peripherals.map(n => n.count));

    const sNodes: SimNode[] = nodes.map(n => ({
      ...n,
      r: radiusFor(n.count, maxCount, n.kind),
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: HEIGHT / 2 + (Math.random() - 0.5) * 200,
    }));

    const center = sNodes.find(n => n.kind === 'center');
    const sLinks: SimLink[] = center
      ? sNodes.filter(n => n !== center).map(n => ({ source: center, target: n }))
      : [];

    if (center) {
      center.fx = width / 2;
      center.fy = HEIGHT / 2;
    }

    const sim = forceSimulation<SimNode>(sNodes)
      .force('charge', forceManyBody().strength(-120))
      .force('link', forceLink<SimNode, SimLink>(sLinks).distance(l =>
        60 + (l.source as SimNode).r + (l.target as SimNode).r,
      ).strength(0.4))
      .force('collide', forceCollide<SimNode>(n => n.r + 12).strength(0.9))
      .force('x', forceX(width / 2).strength(0.06))
      .force('y', forceY(HEIGHT / 2).strength(0.08))
      .on('tick', () => {
        for (const n of sNodes) {
          if (n.fx == null) {
            n.x = Math.max(n.r + 4, Math.min(width - n.r - 4, n.x ?? 0));
            n.y = Math.max(n.r + 4, Math.min(HEIGHT - n.r - 4, n.y ?? 0));
          }
        }
        setSimNodes([...sNodes]);
        setSimLinks([...sLinks]);
      });

    simRef.current = sim;
    return () => { sim.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, width]);

  const svgPoint = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (node: SimNode) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = svgPoint(e);
    dragRef.current = {
      node,
      offsetX: (node.x ?? 0) - p.x,
      offsetY: (node.y ?? 0) - p.y,
      startX: p.x,
      startY: p.y,
      moved: false,
    };
    node.fx = node.x;
    node.fy = node.y;
    simRef.current?.alphaTarget(0.25).restart();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = svgPoint(e);
    if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > CLICK_THRESHOLD_PX) {
      drag.moved = true;
    }
    drag.node.fx = p.x + drag.offsetX;
    drag.node.fy = p.y + drag.offsetY;
  };

  const onPointerUp = (node: SimNode) => (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    const drag = dragRef.current;
    if (node.kind !== 'center') {
      node.fx = null;
      node.fy = null;
    }
    simRef.current?.alphaTarget(0);
    if (drag && !drag.moved && node.href) {
      window.open(node.href, '_blank', 'noopener,noreferrer');
    }
    dragRef.current = null;
  };

  if (nodes.filter(n => n.kind !== 'center').length === 0) return null;

  return (
    <div>
      <div ref={containerRef} className="w-full select-none">
        <svg width={width} height={HEIGHT} className="block touch-none">
          {simLinks.map((l, i) => (
            <line
              key={i}
              x1={l.source.x}
              y1={l.source.y}
              x2={l.target.x}
              y2={l.target.y}
              stroke={l.target.color}
              strokeOpacity={0.16}
              strokeWidth={1 + (l.target.r - 24) / 12}
            />
          ))}
          {simNodes.map(n => {
            const isCenter = n.kind === 'center';
            const { text, fontSize } = isCenter
              ? { text: n.label, fontSize: 11 }
              : fitLabel(n.label, n.r);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x ?? 0},${n.y ?? 0})`}
                onPointerDown={onPointerDown(n)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp(n)}
                style={{ cursor: isCenter ? 'default' : n.href ? 'pointer' : 'grab' }}
              >
                <title>
                  {`${n.label}${!isCenter ? ` — ${n.count} interactions${n.href ? ' · click to inspect' : ''}` : ''}`}
                </title>
                <circle
                  r={n.r}
                  fill={isCenter ? 'rgba(255, 255, 255, 0.08)' : `${n.color}14`}
                  stroke={isCenter ? 'rgba(255, 255, 255, 0.75)' : `${n.color}55`}
                  strokeWidth={isCenter ? 1.5 : 1}
                />
                <text
                  textAnchor="middle"
                  dy={isCenter ? 4 : -1}
                  fill={isCenter ? '#FFFFFF' : n.color}
                  fontSize={fontSize}
                  fontFamily="var(--font-mono, monospace)"
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {text}
                </text>
                {!isCenter && (
                  <text
                    textAnchor="middle"
                    dy={fontSize + 3}
                    fill="rgba(255,255,255,0.45)"
                    fontSize={Math.max(8, fontSize - 1.5)}
                    fontFamily="var(--font-mono, monospace)"
                    pointerEvents="none"
                  >
                    {n.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {legend && (
        <div className="flex flex-wrap gap-4 mt-2">
          {legend.map(item => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-cipher-text-muted">
              <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
