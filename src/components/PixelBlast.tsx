import { useRef, useEffect, useState } from 'react';
import { MAX_CLICKS, VERTEX_SRC, FRAGMENT_SRC } from '../constants/mockData';

declare global {
    interface Window {
        THREE: any;
    }
}

interface PixelBlastProps {
    pixelSize?: number;
    color?: string;
    patternScale?: number;
    patternDensity?: number;
    enableRipples?: boolean;
    rippleSpeed?: number;
    rippleThickness?: number;
    rippleIntensityScale?: number;
    edgeFade?: number;
    speed?: number;
}

const PixelBlast = ({
    pixelSize = 4,
    color = '#5D5D5D',
    patternScale = 3.0,
    patternDensity = 1.5,
    enableRipples = true,
    rippleSpeed = 0.5,
    rippleThickness = 0.05,
    rippleIntensityScale = 2.0,
    edgeFade = 0.2,
    speed = 0.5,
}: PixelBlastProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const threeRef = useRef<any>(null);
    const [isThreeLoaded, setIsThreeLoaded] = useState(false);

    useEffect(() => {
        if (window.THREE) {
            setIsThreeLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.async = true;
        script.onload = () => setIsThreeLoaded(true);
        document.body.appendChild(script);
    }, []);

    useEffect(() => {
        if (!isThreeLoaded || !containerRef.current) return;
        const THREE = window.THREE;
        const container = containerRef.current;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        // Always use window dimensions for guaranteed full screen coverage
        const initialWidth = window.innerWidth;
        const initialHeight = window.innerHeight;
        renderer.setSize(initialWidth, initialHeight);

        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(renderer.domElement);

        // Ensure the canvas fills the entire container
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const uniforms = {
            uResolution: { value: new THREE.Vector2(initialWidth, initialHeight) },
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(color) },
            uClickPos: { value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)) },
            uClickTimes: { value: new Float32Array(MAX_CLICKS) },
            uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
            uScale: { value: patternScale },
            uDensity: { value: patternDensity },
            uPixelJitter: { value: 0.0 },
            uEnableRipples: { value: enableRipples ? 1 : 0 },
            uRippleSpeed: { value: rippleSpeed },
            uRippleThickness: { value: rippleThickness },
            uRippleIntensity: { value: rippleIntensityScale },
            uEdgeFade: { value: edgeFade },
            uShapeType: { value: 0 },
        };

        const material = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SRC,
            fragmentShader: FRAGMENT_SRC,
            uniforms,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });

        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(quad);

        const clock = new THREE.Clock();
        let clickIx = 0;

        const onResize = () => {
            if (!container) return;
            // Always use window dimensions for guaranteed full screen coverage
            const w = window.innerWidth;
            const h = window.innerHeight;
            renderer.setSize(w, h);
            uniforms.uResolution.value.set(w, h);
            uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();
        };

        const mapToPixels = (e: PointerEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            const fx = e.clientX - rect.left;
            const fy = (rect.height - (e.clientY - rect.top));
            return { fx, fy };
        };

        const onPointerDown = (e: PointerEvent) => {
            const { fx, fy } = mapToPixels(e);
            uniforms.uClickPos.value[clickIx].set(fx, fy);
            uniforms.uClickTimes.value[clickIx] = uniforms.uTime.value;
            clickIx = (clickIx + 1) % MAX_CLICKS;
        };

        window.addEventListener('resize', onResize);
        renderer.domElement.addEventListener('pointerdown', onPointerDown);

        let raf: number;
        const animate = () => {
            uniforms.uTime.value = clock.getElapsedTime() * speed;
            renderer.render(scene, camera);
            raf = requestAnimationFrame(animate);
        };
        animate();

        threeRef.current = { renderer, scene, camera, material };

        return () => {
            window.removeEventListener('resize', onResize);
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            cancelAnimationFrame(raf);
            if (renderer.domElement.parentElement === container) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [isThreeLoaded, color, pixelSize, patternScale, patternDensity, enableRipples, rippleSpeed, rippleThickness, rippleIntensityScale, edgeFade, speed]);

    return <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0a0a0f' }} />;
};

export default PixelBlast;
