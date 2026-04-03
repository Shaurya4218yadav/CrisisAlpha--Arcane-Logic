'use client';

// ============================================================
// CrisisAlpha — Simulation Map Component
// MapLibre GL JS based interactive world map
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useScenarioStore } from '@/state/scenarioStore';
import { getRiskColor, NODE_TYPE_SIZE } from '@/lib/map/colorScale';
import { GraphNode, GraphEdge } from '@/types';

export default function SimulationMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const { nodes, edges, phase, selectedNodeId, setSelectedNodeId } =
    useScenarioStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'CrisisAlpha Dark',
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [65, 25],
      zoom: 2.5,
      minZoom: 1.5,
      maxZoom: 8,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update routes (edges)
  const updateEdges = useCallback(
    (map: maplibregl.Map, edges: GraphEdge[], nodes: GraphNode[]) => {
      // Remove existing edge layers/sources
      const existingLayers = map.getStyle().layers || [];
      existingLayers.forEach((layer) => {
        if (layer.id.startsWith('edge-')) {
          map.removeLayer(layer.id);
        }
      });
      edges.forEach((edge) => {
        const sourceId = `edge-source-${edge.id}`;
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      });

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      edges.forEach((edge) => {
        const sourceNode = nodeMap.get(edge.sourceNodeId);
        const targetNode = nodeMap.get(edge.targetNodeId);
        if (!sourceNode || !targetNode) return;

        const sourceId = `edge-source-${edge.id}`;
        const layerId = `edge-${edge.id}`;

        const coordinates = [
          [sourceNode.lng, sourceNode.lat],
          [targetNode.lng, targetNode.lat],
        ];

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        const color = getRiskColor(edge.riskScore);
        const opacity = edge.status === 'broken' ? 0.3 : 0.7;
        const width = edge.status === 'broken' ? 1 : 2.5;

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': color,
            'line-width': width,
            'line-opacity': opacity,
            'line-dasharray':
              edge.transportType === 'air'
                ? [2, 4]
                : edge.transportType === 'rail'
                ? [4, 3]
                : edge.transportType === 'road'
                ? [6, 3]
                : [],
          },
        });
      });
    },
    []
  );

  // Update markers (nodes)
  const updateNodes = useCallback(
    (map: maplibregl.Map, nodes: GraphNode[]) => {
      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      nodes.forEach((node) => {
        const size = NODE_TYPE_SIZE[node.type] || 8;
        const color = getRiskColor(node.riskScore);
        const isSelected = node.id === selectedNodeId;
        const isOrigin =
          node.id === useScenarioStore.getState().config.originNodeId;

        const el = document.createElement('div');
        el.className = 'crisis-node';
        el.style.cssText = `
          width: ${size * 2 + (isSelected ? 6 : 0)}px;
          height: ${size * 2 + (isSelected ? 6 : 0)}px;
          background: ${color};
          border-radius: 50%;
          border: ${isSelected ? '3px solid #fff' : isOrigin ? '2px solid #ff0' : '2px solid rgba(255,255,255,0.3)'};
          cursor: pointer;
          box-shadow: 0 0 ${node.riskScore > 0.5 ? 15 : 8}px ${color}88;
          transition: all 0.5s ease;
          position: relative;
        `;

        // Pulse animation for high-risk nodes
        if (node.riskScore >= 0.6) {
          const pulse = document.createElement('div');
          pulse.style.cssText = `
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            border-radius: 50%;
            border: 2px solid ${color};
            animation: pulse 2s ease-out infinite;
            opacity: 0;
          `;
          el.appendChild(pulse);
        }

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedNodeId(node.id);
        });

        // Tooltip
        const popup = new maplibregl.Popup({
          offset: 15,
          closeButton: false,
          closeOnClick: false,
          className: 'crisis-popup',
        }).setHTML(`
          <div style="
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 12px 16px;
            color: #e2e8f0;
            font-family: 'Inter', sans-serif;
            min-width: 180px;
          ">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #f8fafc;">
              ${node.type === 'port' ? '⚓' : node.type === 'hub' ? '🔗' : '🏙️'} ${node.name}
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">${node.country} · ${node.region}</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span>Risk</span>
              <span style="color: ${color}; font-weight: 600;">${(node.riskScore * 100).toFixed(0)}%</span>
            </div>
            <div style="
              height: 4px;
              background: rgba(255,255,255,0.1);
              border-radius: 2px;
              margin: 4px 0 6px;
              overflow: hidden;
            ">
              <div style="
                height: 100%;
                width: ${node.riskScore * 100}%;
                background: ${color};
                border-radius: 2px;
                transition: width 0.5s ease;
              "></div>
            </div>
            <div style="font-size: 11px; display: flex; justify-content: space-between; color: #94a3b8;">
              <span>Status: <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">${node.status}</span></span>
            </div>
          </div>
        `);

        el.addEventListener('mouseenter', () => {
          popup.setLngLat([node.lng, node.lat]).addTo(map);
        });
        el.addEventListener('mouseleave', () => {
          popup.remove();
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([node.lng, node.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    },
    [selectedNodeId, setSelectedNodeId]
  );

  // React to graph data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || nodes.length === 0) return;

    const onLoad = () => {
      updateEdges(map, edges, nodes);
      updateNodes(map, nodes);
    };

    if (map.loaded()) {
      onLoad();
    } else {
      map.on('load', onLoad);
    }
  }, [nodes, edges, updateEdges, updateNodes]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden" />

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 text-xs">
        <div className="text-slate-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">Risk Level</div>
        <div className="space-y-1.5">
          {[
            { label: 'Safe', color: '#10b981', range: '0-30%' },
            { label: 'Stressed', color: '#f59e0b', range: '30-60%' },
            { label: 'Risky', color: '#f97316', range: '60-80%' },
            { label: 'Broken', color: '#ef4444', range: '80-100%' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: item.color,
                  boxShadow: `0 0 6px ${item.color}66`,
                }}
              />
              <span className="text-slate-300">{item.label}</span>
              <span className="text-slate-500 ml-auto">{item.range}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 mt-2 pt-2">
          <div className="text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">Transport</div>
          <div className="space-y-1">
            {[
              { label: 'Sea', style: 'solid' },
              { label: 'Road', style: 'dashed' },
              { label: 'Rail', style: 'dotted' },
              { label: 'Air', style: 'dotted' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-5 h-0"
                  style={{
                    borderTop: `2px ${item.style} #64748b`,
                  }}
                />
                <span className="text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected node info */}
      {selectedNodeId && phase === 'setup' && (
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-3 text-sm">
          <div className="text-cyan-400 font-semibold text-xs uppercase tracking-wider mb-1">Crisis Origin</div>
          <div className="text-white font-bold">
            {nodes.find((n) => n.id === selectedNodeId)?.name || selectedNodeId}
          </div>
          <div className="text-slate-400 text-xs mt-0.5">
            Click another node to change
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 12px !important;
        }
        .maplibregl-popup-tip {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
