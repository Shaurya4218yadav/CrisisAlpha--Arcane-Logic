'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFleetStore } from '@/state/useFleetStore';
import { latLngToVector3 } from '@/lib/globe/utils';

const GLOBE_RADIUS = 2;
const SHIP_COLOR = new THREE.Color('#38bdf8');
const PLANE_COLOR = new THREE.Color('#a78bfa');

// Custom shape for vehicles. Ship: flat diamond. Plane: elevated triangle
const createShipGeom = () => new THREE.ConeGeometry(0.006, 0.02, 4);
const createPlaneGeom = () => new THREE.ConeGeometry(0.008, 0.025, 3);

// Fallback lookup: standard material
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

export default function VehicleLayer() {
  const { vehicles, searchedVehicle } = useFleetStore();
  const { camera } = useThree();

  const shipMeshRef = useRef<THREE.InstancedMesh>(null);
  const planeMeshRef = useRef<THREE.InstancedMesh>(null);
  const trackingObjRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const searchedHtmlRef = useRef<HTMLDivElement>(null);

  // Maintain separate lists
  const ships = useMemo(() => vehicles.filter(v => v.type === 'sea' || v.type === 'road' || v.type === 'rail'), [vehicles]);
  const planes = useMemo(() => vehicles.filter(v => v.type === 'air'), [vehicles]);

  useEffect(() => {
    if (shipMeshRef.current) shipMeshRef.current.count = ships.length;
    if (planeMeshRef.current) planeMeshRef.current.count = planes.length;
  }, [ships.length, planes.length]);

  useFrame(() => {
    const dummy = new THREE.Object3D();

    // Render Ships (Surface)
    if (shipMeshRef.current) {
      for (let i = 0; i < ships.length; i++) {
        const v = ships[i];
        const pos = latLngToVector3(v.lat, v.lng, GLOBE_RADIUS * 1.002);
        
        dummy.position.copy(pos);
        dummy.lookAt(new THREE.Vector3(0,0,0)); // Look at earth core
        dummy.rotateX(Math.PI / 2); // Lay flat on surface
        
        // Pseudo heading rotation along surface
        dummy.rotateY(v.heading * (Math.PI / 180));
        
        dummy.updateMatrix();
        shipMeshRef.current.setMatrixAt(i, dummy.matrix);
        shipMeshRef.current.setColorAt(i, SHIP_COLOR);

        if (searchedVehicle && v.id === searchedVehicle.id) {
           trackingObjRef.current.position.copy(pos);
        }
      }
      shipMeshRef.current.instanceMatrix.needsUpdate = true;
      if (shipMeshRef.current.instanceColor) shipMeshRef.current.instanceColor.needsUpdate = true;
    }

    // Render Planes (Arcing over globe based on progress)
    if (planeMeshRef.current) {
      for (let i = 0; i < planes.length; i++) {
        const v = planes[i];
        // Calculate altitude using parabolic sine over progress
        const altitude = GLOBE_RADIUS * 1.01 + (Math.sin((v as any).progress * Math.PI) * 0.15);
        const pos = latLngToVector3(v.lat, v.lng, altitude);
        
        dummy.position.copy(pos);
        dummy.lookAt(new THREE.Vector3(0,0,0)); 
        dummy.rotateX(Math.PI / 2);
        dummy.rotateY(v.heading * (Math.PI / 180));

        dummy.updateMatrix();
        planeMeshRef.current.setMatrixAt(i, dummy.matrix);
        planeMeshRef.current.setColorAt(i, PLANE_COLOR);

        if (searchedVehicle && v.id === searchedVehicle.id) {
            trackingObjRef.current.position.copy(pos);
        }
      }
      planeMeshRef.current.instanceMatrix.needsUpdate = true;
      if (planeMeshRef.current.instanceColor) planeMeshRef.current.instanceColor.needsUpdate = true;
    }

    // Camera Fly-To Logic
    if (searchedVehicle) {
       const targetPos = trackingObjRef.current.position.clone().multiplyScalar(1.5); // zoom out slightly
       camera.position.lerp(targetPos, 0.05);
       camera.lookAt(0,0,0);
    }
  });

  return (
    <group>
      {/* Ships */}
      <instancedMesh ref={shipMeshRef} args={[createShipGeom(), material, 5000]}>
        <meshBasicMaterial transparent opacity={0.9} />
      </instancedMesh>

      {/* Planes */}
      <instancedMesh ref={planeMeshRef} args={[createPlaneGeom(), material, 5000]}>
        <meshBasicMaterial transparent opacity={0.9} />
      </instancedMesh>

      {/* Selected Vehicle UI Marker */}
      {searchedVehicle && (
         <group position={trackingObjRef.current.position}>
             {/* Pulsing ring around vehicle */}
             <mesh>
                 <ringGeometry args={[0.02, 0.03, 32]} />
                 <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
             </mesh>
             <Html distanceFactor={4} position={[0, 0.05, 0]} center>
                 <div className="bg-slate-900 border border-white/20 rounded-lg p-2 text-white text-[10px] whitespace-nowrap shadow-xl">
                     <div className="font-bold mb-1">
                         {searchedVehicle.type === 'air' ? '✈️ FLT:' : '🚢 VS:'} {searchedVehicle.id}
                     </div>
                     <div className="text-slate-400">
                         Lat: {searchedVehicle.lat.toFixed(2)} | Lng: {searchedVehicle.lng.toFixed(2)}
                     </div>
                 </div>
             </Html>
         </group>
      )}
    </group>
  );
}
