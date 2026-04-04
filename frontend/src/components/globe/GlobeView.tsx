'use client';

// ============================================================
// CrisisAlpha — 3D Globe View (Premium)
// Three.js interactive globe with day/night textures, clouds,
// animated particle arcs, and multi-layer view support
// ============================================================

import { useRef, useMemo, useCallback, useState, useEffect, Suspense, memo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useScenarioStore } from '@/state/scenarioStore';
import { getRiskColor, NODE_TYPE_SIZE } from '@/lib/map/colorScale';
import {
  latLngToVector3,
  createArcCurve,
  createTransportArc,
  getRiskEmissiveIntensity,
  createGraticulePoints,
  TRANSPORT_STYLES,
} from '@/lib/globe/utils';
import { GraphNode, GraphEdge } from '@/types';
import type { ViewLayer } from '@/components/globe/LayerToggle';

const GLOBE_RADIUS = 2;

// ── Globe Earth Mesh (Day + Night + Bump) ────────────────────
function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [colorMap, nightMap, bumpMap] = useLoader(THREE.TextureLoader, [
    '/earth-blue-marble.jpg',
    '/earth-night.jpg',
    '/earth-topology.png',
  ]);

  // Custom shader for day/night blending
  const material = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      map: colorMap,
      bumpMap: bumpMap,
      bumpScale: 0.02,
      emissiveMap: nightMap,
      emissive: new THREE.Color(0xffcc88),
      emissiveIntensity: 0.6,
      specularMap: bumpMap,
      specular: new THREE.Color(0x222222),
      shininess: 15,
    });
  }, [colorMap, nightMap, bumpMap]);

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
    </mesh>
  );
}

// ── Cloud Layer ──────────────────────────────────────────────
function CloudLayer() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudMap = useLoader(THREE.TextureLoader, '/earth-clouds.png');

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[GLOBE_RADIUS * 1.008, 64, 64]} />
      <meshPhongMaterial
        map={cloudMap}
        transparent
        opacity={0.25}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Atmosphere Glow (Outer Halo) ─────────────────────────────
function Atmosphere() {
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      vec3 color = mix(vec3(0.1, 0.5, 1.0), vec3(0.05, 0.8, 0.95), intensity);
      gl_FragColor = vec4(color, intensity * 0.8);
    }
  `;

  return (
    <mesh scale={[1.15, 1.15, 1.15]}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Inner Atmosphere Rim ─────────────────────────────────────
function InnerGlow() {
  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      gl_FragColor = vec4(0.15, 0.65, 0.95, 1.0) * intensity * 0.4;
    }
  `;

  return (
    <mesh scale={[1.01, 1.01, 1.01]}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        blending={THREE.AdditiveBlending}
        side={THREE.FrontSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Graticule (Lat/Lng Grid) ─────────────────────────────────
const Graticule = memo(function Graticule() {
  const lines = useMemo(
    () => createGraticulePoints(GLOBE_RADIUS * 1.002, 30, 30, 48),
    []
  );

  return (
    <group>
      {lines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color="#1a3550"
          lineWidth={0.4}
          transparent
          opacity={0.12}
        />
      ))}
    </group>
  );
});

// ── Single Node Marker ───────────────────────────────────────
const NodeMarker = memo(function NodeMarker({
  node,
  isSelected,
  isOrigin,
  onClick,
  activeLayer,
}: {
  node: GraphNode;
  isSelected: boolean;
  isOrigin: boolean;
  onClick: (id: string) => void;
  activeLayer: ViewLayer;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = useMemo(
    () => latLngToVector3(node.lat, node.lng, GLOBE_RADIUS * 1.012),
    [node.lat, node.lng]
  );

  // Layer-dependent coloring
  const color = useMemo(() => {
    if (activeLayer === 'demand') {
      const demandScore = node.inventoryBuffer;
      if (demandScore > 0.7) return '#10b981';
      if (demandScore > 0.4) return '#f59e0b';
      return '#ef4444';
    }
    if (activeLayer === 'weather') {
      // Mock: use lat to simulate climate zones
      const absLat = Math.abs(node.lat);
      if (absLat > 50) return '#38bdf8'; // Cold
      if (absLat > 25) return '#10b981'; // Temperate
      return '#f97316'; // Tropical/Hot
    }
    if (activeLayer === 'traffic') {
      // Use resilience score as proxy for traffic density
      if (node.resilienceScore > 0.7) return '#a78bfa';
      if (node.resilienceScore > 0.4) return '#6366f1';
      return '#312e81';
    }
    return getRiskColor(node.riskScore);
  }, [node.riskScore, node.inventoryBuffer, node.resilienceScore, node.lat, activeLayer]);

  const baseSize = (NODE_TYPE_SIZE[node.type] || 8) / 200;
  const size = isSelected ? baseSize * 1.8 : hovered ? baseSize * 1.4 : baseSize;
  const emissiveIntensity = getRiskEmissiveIntensity(node.riskScore);

  // Pulse animation for high-risk nodes
  useFrame(({ clock }) => {
    if (meshRef.current && node.riskScore >= 0.6) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 3 + node.lat) * 0.2;
      meshRef.current.scale.setScalar(pulse);
    }
    // Glow pulse
    if (glowRef.current) {
      const glowPulse = 1 + Math.sin(clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.setScalar(glowPulse);
    }
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(node.id);
    },
    [node.id, onClick]
  );

  return (
    <group position={position}>
      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 2.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Selection ring */}
      {(isSelected || isOrigin) && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.8, size * 2.2, 32]} />
          <meshBasicMaterial
            color={isSelected ? '#ffffff' : '#22d3ee'}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Point light for risky nodes */}
      {node.riskScore >= 0.6 && (
        <pointLight color={color} intensity={0.4} distance={0.6} />
      )}

      {/* Tooltip */}
      {hovered && (
        <Html
          distanceFactor={5}
          style={{ pointerEvents: 'none' }}
          center
          position={[0, size * 4, 0]}
        >
          <div
            style={{
              background: 'rgba(8, 15, 30, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '12px 16px',
              color: '#e2e8f0',
              fontFamily: "'Inter', sans-serif",
              minWidth: '180px',
              whiteSpace: 'nowrap',
              fontSize: '12px',
              boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 12px ${color}30`,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: '#f8fafc', fontSize: 13 }}>
              {node.type === 'port' ? '⚓' : node.type === 'hub' ? '🔗' : '🏙️'}{' '}
              {node.name}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
              {node.country} · {node.region}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>Risk</span>
              <span style={{ color, fontWeight: 700 }}>
                {(node.riskScore * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${node.riskScore * 100}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10 }}>
              <span style={{ color: '#64748b' }}>Buffer</span>
              <span style={{ color: '#22d3ee', fontWeight: 600 }}>
                {(node.inventoryBuffer * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 10 }}>
              <span style={{ color: '#64748b' }}>Status</span>
              <span style={{ color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {node.status}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});

// ── All Nodes ────────────────────────────────────────────────
const Nodes = memo(function Nodes({
  nodes,
  selectedNodeId,
  originNodeId,
  onSelect,
  activeLayer,
}: {
  nodes: GraphNode[];
  selectedNodeId: string | null;
  originNodeId: string;
  onSelect: (id: string) => void;
  activeLayer: ViewLayer;
}) {
  return (
    <group>
      {nodes.map((node) => (
        <NodeMarker
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          isOrigin={node.id === originNodeId}
          onClick={onSelect}
          activeLayer={activeLayer}
        />
      ))}
    </group>
  );
});

// ── Animated Particle on Arc ─────────────────────────────────
function ArcParticle({
  points,
  color,
  speed,
  size,
  offset,
}: {
  points: THREE.Vector3[];
  color: string;
  speed: number;
  size: number;
  offset: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || points.length < 2) return;
    const t = ((clock.elapsedTime * speed) + offset) % 1;
    const idx = Math.floor(t * (points.length - 1));
    const nextIdx = Math.min(idx + 1, points.length - 1);
    const localT = (t * (points.length - 1)) % 1;

    const pos = new THREE.Vector3().lerpVectors(points[idx], points[nextIdx], localT);
    meshRef.current.position.copy(pos);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.95} />
    </mesh>
  );
}

// ── Arc Edge (Transport-Aware) ───────────────────────────────
const ArcEdge = memo(function ArcEdge({
  edge,
  sourceNode,
  targetNode,
  activeLayer,
}: {
  edge: GraphEdge;
  sourceNode: GraphNode;
  targetNode: GraphNode;
  activeLayer: ViewLayer;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);

  const style = useMemo(() => TRANSPORT_STYLES[edge.transportType], [edge.transportType]);

  // Transport-type-aware arc curve
  const points = useMemo(() => {
    const start = latLngToVector3(sourceNode.lat, sourceNode.lng, GLOBE_RADIUS * 1.005);
    const end = latLngToVector3(targetNode.lat, targetNode.lng, GLOBE_RADIUS * 1.005);
    return createTransportArc(start, end, GLOBE_RADIUS * 1.005, edge.transportType);
  }, [sourceNode.lat, sourceNode.lng, targetNode.lat, targetNode.lng, edge.transportType]);

  // Midpoint for tooltip
  const midpoint = useMemo(() => {
    if (points.length === 0) return new THREE.Vector3();
    return points[Math.floor(points.length / 2)];
  }, [points]);

  // Color: layer-responsive or transport-based
  const color = useMemo(() => {
    if (activeLayer === 'traffic') return style.baseColor;
    if (activeLayer === 'demand') return '#10b981';
    // In risk mode, blend transport color with risk color
    if (edge.riskScore > 0.7) return '#ef4444';
    if (edge.riskScore > 0.5) return '#f97316';
    return style.baseColor;
  }, [edge.riskScore, activeLayer, style.baseColor]);

  const isBroken = edge.status === 'broken';
  const isRisky = edge.status === 'risky' || edge.riskScore > 0.6;

  // Dynamic opacity and width
  const opacity = isBroken ? 0.08 : isRisky ? style.opacity * 0.7 : style.opacity;
  const lineWidth = isBroken ? 0.2 : hovered ? style.lineWidth * 2 : style.lineWidth;

  // Animated dash offset + flicker for broken routes
  useFrame(({ clock }) => {
    if (!lineRef.current?.material) return;
    const mat = lineRef.current.material;
    mat.dashOffset = -clock.elapsedTime * (style.particleSpeed * 2);

    // Flicker effect for broken routes
    if (isBroken) {
      mat.opacity = 0.05 + Math.sin(clock.elapsedTime * 8) * 0.05;
    }
  });

  return (
    <group>
      {/* Main line */}
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
        dashed={style.dashed}
        dashSize={style.dashSize}
        dashScale={10}
        gapSize={style.gapSize}
      />

      {/* Invisible thicker line for easier hover detection */}
      <Line
        points={points}
        color={color}
        lineWidth={8}
        transparent
        opacity={0}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />

      {/* Animated particles flowing along the arc */}
      {!isBroken && Array.from({ length: style.particleCount }).map((_, i) => (
        <ArcParticle
          key={i}
          points={points}
          color={color}
          speed={style.particleSpeed}
          size={style.particleSize}
          offset={i / style.particleCount}
        />
      ))}

      {/* Extra particles in traffic mode */}
      {!isBroken && activeLayer === 'traffic' && (
        <ArcParticle
          points={points}
          color={color}
          speed={style.particleSpeed * 1.5}
          size={style.particleSize * 0.8}
          offset={0.5}
        />
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html
          position={[midpoint.x, midpoint.y, midpoint.z]}
          distanceFactor={5}
          style={{ pointerEvents: 'none' }}
          center
        >
          <div
            style={{
              background: 'rgba(8, 15, 30, 0.95)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${color}40`,
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#e2e8f0',
              fontFamily: "'Inter', sans-serif",
              minWidth: '160px',
              whiteSpace: 'nowrap',
              fontSize: '11px',
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 10px ${color}20`,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#f8fafc', fontSize: 12 }}>
              {style.icon} {style.label} Route
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: '#64748b' }}>From</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>{sourceNode.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#64748b' }}>To</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>{targetNode.name}</span>
            </div>
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 6,
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 3,
              }}
            >
              <span style={{ color: '#64748b' }}>Risk</span>
              <span style={{ color, fontWeight: 700 }}>
                {(edge.riskScore * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 2,
                overflow: 'hidden',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${edge.riskScore * 100}%`,
                  background: color,
                  borderRadius: 2,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Status</span>
              <span
                style={{
                  color: isBroken ? '#ef4444' : isRisky ? '#f97316' : '#10b981',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: 10,
                  letterSpacing: '0.5px',
                }}
              >
                {edge.status}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});

// ── All Arcs ─────────────────────────────────────────────────
const Arcs = memo(function Arcs({
  edges,
  nodes,
  activeLayer,
}: {
  edges: GraphEdge[];
  nodes: GraphNode[];
  activeLayer: ViewLayer;
}) {
  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  return (
    <group>
      {edges.map((edge) => {
        const source = nodeMap.get(edge.sourceNodeId);
        const target = nodeMap.get(edge.targetNodeId);
        if (!source || !target) return null;
        return (
          <ArcEdge
            key={edge.id}
            edge={edge}
            sourceNode={source}
            targetNode={target}
            activeLayer={activeLayer}
          />
        );
      })}
    </group>
  );
});

// ── Mock Weather Overlay Zones ───────────────────────────────
function WeatherOverlay() {
  const zones = useMemo(() => [
    { lat: 25, lng: -75, radius: 0.25, color: '#ef4444', label: 'Hurricane' },
    { lat: 35, lng: 135, radius: 0.18, color: '#f59e0b', label: 'Typhoon' },
    { lat: -10, lng: 80, radius: 0.2, color: '#38bdf8', label: 'Monsoon' },
    { lat: 50, lng: 10, radius: 0.15, color: '#a78bfa', label: 'Storm' },
  ], []);

  return (
    <group>
      {zones.map((zone, i) => {
        const pos = latLngToVector3(zone.lat, zone.lng, GLOBE_RADIUS * 1.015);
        return (
          <group key={i} position={pos}>
            <mesh>
              <sphereGeometry args={[zone.radius, 24, 24]} />
              <meshBasicMaterial
                color={zone.color}
                transparent
                opacity={0.15}
                depthWrite={false}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[zone.radius * 0.9, zone.radius, 32]} />
              <meshBasicMaterial
                color={zone.color}
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ── Auto-Rotate Controller ───────────────────────────────────
function AutoRotate() {
  const { camera } = useThree();
  const lastInteraction = useRef(0);
  const angleRef = useRef(0);

  useEffect(() => {
    lastInteraction.current = Date.now();
    const handleInteraction = () => {
      lastInteraction.current = Date.now();
    };
    window.addEventListener('pointerdown', handleInteraction);
    window.addEventListener('wheel', handleInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
    };
  }, []);

  useFrame((_, delta) => {
    const idle = Date.now() - lastInteraction.current > 5000;
    if (idle) {
      angleRef.current += delta * 0.04;
      const dist = camera.position.length();
      camera.position.set(
        Math.sin(angleRef.current) * dist,
        camera.position.y,
        Math.cos(angleRef.current) * dist
      );
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

// ── Scene Content ────────────────────────────────────────────
function GlobeScene({ activeLayer }: { activeLayer: ViewLayer }) {
  const { nodes, edges, selectedNodeId, setSelectedNodeId, config } =
    useScenarioStore();

  return (
    <>
      {/* Sun-like directional light */}
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#fff5e6" />
      <directionalLight position={[-5, -2, -5]} intensity={0.08} color="#3060a0" />
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 5]} intensity={0.2} color="#22d3ee" />

      {/* Globe layers */}
      <Suspense fallback={null}>
        <GlobeMesh />
        <CloudLayer />
      </Suspense>
      <InnerGlow />
      <Atmosphere />
      <Graticule />

      {/* Weather overlay (only in weather mode) */}
      {activeLayer === 'weather' && <WeatherOverlay />}

      {/* Data layers */}
      <Nodes
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        originNodeId={config.originNodeId}
        onSelect={setSelectedNodeId}
        activeLayer={activeLayer}
      />
      <Arcs edges={edges} nodes={nodes} activeLayer={activeLayer} />

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        minDistance={2.8}
        maxDistance={8}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
      <AutoRotate />
    </>
  );
}

// ── Main Export ───────────────────────────────────────────────
export default function GlobeView({ activeLayer = 'risk' as ViewLayer }: { activeLayer?: ViewLayer }) {
  const { selectedNodeId, phase, nodes } = useScenarioStore();

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 1.5, 5], fov: 45 }}
        style={{ background: 'radial-gradient(ellipse at center, #0a0f2e 0%, #020617 70%)' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <GlobeScene activeLayer={activeLayer} />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 text-xs">
        <div className="text-slate-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
          {activeLayer === 'risk' && 'Risk Level'}
          {activeLayer === 'weather' && 'Weather Zones'}
          {activeLayer === 'traffic' && 'Traffic Density'}
          {activeLayer === 'demand' && 'Demand Levels'}
        </div>
        <div className="space-y-1.5">
          {activeLayer === 'risk' && [
            { label: 'Safe', color: '#10b981', range: '0-30%' },
            { label: 'Stressed', color: '#f59e0b', range: '30-60%' },
            { label: 'Risky', color: '#f97316', range: '60-80%' },
            { label: 'Critical', color: '#ef4444', range: '80-100%' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: item.color, boxShadow: `0 0 8px ${item.color}66` }}
              />
              <span className="text-slate-300">{item.label}</span>
              <span className="text-slate-500 ml-auto">{item.range}</span>
            </div>
          ))}
          {activeLayer === 'weather' && [
            { label: 'Hurricane', color: '#ef4444' },
            { label: 'Typhoon', color: '#f59e0b' },
            { label: 'Monsoon', color: '#38bdf8' },
            { label: 'Storm', color: '#a78bfa' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: item.color, boxShadow: `0 0 8px ${item.color}66` }}
              />
              <span className="text-slate-300">{item.label}</span>
            </div>
          ))}
          {activeLayer === 'traffic' && [
            { label: 'High density', color: '#a78bfa' },
            { label: 'Medium', color: '#6366f1' },
            { label: 'Low', color: '#312e81' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: item.color, boxShadow: `0 0 8px ${item.color}66` }}
              />
              <span className="text-slate-300">{item.label}</span>
            </div>
          ))}
          {activeLayer === 'demand' && [
            { label: 'High demand', color: '#10b981' },
            { label: 'Moderate', color: '#f59e0b' },
            { label: 'Low/Critical', color: '#ef4444' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: item.color, boxShadow: `0 0 8px ${item.color}66` }}
              />
              <span className="text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
        {/* Transport Routes Legend */}
        <div className="border-t border-white/10 mt-2 pt-2">
          <div className="text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
            Transport Routes
          </div>
          <div className="space-y-1">
            {([
              { icon: '✈️', label: 'Air', color: '#38bdf8', style: 'dashed' },
              { icon: '🚢', label: 'Sea', color: '#06b6d4', style: 'solid' },
              { icon: '🚛', label: 'Road', color: '#a78bfa', style: 'dashed' },
              { icon: '🚂', label: 'Rail', color: '#f59e0b', style: 'dotted' },
            ] as const).map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xs">{item.icon}</span>
                <div
                  className="w-5 h-0"
                  style={{ borderTop: `2px ${item.style} ${item.color}` }}
                />
                <span className="text-slate-400 text-[10px]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected node info */}
      {selectedNodeId && phase === 'setup' && (
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-3 text-sm">
          <div className="text-cyan-400 font-semibold text-xs uppercase tracking-wider mb-1">
            Crisis Origin
          </div>
          <div className="text-white font-bold">
            {nodes.find((n) => n.id === selectedNodeId)?.name || selectedNodeId}
          </div>
          <div className="text-slate-400 text-xs mt-0.5">
            Click another node to change
          </div>
        </div>
      )}
    </div>
  );
}
