import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface TopicNode {
  id: string;
  name: string;
  status: string;
  accuracy: number;
  enem_frequency: number;
  errors_count: number;
}

interface TopicEdge {
  from: string;
  to: string;
  type: string;
}

interface Props {
  nodes: TopicNode[];
  edges: TopicEdge[];
  onNodeClick: (node: TopicNode) => void;
  selectedNode: TopicNode | null;
}

export function KnowledgeGraph({
  nodes,
  edges,
  onNodeClick,
  selectedNode
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Setup
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Limpar
    d3.select(svgRef.current).selectAll('*').remove();

    // SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Container for zoom/pan
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Preparar dados
    const nodesData = nodes.map(n => ({
      id: n.id,
      ...n,
      r: 15 + (n.enem_frequency || 1) * 4 // tamanho
    }));

    const linksData = edges.map(e => ({
      source: e.from,
      target: e.to,
      type: e.type
    }));

    // Force simulation
    const simulation = d3.forceSimulation(nodesData as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(linksData)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => d.r + 15));

    // Desenhar links
    const links = g.append('g')
      .selectAll('line')
      .data(linksData)
      .enter()
      .append('line')
      .attr('stroke', '#475569') // slate-600
      .attr('stroke-width', (d: any) => d.type === 'confusion' ? 3 : 1)
      .attr('stroke-dasharray', (d: any) => d.type === 'confusion' ? '5,5' : '0')
      .attr('opacity', 0.6);

    // Desenhar nós
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(nodesData)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Círculos externos (glow/border)
    nodeGroup.append('circle')
      .attr('r', (d: any) => d.r + 3)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => selectedNode?.id === d.id ? '#14b8a6' : 'transparent')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    // Círculos
    const circles = nodeGroup.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => {
        if (d.status === 'mastered') return '#10b981'; // verde
        if (d.status === 'learning') return '#f59e0b'; // amarelo
        return '#ef4444'; // vermelho
      })
      .attr('opacity', (d: any) =>
        selectedNode && d.id !== selectedNode.id ? 0.3 : 1
      )
      .attr('stroke', '#020617')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (e: any, d: any) => {
        onNodeClick(d);
      });

    // Ícones ou indicadores nos nós (ex: erros)
    nodeGroup.filter((d: any) => d.errors_count > 0)
      .append('circle')
      .attr('r', 6)
      .attr('cx', (d: any) => d.r - 2)
      .attr('cy', (d: any) => -d.r + 2)
      .attr('fill', '#ef4444')
      .attr('stroke', '#0f172a');
      
    nodeGroup.filter((d: any) => d.errors_count > 0)
      .append('text')
      .attr('x', (d: any) => d.r - 2)
      .attr('y', (d: any) => -d.r + 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .text((d: any) => d.errors_count);

    // Labels
    const labels = nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => d.r + 15)
      .attr('fill', '#e2e8f0')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
      .text((d: any) => d.name);

    // Update posições
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, selectedNode]);

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
