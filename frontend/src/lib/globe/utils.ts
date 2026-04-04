// ============================================================
// CrisisAlpha — Globe Utilities
// Lat/Lng to 3D coordinate conversion + arc helpers
// ============================================================

import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;

/**
 * Convert latitude/longitude to a 3D position on a sphere.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Create a curved arc between two points on a sphere.
 * The arc lifts above the surface proportional to the distance.
 */
export function createArcCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  segments: number = 64
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const distance = start.distanceTo(end);
  const arcHeight = Math.min(distance * 0.4, radius * 0.3);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // Spherical interpolation (slerp) for the base path
    const interpolated = new THREE.Vector3().lerpVectors(start, end, t);
    interpolated.normalize().multiplyScalar(radius);

    // Add height above sphere surface using a sine curve
    const lift = Math.sin(t * Math.PI) * arcHeight;
    const liftDir = interpolated.clone().normalize();
    interpolated.add(liftDir.multiplyScalar(lift));

    points.push(interpolated);
  }

  return points;
}

/**
 * Get an emissive intensity value based on risk score.
 */
export function getRiskEmissiveIntensity(riskScore: number): number {
  if (riskScore >= 0.8) return 2.0;
  if (riskScore >= 0.6) return 1.5;
  if (riskScore >= 0.3) return 0.8;
  return 0.4;
}

/**
 * Generate vertices for a wireframe icosphere.
 * Returns geometry for a low-poly globe look.
 */
export function createGlobeGeometry(
  radius: number,
  detail: number = 24
): THREE.IcosahedronGeometry {
  return new THREE.IcosahedronGeometry(radius, detail);
}

/**
 * Generate grid lines (graticule) for the globe.
 */
export function createGraticulePoints(
  radius: number,
  latStep: number = 20,
  lngStep: number = 20,
  segments: number = 72
): THREE.Vector3[][] {
  const lines: THREE.Vector3[][] = [];

  // Latitude circles
  for (let lat = -80; lat <= 80; lat += latStep) {
    const circle: THREE.Vector3[] = [];
    for (let lng = -180; lng <= 180; lng += 360 / segments) {
      circle.push(latLngToVector3(lat, lng, radius));
    }
    lines.push(circle);
  }

  // Longitude lines
  for (let lng = -180; lng < 180; lng += lngStep) {
    const line: THREE.Vector3[] = [];
    for (let lat = -90; lat <= 90; lat += 180 / segments) {
      line.push(latLngToVector3(lat, lng, radius));
    }
    lines.push(line);
  }

  return lines;
}

// ── Transport-type-aware arc generation ──────────────────────

type TransportType = 'air' | 'sea' | 'road' | 'rail';

/**
 * Arc height multiplier per transport type.
 * Air flies high, sea hugs the surface, road/rail are nearly flat.
 */
const ARC_HEIGHT_FACTOR: Record<TransportType, number> = {
  air: 0.55,
  sea: 0.2,
  road: 0.08,
  rail: 0.1,
};

/**
 * Create a transport-aware arc between two surface points.
 * Height varies by transport type.
 */
export function createTransportArc(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  transportType: TransportType,
  segments: number = 48
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const distance = start.distanceTo(end);
  const heightFactor = ARC_HEIGHT_FACTOR[transportType] ?? 0.3;
  const arcHeight = Math.min(distance * heightFactor, radius * 0.35);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const interpolated = new THREE.Vector3().lerpVectors(start, end, t);
    interpolated.normalize().multiplyScalar(radius);

    const lift = Math.sin(t * Math.PI) * arcHeight;
    const liftDir = interpolated.clone().normalize();
    interpolated.add(liftDir.multiplyScalar(lift));

    points.push(interpolated);
  }

  return points;
}

/**
 * Visual style configuration per transport type.
 */
export interface TransportStyle {
  baseColor: string;
  lineWidth: number;
  dashed: boolean;
  dashSize: number;
  gapSize: number;
  particleSpeed: number;
  particleCount: number;
  particleSize: number;
  opacity: number;
  icon: string;
  label: string;
}

export const TRANSPORT_STYLES: Record<TransportType, TransportStyle> = {
  air: {
    baseColor: '#38bdf8',
    lineWidth: 0.8,
    dashed: true,
    dashSize: 0.04,
    gapSize: 0.04,
    particleSpeed: 0.3,
    particleCount: 2,
    particleSize: 0.014,
    opacity: 0.5,
    icon: '✈️',
    label: 'Air',
  },
  sea: {
    baseColor: '#06b6d4',
    lineWidth: 1.6,
    dashed: false,
    dashSize: 0,
    gapSize: 0,
    particleSpeed: 0.08,
    particleCount: 1,
    particleSize: 0.016,
    opacity: 0.55,
    icon: '🚢',
    label: 'Sea',
  },
  road: {
    baseColor: '#a78bfa',
    lineWidth: 1.0,
    dashed: true,
    dashSize: 0.02,
    gapSize: 0.02,
    particleSpeed: 0.18,
    particleCount: 1,
    particleSize: 0.01,
    opacity: 0.45,
    icon: '🚛',
    label: 'Road',
  },
  rail: {
    baseColor: '#f59e0b',
    lineWidth: 1.2,
    dashed: true,
    dashSize: 0.015,
    gapSize: 0.015,
    particleSpeed: 0.14,
    particleCount: 1,
    particleSize: 0.012,
    opacity: 0.5,
    icon: '🚂',
    label: 'Rail',
  },
};
