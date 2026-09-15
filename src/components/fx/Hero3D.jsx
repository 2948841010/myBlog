import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Hero 交互 3D 场景（可随时删除的装饰层）
 * 构成：线框二十面体 + 球面点云壳，鼠标视差 + 滚动影响旋转。
 *
 * 降级与性能纪律：
 * - 由 Hero3DLazy 负责「reduced-motion / 无 WebGL / 低端设备 / 空闲后」的判断，本组件只在可跑时挂载
 * - 只使用程序化几何，零外部资产
 * - DPR 上限 1.5（低端 1.0）、关抗锯齿、powerPreference: 'low-power'、AdditiveBlending 代替后期发光
 * - IntersectionObserver 离屏 + Page Visibility 隐藏时跳过渲染
 * - 卸载时释放几何/材质/渲染器，并处理 context lost
 */
export default function Hero3D({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let width = mount.clientWidth || window.innerWidth;
    let height = mount.clientHeight || window.innerHeight;
    const lowEnd =
      (navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 1100;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !lowEnd,
        powerPreference: 'low-power',
      });
    } catch {
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5));
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / Math.max(1, height), 0.1, 100);
    camera.position.set(0, 0, 7.4);

    const group = new THREE.Group();
    scene.add(group);

    /* --- 1) 线框二十面体：零纹理、几百个顶点 --- */
    const cageGeo = new THREE.IcosahedronGeometry(2.25, lowEnd ? 1 : 2);
    const wireGeo = new THREE.WireframeGeometry(cageGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xff4d2e,
      transparent: true,
      opacity: 0.3,
    });
    const cage = new THREE.LineSegments(wireGeo, wireMat);
    cage.geometry.computeBoundingSphere();
    group.add(cage);

    /* --- 2) 球面点云壳 --- */
    const count = lowEnd ? 1200 : 3600;
    const positions = new Float32Array(count * 3);
    const radius = 3.15;
    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.93 + Math.random() * 0.14);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const cloudMat = new THREE.PointsMaterial({
      size: lowEnd ? 0.036 : 0.026,
      color: 0x4adec0,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const cloud = new THREE.Points(cloudGeo, cloudMat);
    group.add(cloud);

    /* --- 交互输入 --- */
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let scrollFactor = 0;
    let inView = true;
    let contextLost = false;

    const onPointerMove = (e) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      scrollFactor = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              inView = entries.some((en) => en.isIntersecting);
            },
            { threshold: 0 }
          )
        : null;
    if (io) io.observe(mount);

    const onContextLost = (e) => {
      e.preventDefault();
      contextLost = true;
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

    /* --- 尺寸自适应（不监听滚动触发，避免移动端地址栏抖动） --- */
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        const w = mount.clientWidth || width;
        const h = mount.clientHeight || height;
        if (!w || !h) return;
        width = w;
        height = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      });
      ro.observe(mount);
    }

    /* --- 渲染循环 --- */
    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!inView || contextLost || document.hidden) return;

      const t = clock.getElapsedTime();
      pointer.x += (target.x - pointer.x) * 0.05;
      pointer.y += (target.y - pointer.y) * 0.05;

      group.rotation.y += 0.0016;
      group.rotation.x = pointer.y * 0.26 + scrollFactor * 0.45;
      group.rotation.z = pointer.x * 0.13;

      cage.rotation.y = t * 0.045;
      cloud.rotation.y = -t * 0.028;
      wireMat.opacity = 0.26 + Math.sin(t * 0.8) * 0.08;
      cloudMat.opacity = 0.42 + Math.sin(t * 0.6 + 1.2) * 0.1;

      camera.position.x = pointer.x * 0.42;
      camera.position.y = -pointer.y * 0.32;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    onScroll();
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      if (io) io.disconnect();
      if (ro) ro.disconnect();

      cageGeo.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />;
}
