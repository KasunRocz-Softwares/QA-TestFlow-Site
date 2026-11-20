// KasunRocz Softwares — shared 3D hero planet for project sites.
// Usage: <canvas class="kr-planet" data-kind="ring|waves|crystal|graph|pages" data-color="#ffb547" aria-hidden="true"></canvas>
// The page works without it: if WebGL or the CDN fails, the canvas simply stays empty.
const canvas = document.querySelector('canvas.kr-planet');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) {
  import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js')
    .then((THREE) => start(THREE))
    .catch((err) => console.warn('3D hero unavailable', err));
}

function start(THREE) {
  const small = innerWidth < 760 || matchMedia('(pointer: coarse)').matches;
  const kind = canvas.dataset.kind || 'ring';
  const color = new THREE.Color(canvas.dataset.color || '#3cf2c8');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  camera.position.set(0, 0, 11);

  const uTime = { value: 0 };
  const deep = color.clone().multiplyScalar(.14);
  const light = color.clone().lerp(new THREE.Color(0xffffff), .55);

  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.25, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const GLOW = new THREE.CanvasTexture(c);
  const glow = (col, size, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); return s;
  };
  const additive = (col, opacity, extra = {}) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, ...extra });

  const orb = (geo) => new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uTime, uColor: { value: color }, uDeep: { value: deep } },
    vertexShader: `uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vNoise;
      void main(){ vec3 p = position;
        float n = sin(p.x*2.3+uTime*.8)*sin(p.y*2.7+uTime*.6)*sin(p.z*2.1+uTime*.9);
        p += normal * n * .05; vNoise = n;
        vec4 mv = modelViewMatrix*vec4(p,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform vec3 uDeep; varying vec3 vN; varying vec3 vV; varying float vNoise;
      void main(){ float f = 1. - clamp(dot(normalize(vN), normalize(vV)), 0., 1.);
        vec3 col = uDeep * (.15 + .3*(vNoise*.5+.5));
        col = mix(col, uColor, pow(f, 2.2)); col += uColor * pow(f, 6.) * 1.3;
        gl_FragColor = vec4(col, 1.); }`,
  }));

  const world = new THREE.Group();
  scene.add(world);
  const updates = [];

  // dust ring of particles around any planet, for depth
  const dust = (n, rMin, rMax, tilt, col2) => {
    const pos = new Float32Array(n * 3), cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin);
      pos.set([Math.cos(a) * r, (Math.random() - .5) * .3, Math.sin(a) * r], i * 3);
      const cc = Math.random() < .7 ? color : col2;
      cols.set([cc.r, cc.g, cc.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: .05, vertexColors: true, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    const pivot = new THREE.Group();
    pivot.rotation.set(tilt, 0, .3);
    pivot.add(pts);
    world.add(pivot);
    updates.push((t) => { pts.rotation.y = t * .06; });
  };

  if (kind === 'ring') {
    world.add(orb(new THREE.IcosahedronGeometry(1.7, small ? 16 : 28)));
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 4, 160, 1), new THREE.ShaderMaterial({
      uniforms: { uTime, uColor: { value: color } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec2 vP;
        void main(){ float r = length(vP); float t = (r-2.4)/1.6; float bands = .5+.5*sin(t*42.);
          float a = smoothstep(0.,.1,t)*smoothstep(1.,.8,t)*(.25+.75*bands)*.65;
          a *= .65 + .35*sin(atan(vP.y,vP.x)*2. + uTime*.7);
          gl_FragColor = vec4(uColor, a); }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    ring.rotation.set(-1.15, .25, .35);
    world.add(ring);
    dust(small ? 500 : 1100, 4.4, 6.2, -1.15 + Math.PI / 2, light);
    const moonPivot = new THREE.Group(); moonPivot.rotation.set(.4, 0, -.3);
    const moon = orb(new THREE.IcosahedronGeometry(.26, 3)); moon.position.x = 6.8;
    moonPivot.add(moon); world.add(moonPivot);
    updates.push((t) => { ring.rotation.z = .35 + t * .08; moonPivot.rotation.y = t * .4; });
  } else if (kind === 'waves') {
    world.add(orb(new THREE.IcosahedronGeometry(1.5, small ? 16 : 28)));
    const waveGeo = new THREE.RingGeometry(.985, 1, 128, 1);
    const waves = Array.from({ length: 5 }, () => {
      const m = new THREE.Mesh(waveGeo, additive(color, .5, { side: THREE.DoubleSide }));
      m.rotation.set(-1.2, .3, 0); world.add(m); return m;
    });
    const BARS = 56;
    const eq = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, 1, .08), additive(color, .85), BARS);
    const eqPivot = new THREE.Group(); eqPivot.rotation.set(-1.2 + Math.PI / 2, .3, 0); eqPivot.add(eq); world.add(eqPivot);
    const d = new THREE.Object3D();
    dust(small ? 400 : 900, 5.6, 6.6, .2, light);
    updates.push((t) => {
      waves.forEach((w, i) => { const ph = (t * .32 + i / waves.length) % 1; w.scale.setScalar(1.7 + ph * 4.6); w.material.opacity = (1 - ph) * .55; });
      for (let i = 0; i < BARS; i++) {
        const a = i / BARS * Math.PI * 2;
        d.position.set(Math.cos(a) * 2.35, 0, Math.sin(a) * 2.35); d.rotation.set(0, -a, 0);
        d.scale.set(1, .3 + Math.abs(Math.sin(t * 3.1 + i * .7) * Math.sin(t * 1.7 + i * .23)) * 1.5, 1);
        d.updateMatrix(); eq.setMatrixAt(i, d.matrix);
      }
      eq.instanceMatrix.needsUpdate = true; eqPivot.rotation.z = t * .1;
    });
  } else if (kind === 'graph') {
    // Dependency graph: a core inside a geodesic network. Nodes are coloured by test status,
    // and pulses travel along edges the way a change propagates to dependent features.
    world.add(orb(new THREE.IcosahedronGeometry(1.25, small ? 12 : 24)));
    const net = new THREE.Group();
    world.add(net);
    const shellGeo = new THREE.IcosahedronGeometry(3.1, 1);
    net.add(new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), additive(color, .28)));
    const posAttr = shellGeo.getAttribute('position');
    const verts = [];
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      if (!verts.some((u) => u.distanceTo(v) < .01)) verts.push(v);
    }
    const status = [color, color, color, new THREE.Color(0xffb547), new THREE.Color(0xff5d6c)];
    const alarms = [];
    verts.forEach((v, i) => {
      const c2 = status[i % status.length];
      const m = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 12), new THREE.MeshBasicMaterial({ color: c2 }));
      m.position.copy(v);
      const gl = glow(c2, .7, .8); gl.position.copy(v);
      net.add(m, gl);
      if (i % status.length === 4) alarms.push(gl);
    });
    const pairs = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) if (verts[i].distanceTo(verts[j]) < 2.2) pairs.push([verts[i], verts[j]]);
    }
    const pulses = Array.from({ length: small ? 10 : 18 }, () => {
      const sp = glow(light, .45, .95);
      net.add(sp);
      return { sp, pair: pairs[(Math.random() * pairs.length) | 0], u: Math.random(), speed: .35 + Math.random() * .4 };
    });
    dust(small ? 350 : 700, 4.6, 6.4, .3, light);
    updates.push((t, dt) => {
      net.rotation.y = t * .08;
      net.rotation.x = Math.sin(t * .2) * .1;
      pulses.forEach((p) => {
        p.u += dt * p.speed;
        if (p.u >= 1) { p.u = 0; p.pair = pairs[(Math.random() * pairs.length) | 0]; }
        p.sp.position.lerpVectors(p.pair[0], p.pair[1], p.u);
        p.sp.material.opacity = Math.sin(p.u * Math.PI) * .95;
      });
      alarms.forEach((gl) => { gl.material.opacity = .45 + .45 * Math.sin(t * 5); });
    });
  } else if (kind === 'pages') {
    // Release documents: page cards orbit the core like a release history. In turn, the card at the
    // front is published: it lights up, a stamp ripple spreads from it and a beam links it to the core.
    world.add(orb(new THREE.IcosahedronGeometry(1.3, small ? 14 : 24)));
    const pc = document.createElement('canvas'); pc.width = 128; pc.height = 164;
    const px = pc.getContext('2d');
    const box = (x, y, w, h, r) => { px.beginPath(); if (px.roundRect) px.roundRect(x, y, w, h, r); else px.rect(x, y, w, h); };
    px.fillStyle = 'rgba(255,255,255,.14)'; box(4, 4, 120, 156, 12); px.fill();
    px.strokeStyle = 'rgba(255,255,255,.95)'; px.lineWidth = 4; box(4, 4, 120, 156, 12); px.stroke();
    px.fillStyle = 'rgba(255,255,255,.95)'; box(16, 18, 48, 14, 7); px.fill();
    px.fillStyle = 'rgba(255,255,255,.55)';
    [46, 62, 78, 94, 110].forEach((y, i) => { box(16, y, i % 2 ? 66 : 96, 7, 3.5); px.fill(); });
    px.fillStyle = 'rgba(255,255,255,.9)'; px.beginPath(); px.arc(102, 138, 10, 0, Math.PI * 2); px.fill();
    const pageTex = new THREE.CanvasTexture(pc);
    const lineAdd = (col, opacity) => new THREE.LineBasicMaterial({ color: col, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    const N = 9, R = 3.3;
    const orbit = new THREE.Group(); orbit.rotation.set(.34, 0, -.14); world.add(orbit);
    const track = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; track.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R)); }
    orbit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(track), lineAdd(color, .22)));
    const cardGeo = new THREE.PlaneGeometry(.95, 1.22);
    const cards = Array.from({ length: N }, (_, i) => {
      const a = i / N * Math.PI * 2;
      const m = new THREE.Mesh(cardGeo, additive(color, .5, { map: pageTex, side: THREE.DoubleSide }));
      m.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); m.rotation.y = Math.PI / 2 - a;
      orbit.add(m); return m;
    });
    const ripple = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), additive(light, 0, { side: THREE.DoubleSide }));
    const stamp = glow(light, 1.6, 0);
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const beam = new THREE.Line(beamGeo, lineAdd(light, 0)); orbit.add(beam);
    dust(small ? 350 : 700, 4.7, 6.3, .34, light);
    const P = 2.6, wp = new THREE.Vector3(), cp = new THREE.Vector3();
    let cycle = -1, lit = cards[0];
    updates.push((t) => {
      orbit.rotation.y = t * .16;
      const k = Math.floor(t / P), ph = (t % P) / P;
      if (k !== cycle) {
        cycle = k; let best = -Infinity;
        // the front-left card, seen from the camera: it stays clear of the core and of the page's release card
        orbit.getWorldPosition(cp).applyMatrix4(camera.matrixWorldInverse);
        cards.forEach((m) => { m.getWorldPosition(wp).applyMatrix4(camera.matrixWorldInverse); const score = (wp.z - cp.z) - (wp.x - cp.x) * 1.4; if (score > best) { best = score; lit = m; } });
        lit.add(ripple, stamp);
        beamGeo.attributes.position.setXYZ(1, lit.position.x, lit.position.y, lit.position.z); beamGeo.attributes.position.needsUpdate = true;
      }
      const pulse = ph < .12 ? ph / .12 : Math.pow(1 - (ph - .12) / .88, 2);
      cards.forEach((m) => { const on = m === lit ? pulse : 0; m.material.opacity = .42 + on * .55; m.scale.setScalar(1 + on * .16); });
      ripple.scale.setScalar(.5 + ph * 1.05); ripple.material.opacity = (1 - ph) * .7;
      stamp.material.opacity = pulse * .9;
      beam.material.opacity = pulse * .6;
    });
  } else {
    const crystal = orb(new THREE.OctahedronGeometry(1.8, 0));
    world.add(crystal);
    const cage = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), additive(color, .22, { wireframe: true }));
    world.add(cage);
    const LOCKS = 14;
    const locks = new THREE.InstancedMesh(new THREE.BoxGeometry(.18, .18, .18), new THREE.MeshBasicMaterial({ color: light }), LOCKS);
    const lp = new THREE.Group(); lp.rotation.set(.5, 0, .25); lp.add(locks); world.add(lp);
    const d = new THREE.Object3D();
    dust(small ? 350 : 700, 5.2, 7.5, .35, light);
    updates.push((t) => {
      crystal.rotation.y = t * .35; crystal.rotation.x = Math.sin(t * .5) * .25;
      cage.rotation.y = -t * .12; cage.rotation.x = t * .07;
      for (let i = 0; i < LOCKS; i++) {
        const a = i / LOCKS * Math.PI * 2 + t * .3;
        d.position.set(Math.cos(a) * 4, Math.sin(t * 2 + i) * .08, Math.sin(a) * 4);
        d.rotation.set(t + i, t * .6, 0); d.updateMatrix(); locks.setMatrixAt(i, d.matrix);
      }
      locks.instanceMatrix.needsUpdate = true;
    });
  }
  world.add(glow(color, 11, .4));

  // stars
  {
    const n = small ? 300 : 600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.random() - .5) * 50, (Math.random() - .5) * 30, -10 - Math.random() * 25], i * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcfd8ff, size: .07, transparent: true, opacity: .55, depthWrite: false })));
  }

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (canvas.dataset.bleed != null) {
      // Full-window canvas: frame the planet from the window's shape. Park it on the right and keep the whole
      // body (data-radius, in scene units) in view at any size; only a faint ring may run off the screen edge.
      const RAD = Number(canvas.dataset.radius) || 3, aspect = w / h;
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      // data-size="large" keeps the planet big (camera distance 11, or 15 when stacked) and lets it run off
      // the window's right edge a little; the default keeps the whole body in view.
      const large = canvas.dataset.size === 'large';
      let z, x, y = 0;
      if (innerWidth > 1080) {
        z = large ? 11 : Math.max(11, RAD / (0.66 * tanH)); // default: body never taller than ~2/3 of the window
        const halfW = z * tanH * aspect;
        x = large
          ? Math.max(0, Math.min(halfW * 0.46, halfW - RAD * 0.55))
          : Math.max(0, Math.min(halfW - RAD, halfW * 0.46));
      } else if (large) {
        z = 15;
        const halfW = z * tanH * aspect, halfH = z * tanH;
        x = halfW * 0.25;
        y = -halfH * 0.2;
      } else {
        z = Math.max(11, (RAD * 2) / (tanH * aspect));
        const halfW = z * tanH * aspect, halfH = z * tanH;
        x = halfW - RAD * 1.1;
        y = halfH * 0.3;
      }
      camera.position.z = z;
      world.position.set(x, y, 0);
    } else {
      camera.position.z = w / h < 1 ? 15 : 11;
    }
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX / innerWidth - .5; ptr.y = e.clientY / innerHeight - .5; }, { passive: true });

  const clock = new THREE.Clock();
  let t = 0, visible = true, raf = 0;
  const frame = () => {
    const dt = Math.min(clock.getDelta(), .05);
    t += dt;
    uTime.value = t;
    ptr.sx += (ptr.x - ptr.sx) * .05; ptr.sy += (ptr.y - ptr.sy) * .05;
    camera.position.x = ptr.sx * 1.2; camera.position.y = -ptr.sy * .8;
    camera.lookAt(0, 0, 0);
    world.rotation.y = Math.sin(t * .2) * .2;
    updates.forEach((u) => u(t, dt));
    renderer.render(scene, camera);
    raf = visible && !reduce ? requestAnimationFrame(frame) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !reduce) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  }).observe(canvas);
  frame();
  requestAnimationFrame(() => canvas.classList.add('is-ready'));
}
