'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';


function Model() {
  const { scene } = useGLTF('/textured_mesh_medpoly_glb.glb'); // public 폴더 기준으로 경로 설정
  return <primitive object={scene} />;
}


export default function Home() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>  {/* 부모 요소에 크기 지정 */}
      <Canvas style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 0, 5]} />
        <Model />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
