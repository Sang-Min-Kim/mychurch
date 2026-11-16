import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { buildSanctuaryScene } from '../three/buildSanctuaryScene';
import type { ActivePilgrim, SoundscapeId } from '../types';
import { ambientAudio } from '../utils/ambientAudio';

type CameraMode = 'cinematic' | 'vr-first' | 'orbit';

interface SanctuaryVRPlayerProps {
  activePilgrims: ActivePilgrim[];
  myPilgrimId?: string | null;
  onEnterFromVR?: () => void;
}

const TOTAL_DURATION = 42; // seconds for complete Enter -> Pray -> Candle -> Exit journey

const CHAPTERS = [
  { id: 'enter', label: '01 입장', startSec: 0, caption: '이른 아침 아트리움 돌 수반을 지나 성당 안으로 들어섭니다.' },
  { id: 'pray', label: '02 기도', startSec: 12, caption: '대성전 앞 좌석에 조용히 머물며 침묵의 기도를 올립니다.' },
  { id: 'candle', label: '03 초 봉헌', startSec: 24, caption: '봉헌 초 제대 앞에서 소중한 이의 이름을 담아 촛불을 밝힙니다.' },
  { id: 'exit', label: '04 퇴장', startSec: 33, caption: '평화의 인사를 간직한 채 다시 소나무 마당으로 나섭니다.' },
] as const;

// Pre-allocated math objects outside animation loop (zero GC)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _currentLookTarget = new THREE.Vector3(0, 1.4, -2);

function evalPilgrimPose(t: number) {
  // Returns world position, yaw, walkSpeed, kneelFactor (0..1), prayerHands (0..1), candleGlow (0..1), bowAngle
  let x = 0;
  let z = 15.8;
  let yaw = Math.PI; // Facing -Z (toward church altar)
  let walkSpeed = 0;
  let kneel = 0;
  let prayerHands = 0;
  let candleGlow = 0;
  let bow = 0;

  if (t < 11.5) {
    // Act 1: Walk from exterior courtyard (z=15.8) through doors (z=4.5) down aisle to z=-2.2
    const u = THREE.MathUtils.smoothstep(t, 0.8, 11.2);
    z = THREE.MathUtils.lerp(15.8, -2.2, u);
    walkSpeed = t > 0.8 && t < 11.2 ? 1.0 : 0.0;
    yaw = Math.PI;
    // Slight respectful bow right at doorway threshold (t=5.5..7.2)
    if (t > 5.2 && t < 7.4) {
      bow = Math.sin(((t - 5.2) / 2.2) * Math.PI) * 0.18;
    }
  } else if (t < 13.5) {
    // Step sideways into left front pew (-1.5, -2.5) and settle into prayer
    const u = THREE.MathUtils.smoothstep(t, 11.5, 13.2);
    x = THREE.MathUtils.lerp(0, -1.5, u);
    z = THREE.MathUtils.lerp(-2.2, -2.5, u);
    yaw = THREE.MathUtils.lerp(Math.PI, Math.PI, u);
    walkSpeed = t < 13.0 ? 0.55 : 0;
    kneel = THREE.MathUtils.smoothstep(t, 12.6, 13.5);
    prayerHands = kneel;
  } else if (t < 23.5) {
    // Act 2: Silent Prayer seated/kneeling in pew facing the altar
    x = -1.5;
    z = -2.5;
    yaw = Math.PI;
    kneel = 1;
    prayerHands = 1;
    bow = 0.24;
  } else if (t < 26.8) {
    // Stand and walk gently across nave to Votive Candle Stand (x=3.8, z=-3.4)
    const standU = THREE.MathUtils.smoothstep(t, 23.5, 24.4);
    kneel = 1 - standU;
    prayerHands = 1 - standU;
    const walkU = THREE.MathUtils.smoothstep(t, 24.2, 26.7);
    x = THREE.MathUtils.lerp(-1.5, 3.7, walkU);
    z = THREE.MathUtils.lerp(-2.5, -3.4, walkU);
    yaw = Math.PI * 0.55; // Facing +X toward candle stand
    walkSpeed = t > 24.2 && t < 26.6 ? 0.85 : 0;
  } else if (t < 32.5) {
    // Act 3: Pause in silent remembrance at the Votive Candle Alcove
    x = 3.7;
    z = -3.4;
    yaw = Math.PI * 0.5; // Facing +X
    prayerHands = 0.85;
    bow = 0.15;
    candleGlow = THREE.MathUtils.smoothstep(t, 27.2, 29.0);
  } else if (t < 34.5) {
    // Step back to center aisle (x=0, z=-1.5) and turn toward exit (+Z)
    const u = THREE.MathUtils.smoothstep(t, 32.5, 34.4);
    x = THREE.MathUtils.lerp(3.7, 0, u);
    z = THREE.MathUtils.lerp(-3.4, -1.5, u);
    yaw = THREE.MathUtils.lerp(Math.PI * 0.5, 0, u);
    walkSpeed = 0.8;
  } else {
    // Act 4: Walk peacefully down center aisle out through oak doors into pine courtyard
    const u = THREE.MathUtils.smoothstep(t, 34.5, 41.2);
    x = 0;
    z = THREE.MathUtils.lerp(-1.5, 15.8, u);
    yaw = 0; // Facing +Z (exiting courtyard)
    walkSpeed = t < 41.2 ? 0.95 : 0;
  }

  return { x, z, yaw, walkSpeed, kneel, prayerHands, candleGlow, bow };
}

export function SanctuaryVRPlayer({
  activePilgrims,
  myPilgrimId,
  onEnterFromVR,
}: SanctuaryVRPlayerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [cameraMode, setCameraMode] = useState<CameraMode>('cinematic');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timelineSec, setTimelineSec] = useState<number>(0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<boolean>(false);
  const [vrSound, setVrSound] = useState<SoundscapeId>('silence');

  // Mutable refs so React UI updates never re-initialize the WebGLRenderer
  const cameraModeRef = useRef<CameraMode>('cinematic');
  const isPlayingRef = useRef<boolean>(true);
  const timeRef = useRef<number>(0);
  const vrLookOffsetRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
  const activePilgrimsRef = useRef<ActivePilgrim[]>(activePilgrims);
  const myPilgrimIdRef = useRef<string | null | undefined>(myPilgrimId);
  const sceneHandleRef = useRef<ReturnType<typeof buildSanctuaryScene> | null>(null);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    activePilgrimsRef.current = activePilgrims;
    sceneHandleRef.current?.syncConcurrentPilgrims(activePilgrims, myPilgrimId);
  }, [activePilgrims, myPilgrimId]);

  useEffect(() => {
    myPilgrimIdRef.current = myPilgrimId;
  }, [myPilgrimId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Software WebGL GPU detection per threejs skill
    const isSoftwareGl = (() => {
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handle = buildSanctuaryScene(renderer, isSoftwareGl);
    sceneHandleRef.current = handle;
    handle.camera.aspect = width / height;
    handle.camera.updateProjectionMatrix();
    handle.syncConcurrentPilgrims(activePilgrimsRef.current, myPilgrimIdRef.current);

    if (!isSoftwareGl) {
      renderer.compile(handle.scene, handle.camera);
    }

    const controls = new OrbitControls(handle.camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.5;
    controls.maxDistance = 26;
    controls.target.set(0, 1.5, -2);

    // 360° drag look-around during First-Person VR mode
    let draggingVrLook = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (cameraModeRef.current === 'vr-first') {
        draggingVrLook = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingVrLook || cameraModeRef.current !== 'vr-first') return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      vrLookOffsetRef.current.yaw -= dx * 0.0045;
      vrLookOffsetRef.current.pitch = THREE.MathUtils.clamp(
        vrLookOffsetRef.current.pitch - dy * 0.0035,
        -0.55,
        0.55
      );
    };
    const onPointerUp = () => {
      draggingVrLook = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      handle.camera.aspect = w / h;
      handle.camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;
    let lastClockMs = performance.now();
    let uiSyncAccum = 0;
    let walkPhase = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const dt = Math.min(0.1, (nowMs - lastClockMs) / 1000);
      lastClockMs = nowMs;
      const elapsedSec = nowMs / 1000;

      if (isPlayingRef.current) {
        timeRef.current = (timeRef.current + dt) % TOTAL_DURATION;
        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.25) {
          uiSyncAccum = 0;
          setTimelineSec(timeRef.current);
        }
      }

      const t = timeRef.current;
      const pose = evalPilgrimPose(t);

      // Animate articulated pilgrim limbs
      const { pilgrim } = handle;
      pilgrim.root.position.set(pose.x, 0, pose.z);
      pilgrim.root.rotation.y = pose.yaw;

      if (pose.walkSpeed > 0.05) {
        walkPhase += dt * 4.4 * pose.walkSpeed;
        const swing = Math.sin(walkPhase) * 0.38;
        pilgrim.leftLeg.rotation.x = swing;
        pilgrim.rightLeg.rotation.x = -swing;
        pilgrim.leftArm.rotation.set(-swing * 0.45, 0, 0.08);
        pilgrim.rightArm.rotation.set(swing * 0.45, 0, -0.08);
        pilgrim.bodyPivot.position.y = Math.abs(Math.sin(walkPhase)) * 0.025;
      } else {
        pilgrim.leftLeg.rotation.x = THREE.MathUtils.damp(
          pilgrim.leftLeg.rotation.x,
          pose.kneel * -1.08,
          6,
          dt
        );
        pilgrim.rightLeg.rotation.x = THREE.MathUtils.damp(
          pilgrim.rightLeg.rotation.x,
          pose.kneel * -1.08,
          6,
          dt
        );
        pilgrim.bodyPivot.position.y = THREE.MathUtils.damp(
          pilgrim.bodyPivot.position.y,
          pose.kneel * -0.34,
          6,
          dt
        );
        const claspArmX = pose.prayerHands * -0.88;
        pilgrim.leftArm.rotation.x = THREE.MathUtils.damp(pilgrim.leftArm.rotation.x, claspArmX, 6, dt);
        pilgrim.rightArm.rotation.x = THREE.MathUtils.damp(pilgrim.rightArm.rotation.x, claspArmX, 6, dt);
        pilgrim.leftArm.rotation.z = THREE.MathUtils.damp(
          pilgrim.leftArm.rotation.z,
          pose.prayerHands * 0.28,
          6,
          dt
        );
        pilgrim.rightArm.rotation.z = THREE.MathUtils.damp(
          pilgrim.rightArm.rotation.z,
          pose.prayerHands * -0.28,
          6,
          dt
        );
      }

      pilgrim.headGroup.rotation.x = THREE.MathUtils.damp(pilgrim.headGroup.rotation.x, pose.bow, 5, dt);
      pilgrim.lanternGlow.intensity = pose.candleGlow * 1.4;

      // Subtle living candle flicker
      handle.candleFlames.forEach((flame, idx) => {
        const flicker = 0.92 + Math.sin(elapsedSec * 7.2 + idx * 1.9) * 0.12;
        flame.scale.set(1, flicker, 1);
      });
      handle.candleLights.forEach((light) => {
        light.intensity = 1.4 + pose.candleGlow * 0.9 + Math.sin(elapsedSec * 5.3) * 0.12;
      });

      // Camera Choreography
      const mode = cameraModeRef.current;
      if (mode === 'orbit') {
        controls.enabled = true;
        controls.update();
        pilgrim.root.visible = true;
      } else if (mode === 'vr-first') {
        controls.enabled = false;
        pilgrim.root.visible = false; // Hide self mesh in 1st person VR view
        const eyeHeight = 1.54 - pose.kneel * 0.38;
        _camGoalPos.set(pose.x, eyeHeight, pose.z);
        const totalYaw = pose.yaw + vrLookOffsetRef.current.yaw;
        const pitch = vrLookOffsetRef.current.pitch - pose.bow * 0.45;
        const lookDist = 6.0;
        _camGoalTarget.set(
          pose.x + Math.sin(totalYaw) * Math.cos(pitch) * lookDist,
          eyeHeight + Math.sin(pitch) * lookDist,
          pose.z + Math.cos(totalYaw) * Math.cos(pitch) * lookDist
        );
        handle.camera.position.x = THREE.MathUtils.damp(handle.camera.position.x, _camGoalPos.x, 7, dt);
        handle.camera.position.y = THREE.MathUtils.damp(handle.camera.position.y, _camGoalPos.y, 7, dt);
        handle.camera.position.z = THREE.MathUtils.damp(handle.camera.position.z, _camGoalPos.z, 7, dt);
        _currentLookTarget.x = THREE.MathUtils.damp(_currentLookTarget.x, _camGoalTarget.x, 8, dt);
        _currentLookTarget.y = THREE.MathUtils.damp(_currentLookTarget.y, _camGoalTarget.y, 8, dt);
        _currentLookTarget.z = THREE.MathUtils.damp(_currentLookTarget.z, _camGoalTarget.z, 8, dt);
        handle.camera.lookAt(_currentLookTarget);
      } else {
        // Cinematic Follow Mode
        controls.enabled = false;
        pilgrim.root.visible = true;
        const followDist = 3.8;
        const sideOffset = pose.kneel > 0.5 ? 1.45 : 0.95;
        const camX =
          pose.x - Math.sin(pose.yaw) * followDist + Math.cos(pose.yaw) * sideOffset;
        const camZ =
          pose.z - Math.cos(pose.yaw) * followDist - Math.sin(pose.yaw) * sideOffset;
        const camY = 2.05 - pose.kneel * 0.35;

        _camGoalPos.set(camX, camY, camZ);
        _camGoalTarget.set(
          pose.x + Math.sin(pose.yaw) * 2.4,
          1.35 - pose.kneel * 0.2,
          pose.z + Math.cos(pose.yaw) * 2.4
        );
        handle.camera.position.x = THREE.MathUtils.damp(handle.camera.position.x, _camGoalPos.x, 3.2, dt);
        handle.camera.position.y = THREE.MathUtils.damp(handle.camera.position.y, _camGoalPos.y, 3.2, dt);
        handle.camera.position.z = THREE.MathUtils.damp(handle.camera.position.z, _camGoalPos.z, 3.2, dt);
        _currentLookTarget.x = THREE.MathUtils.damp(_currentLookTarget.x, _camGoalTarget.x, 4.0, dt);
        _currentLookTarget.y = THREE.MathUtils.damp(_currentLookTarget.y, _camGoalTarget.y, 4.0, dt);
        _currentLookTarget.z = THREE.MathUtils.damp(_currentLookTarget.z, _camGoalTarget.z, 4.0, dt);
        handle.camera.lookAt(_currentLookTarget);
      }

      renderer.render(handle.scene, handle.camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      handle.dispose();
      renderer.dispose();
      sceneHandleRef.current = null;
    };
  }, []);

  const currentChapter =
    [...CHAPTERS].reverse().find((c) => timelineSec >= c.startSec) || CHAPTERS[0];

  const handleJumpChapter = (sec: number) => {
    timeRef.current = sec;
    setTimelineSec(sec);
  };

  const handleToggleSound = () => {
    const next: SoundscapeId = vrSound === 'silence' ? 'cathedral' : 'silence';
    setVrSound(next);
    ambientAudio.setVolume(0.35);
    ambientAudio.start(next);
  };

  if (webglError) {
    return (
      <div className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-12 text-center space-y-3">
        <p className="font-editorial text-xl text-[#1C1B18] dark:text-[#EDEAE2]">
          3D VR 환경을 불러올 수 없습니다
        </p>
        <p className="text-sm text-[#6E6A63] dark:text-[#A39E93]">
          브라우저의 WebGL 가속 설정을 확인하거나 아래 일반 성당 입장 모드를 이용해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[520px] sm:h-[620px] rounded-lg overflow-hidden border border-[#E5E1D8] dark:border-[#2C2924] bg-[#DCD7CC] dark:bg-[#161412] select-none">
      {/* Isolated WebGL mount container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Minimal Narrative Caption (Solid rgba, no backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 flex items-start justify-between gap-4">
        <div className="max-w-md rounded-md bg-[rgba(24,22,19,0.78)] px-4 py-2.5 text-[#F8F7F4]">
          <div className="text-[11px] tracking-widest text-[#D8B97E]">
            {currentChapter.label} · 360° 가상 성당 순례 VR
          </div>
          <p className="mt-0.5 text-xs sm:text-[13px] leading-relaxed text-[#EDEAE2]">
            {currentChapter.caption}
          </p>
        </div>

        {onEnterFromVR && (
          <button
            type="button"
            onClick={onEnterFromVR}
            className="pointer-events-auto rounded-md bg-[rgba(24,22,19,0.82)] px-3.5 py-2 text-xs font-medium text-[#F8F7F4] border border-[rgba(255,255,255,0.18)] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[rgba(24,22,19,0.95)]"
          >
            내 자리 잡고 기도하기
          </button>
        )}
      </div>

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[min(900px,94%)] transition-transform duration-200"
        style={{
          bottom: '16px',
          transform: dockCollapsed
            ? 'translate(-50%, calc(100% - 28px))'
            : 'translate(-50%, 0)',
        }}
      >
        <div className="flex justify-center mb-1">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-t-md bg-[rgba(24,22,19,0.84)] px-3 py-1 text-[11px] text-[#EDEAE2] cursor-pointer hover:bg-[rgba(24,22,19,0.96)]"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>VR 컨트롤 열기</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>화면 넓게 보기</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-lg bg-[rgba(24,22,19,0.88)] border border-[rgba(255,255,255,0.12)] px-4 py-3 text-[#F8F7F4] space-y-2.5">
          {/* Timeline Scrubber */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              aria-label={isPlaying ? '일시 정지' : '재생'}
              className="inline-flex items-center justify-center w-8 h-8 rounded bg-[#9E7B42] text-[#141311] cursor-pointer hover:bg-[#B38E52] shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min={0}
              max={TOTAL_DURATION - 0.1}
              step={0.1}
              value={timelineSec}
              onChange={(e) => handleJumpChapter(Number(e.target.value))}
              aria-label="VR 순례 영상 타임라인"
              className="flex-1 accent-[#C59F61] cursor-pointer"
            />

            <span className="font-mono text-[11px] tabular-nums text-[#D2CCC0] shrink-0">
              {String(Math.floor(timelineSec)).padStart(2, '0')}s / {TOTAL_DURATION}s
            </span>

            <button
              type="button"
              onClick={() => handleJumpChapter(0)}
              aria-label="처음부터 다시 보기"
              className="inline-flex items-center justify-center w-8 h-8 rounded border border-[rgba(255,255,255,0.16)] text-[#EDEAE2] cursor-pointer hover:bg-[rgba(255,255,255,0.1)] shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chapters + Camera Perspectives + Sound */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              {CHAPTERS.map((chap) => {
                const active = currentChapter.id === chap.id;
                return (
                  <button
                    key={chap.id}
                    type="button"
                    onClick={() => handleJumpChapter(chap.startSec)}
                    className={`px-2.5 py-1 rounded cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-[#9E7B42] text-[#141311] font-medium'
                        : 'bg-[rgba(255,255,255,0.08)] text-[#D8D3C8] hover:bg-[rgba(255,255,255,0.16)]'
                    }`}
                  >
                    {chap.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center rounded bg-[rgba(255,255,255,0.08)] p-0.5">
                {(
                  [
                    { id: 'cinematic', label: '3인칭 따라가기' },
                    { id: 'vr-first', label: '1인칭 VR (드래그 360°)' },
                    { id: 'orbit', label: '성전 자유 시점' },
                  ] as { id: CameraMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      vrLookOffsetRef.current = { yaw: 0, pitch: 0 };
                      setCameraMode(mode.id);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                      cameraMode === mode.id
                        ? 'bg-[#F8F7F4] text-[#141311] font-medium'
                        : 'text-[#D8D3C8] hover:text-white'
                    }`}
                  >
                    {mode.id === 'vr-first' && <Eye className="w-3 h-3" />}
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleToggleSound}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[rgba(255,255,255,0.08)] text-[11px] text-[#EDEAE2] cursor-pointer hover:bg-[rgba(255,255,255,0.16)] whitespace-nowrap shrink-0"
              >
                {vrSound === 'silence' ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-[#A39E93]" />
                    <span>배경음 켜기</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#D8B97E]" />
                    <span>성당 울림 켜짐</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
