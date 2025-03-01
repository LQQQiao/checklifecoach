// 创建 Three.js 场景
let scene, camera, renderer, particles, particlesMaterial;
let mouseX = 0;
let mouseY = 0;
let time = 0;
let lines;
let audioContext, analyser, audioData;
let isAudioInitialized = false;

// 初始化音频分析器
async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        audioData = new Uint8Array(analyser.frequencyBinCount);

        // 创建音频源（可以是麦克风输入）
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        isAudioInitialized = true;
    } catch (error) {
        console.error('音频初始化失败:', error);
    }
}

// 创建连线的函数
function createLines(positions, particlesCount) {
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(particlesCount * 6); // 每条线需要2个点，每个点需要3个坐标
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.LineSegments(lineGeometry, lineMaterial);
}

// 初始化场景
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);

    // 将渲染器的画布添加到页面
    document.body.appendChild(renderer.domElement);
    // 设置画布样式
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '-1';

    // 创建粒子系统
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
    const posArray = new Float32Array(particlesCount * 3);
    const colorsArray = new Float32Array(particlesCount * 3);
    const sizesArray = new Float32Array(particlesCount);

    for(let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        // 创建螺旋形分布
        const radius = Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 3;
        
        posArray[i3] = Math.cos(theta) * radius;
        posArray[i3 + 1] = y;
        posArray[i3 + 2] = Math.sin(theta) * radius;

        // 设置渐变色
        const hue = (y + 1.5) / 3;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
        colorsArray[i3] = color.r;
        colorsArray[i3 + 1] = color.g;
        colorsArray[i3 + 2] = color.b;

        // 随机粒子大小
        sizesArray[i] = Math.random() * 0.01 + 0.003;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizesArray, 1));

    // 创建粒子材质
    particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            mousePosition: { value: new THREE.Vector2(0, 0) }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            
            void main() {
                vColor = color;
                vec3 pos = position;
                pos.y += sin(time * 2.0 + position.x * 2.0) * 0.1;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                vec3 color = vColor;
                gl_FragColor = vec4(color, 1.0 - dist * 2.0);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    // 创建粒子系统
    particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // 创建连线系统
    lines = createLines(posArray, particlesCount);
    scene.add(lines);

    camera.position.z = 2;

    // 添加鼠标移动事件监听
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);

    animate();
}

// 处理鼠标移动
function onMouseMove(event) {
    mouseX = (event.clientX - window.innerWidth / 2) * 0.0002;
    mouseY = (event.clientY - window.innerHeight / 2) * 0.0002;
}

// 处理窗口大小变化
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);

    time += 0.005;
    
    // 更新音频数据
    if (isAudioInitialized) {
        analyser.getByteFrequencyData(audioData);
        const averageFrequency = Array.from(audioData).reduce((a, b) => a + b) / audioData.length;
        const normalizedFrequency = averageFrequency / 256;

        // 根据音频数据调整粒子系统
        particles.rotation.x += mouseY * 0.2 * (1 + normalizedFrequency * 0.5);
        particles.rotation.y += mouseX * 0.2 * (1 + normalizedFrequency * 0.5);
        particles.scale.set(
            1 + normalizedFrequency * 0.2,
            1 + normalizedFrequency * 0.2,
            1 + normalizedFrequency * 0.2
        );
    } else {
        particles.rotation.x += mouseY * 0.2;
        particles.rotation.y += mouseX * 0.2;
    }
    particlesMaterial.uniforms.time.value = time;

    // 更新连线
    const positions = particles.geometry.attributes.position.array;
    const linePositions = lines.geometry.attributes.position.array;
    let lineIndex = 0;

    for(let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // 为每个粒子找到最近的几个粒子并连线
        for(let j = i + 3; j < positions.length; j += 3) {
            const x2 = positions[j];
            const y2 = positions[j + 1];
            const z2 = positions[j + 2];

            const dist = Math.sqrt(
                Math.pow(x - x2, 2) +
                Math.pow(y - y2, 2) +
                Math.pow(z - z2, 2)
            );

            if(dist < 0.5 && lineIndex < linePositions.length - 5) {
                linePositions[lineIndex++] = x;
                linePositions[lineIndex++] = y;
                linePositions[lineIndex++] = z;
                linePositions[lineIndex++] = x2;
                linePositions[lineIndex++] = y2;
                linePositions[lineIndex++] = z2;
            }
        }
    }

    lines.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
}

// 添加点击事件监听器来初始化音频
document.addEventListener('click', () => {
    if (!isAudioInitialized) {
        initAudio();
    }
});

// 导出初始化函数
export { init };