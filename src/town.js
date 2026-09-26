/* Bardejov — dusk town in Three.js */
export function createTown({ THREE, canvas, MOBILE, vpW, vpH, clamp, lerp, CAM, setLoad, RIG }) {
  let renderer,
    scene,
    camera,
    town,
    lanterns = [];
  let moon, wordMesh;
  let curveP, curveT;

  function cvs(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return { c, x: c.getContext('2d') };
  }
  function tx(el, o) {
    o = o || {};
    const t = new THREE.CanvasTexture(el);
    t.wrapS = t.wrapT = o.wrap || THREE.RepeatWrapping;
    t.anisotropy = MOBILE ? 1 : o.aniso || 8;
    t.colorSpace = THREE.SRGBColorSpace;
    if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
    return t;
  }

  function texCobble() {
    const { c, x } = cvs(512, 512);
    x.fillStyle = '#4a4038';
    x.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 14) {
      const off = (y / 14) % 2 ? 10 : 0;
      for (let px = -10; px < 512; px += 20) {
        const n = 70 + Math.random() * 50;
        x.fillStyle = `rgb(${n + 18},${n + 8},${n - 8})`;
        x.beginPath();
        x.ellipse(px + off + 10, y + 7, 8 + Math.random() * 2, 5.5, 0, 0, Math.PI * 2);
        x.fill();
        x.strokeStyle = 'rgba(20,14,10,.35)';
        x.stroke();
      }
    }
    return c;
  }
  function texPlaster(r, g, b) {
    const { c, x } = cvs(256, 256);
    x.fillStyle = `rgb(${r},${g},${b})`;
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    x.fillStyle = 'rgba(255,255,255,.08)';
    x.fillRect(0, 0, 256, 8);
    x.fillStyle = 'rgba(0,0,0,.12)';
    x.fillRect(0, 248, 256, 8);
    return c;
  }
  function texRoof() {
    const { c, x } = cvs(256, 256);
    x.fillStyle = '#7a2816';
    x.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) {
      x.fillStyle = y % 16 ? '#9a3418' : '#6a1e10';
      x.fillRect(0, y, 256, 6);
      x.fillStyle = 'rgba(20,6,2,.25)';
      for (let px = (y / 8) % 2 ? 9 : 0; px < 256; px += 18) x.fillRect(px, y, 1, 6);
    }
    return c;
  }
  function texBrick() {
    const { c, x } = cvs(256, 256);
    x.fillStyle = '#3a2a24';
    x.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 12) {
      const off = (y / 12) % 2 ? 14 : 0;
      for (let px = -14; px < 256; px += 28) {
        x.fillStyle = `rgb(${90 + Math.random() * 40},${42 + Math.random() * 18},${32 + Math.random() * 12})`;
        x.fillRect(px + off + 1, y + 1, 25, 10);
      }
    }
    return c;
  }
  function texSky() {
    const { c, x } = cvs(8, 512);
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#1a141c');
    g.addColorStop(0.42, '#24160f');
    g.addColorStop(0.72, '#3a1c12');
    g.addColorStop(1, '#120c09');
    x.fillStyle = g;
    x.fillRect(0, 0, 8, 512);
    return c;
  }

  function gableRoof(w, d, h) {
    const geo = new THREE.BufferGeometry();
    const hw = w / 2,
      hd = d / 2;
    const pos = new Float32Array([
      -hw,
      0,
      -hd,
      hw,
      0,
      -hd,
      0,
      h,
      -hd,
      -hw,
      0,
      hd,
      0,
      h,
      hd,
      hw,
      0,
      hd,
      -hw,
      0,
      -hd,
      -hw,
      0,
      hd,
      0,
      h,
      hd,
      0,
      h,
      -hd,
      hw,
      0,
      -hd,
      0,
      h,
      -hd,
      0,
      h,
      hd,
      hw,
      0,
      hd,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8, 6, 8, 9, 10, 11, 12, 10, 12, 13]);
    geo.computeVertexNormals();
    return geo;
  }

  function windows(group, w, h, z, rows, cols, mat) {
    const gw = w / (cols + 1);
    const gh = h / (rows + 1.2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.18) continue;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(gw * 0.32, gh * 0.42), mat);
        m.position.set(-w / 2 + gw * (c + 1), 0.45 + gh * (r + 0.55), z + 0.02);
        group.add(m);
      }
    }
  }

  let roofTex;
  function house(x, z, rot, w, d, stories, plaster) {
    const g = new THREE.Group();
    const h = 1.05 + stories * 1.05;
    const wall = new THREE.MeshStandardMaterial({
      map: tx(plaster, { repeat: [1.4, stories] }),
      roughness: 0.92,
      metalness: 0.02,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const roofMat = new THREE.MeshStandardMaterial({
      map: roofTex,
      roughness: 0.78,
      metalness: 0.04,
      color: 0xc44520,
    });
    const roof = new THREE.Mesh(gableRoof(w + 0.18, d + 0.18, 0.85 + stories * 0.12), roofMat);
    roof.position.y = h;
    roof.castShadow = true;
    g.add(roof);
    const lit = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.82 });
    const dark = new THREE.MeshBasicMaterial({ color: 0x1a100c, transparent: true, opacity: 0.7 });
    windows(g, w, h, d / 2, stories, Math.max(2, Math.round(w)), Math.random() > 0.35 ? lit : dark);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    return g;
  }

  function rowHouses(parent, axis, start, step, count, zOrX, toward, plasterFns) {
    for (let i = 0; i < count; i++) {
      const w = 1.35 + Math.random() * 0.7;
      const d = 1.7 + Math.random() * 0.5;
      const stories = 1 + (Math.random() > 0.35 ? 1 : 0) + (Math.random() > 0.82 ? 1 : 0);
      const plaster = plasterFns[i % plasterFns.length];
      let x, z, rot;
      if (axis === 'x') {
        x = start + i * step;
        z = zOrX;
        rot = toward;
      } else {
        z = start + i * step;
        x = zOrX;
        rot = toward;
      }
      parent.add(house(x, z, rot, w, d, stories, plaster));
    }
  }

  function basilica(parent, plaster, roofC, brickC) {
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({
      map: tx(plaster, { repeat: [2.4, 2] }),
      roughness: 0.9,
      color: 0xc8b49a,
    });
    const nave = new THREE.Mesh(new THREE.BoxGeometry(5.6, 5.2, 12.4), stone);
    nave.position.set(0, 2.6, -14.6);
    nave.castShadow = true;
    g.add(nave);
    const roofMat = new THREE.MeshStandardMaterial({
      map: tx(roofC, { repeat: [3, 2] }),
      roughness: 0.76,
      color: 0xa83218,
    });
    const roof = new THREE.Mesh(gableRoof(6.2, 13, 2.1), roofMat);
    roof.position.set(0, 5.2, -14.6);
    g.add(roof);
    const brick = new THREE.MeshStandardMaterial({
      map: tx(brickC, { repeat: [1.2, 3] }),
      roughness: 0.88,
      color: 0x8a5a44,
    });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9.6, 2.2), brick);
    tower.position.set(0, 4.8, -8.6);
    tower.castShadow = true;
    g.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3.4, 4), roofMat);
    spire.position.set(0, 11.4, -8.6);
    spire.rotation.y = Math.PI / 4;
    g.add(spire);
    const gold = new THREE.MeshStandardMaterial({
      color: 0xc9a24a,
      metalness: 0.7,
      roughness: 0.32,
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), gold);
    ball.position.set(0, 13.2, -8.6);
    g.add(ball);
    const glass = new THREE.MeshBasicMaterial({
      color: 0xffb060,
      transparent: true,
      opacity: 0.55,
    });
    const rose = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), glass);
    rose.position.set(0, 4.6, -8.48);
    g.add(rose);
    parent.add(g);
  }

  function townHall(parent, plaster, roofC) {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({
      map: tx(plaster, { repeat: [1.6, 1.4] }),
      roughness: 0.86,
      color: 0xd2c0a4,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.6, 2.6), wall);
    body.position.y = 1.8;
    body.castShadow = true;
    g.add(body);
    const roofMat = new THREE.MeshStandardMaterial({
      map: tx(roofC, { repeat: [2, 1] }),
      roughness: 0.74,
      color: 0xb83a18,
    });
    const roof = new THREE.Mesh(gableRoof(4.8, 3.0, 1.6), roofMat);
    roof.position.y = 3.6;
    g.add(roof);
    const dark = new THREE.MeshBasicMaterial({ color: 0x140c08 });
    for (let i = -1; i <= 1; i++) {
      const arch = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.15), dark);
      arch.position.set(i * 1.15, 0.95, 1.32);
      g.add(arch);
    }
    const gold = new THREE.MeshStandardMaterial({
      color: 0xc9a24a,
      metalness: 0.65,
      roughness: 0.4,
    });
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), gold);
    ridge.position.set(0, 5.5, 0);
    g.add(ridge);
    g.position.set(0, 0, -1.2);
    parent.add(g);
  }

  function walls(parent, brickC) {
    const brick = new THREE.MeshStandardMaterial({
      map: tx(brickC, { repeat: [8, 1.4] }),
      roughness: 0.92,
      color: 0x6a4a3a,
    });
    const west = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.2, 38), brick);
    west.position.set(-16.4, 1.6, -6);
    parent.add(west);
    const east = west.clone();
    east.position.x = 16.4;
    parent.add(east);
    const bast = new THREE.MeshStandardMaterial({
      map: tx(brickC, { repeat: [2, 2] }),
      roughness: 0.9,
      color: 0x5a3a2e,
    });
    [
      [-16.4, -22],
      [16.4, -22],
      [-16.4, 10],
      [16.4, 10],
    ].forEach((p) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 4.4, 8), bast);
      b.position.set(p[0], 2.2, p[1]);
      parent.add(b);
    });
  }

  function lantern(parent, x, z) {
    const g = new THREE.Group();
    const iron = new THREE.MeshStandardMaterial({
      color: 0x1a140e,
      roughness: 0.5,
      metalness: 0.4,
    });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.4, 8), iron);
    pole.position.y = 1.2;
    g.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.38, 0.28),
      new THREE.MeshBasicMaterial({ color: 0xffc070 })
    );
    lamp.position.y = 2.5;
    g.add(lamp);
    const light = new THREE.PointLight(0xffb060, 1.15, 7.5, 2);
    light.position.y = 2.5;
    g.add(light);
    lanterns.push(light);
    g.position.set(x, 0, z);
    parent.add(g);
  }

  function wordmark(parent) {
    const { c, x } = cvs(2048, 320);
    x.clearRect(0, 0, 2048, 320);
    x.font = '600 210px "Cormorant Garamond", Palatino, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#f0e2cc';
    x.fillText('BARDEJOV', 1024, 168);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: t,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.4), mat);
    mesh.position.set(0, 0.04, 6.2);
    mesh.rotation.x = -Math.PI / 2;
    parent.add(mesh);
    wordMesh = mesh;
  }

  function buildTown() {
    town = new THREE.Group();
    scene.add(town);

    const cobble = texCobble();
    const roofC = texRoof();
    roofTex = tx(roofC, { repeat: [2, 1.2] });
    const brickC = texBrick();
    const plasters = [
      texPlaster(214, 196, 168),
      texPlaster(196, 168, 138),
      texPlaster(224, 210, 186),
      texPlaster(186, 154, 122),
      texPlaster(206, 176, 148),
    ];
    setLoad(22);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({
        map: tx(cobble, { repeat: [18, 18], aniso: 16 }),
        roughness: 0.95,
        metalness: 0.02,
        color: 0x6a5c50,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    town.add(floor);

    const plaza = new THREE.Mesh(
      new THREE.PlaneGeometry(12.6, 26),
      new THREE.MeshStandardMaterial({
        map: tx(cobble, { repeat: [4, 8], aniso: 16 }),
        roughness: 0.9,
        color: 0x7a6a58,
      })
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.03, -2);
    plaza.receiveShadow = true;
    town.add(plaza);
    setLoad(38);

    rowHouses(town, 'x', -10.4, 2.05, 11, 12.8, Math.PI, plasters);
    rowHouses(town, 'z', -18.5, 2.35, 12, -12.2, Math.PI / 2, plasters);
    rowHouses(town, 'z', -18.5, 2.35, 12, 12.2, -Math.PI / 2, plasters);
    setLoad(58);

    basilica(town, plasters[2], roofC, brickC);
    townHall(town, plasters[0], roofC);
    walls(town, brickC);
    setLoad(72);

    [
      [-4.8, 8.2],
      [4.8, 8.2],
      [-4.8, 2.2],
      [4.8, 2.2],
      [-4.8, -4.4],
      [4.8, -4.4],
    ].forEach((p) => {
      lantern(town, p[0], p[1]);
    });

    const moonGeo = new THREE.CircleGeometry(2.4, 32);
    moon = new THREE.Mesh(
      moonGeo,
      new THREE.MeshBasicMaterial({ color: 0xe07040, fog: false, toneMapped: false })
    );
    moon.position.set(8.5, 14.5, -28);
    town.add(moon);

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 24),
      new THREE.MeshBasicMaterial({
        color: 0xc44520,
        transparent: true,
        opacity: 0.18,
        fog: false,
        depthWrite: false,
      })
    );
    glow.position.copy(moon.position);
    town.add(glow);

    wordmark(town);

    const hill = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 28),
      new THREE.MeshBasicMaterial({ color: 0x1a1410, fog: true })
    );
    hill.position.set(0, 4, -42);
    town.add(hill);
    setLoad(80);
  }

  function initGL() {
    if (!THREE) throw new Error('three missing');
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !MOBILE,
      alpha: false,
      stencil: false,
      depth: true,
      powerPreference: MOBILE ? 'default' : 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.75));
    renderer.setSize(vpW(), vpH(), false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.shadowMap.enabled = !MOBILE;
    if (!MOBILE) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        document.body.classList.add('no-webgl');
      },
      false
    );

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x120c09);
    scene.fog = new THREE.FogExp2(0x140e0b, 0.036);

    camera = new THREE.PerspectiveCamera(36, vpW() / vpH(), 0.25, 180);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(90, MOBILE ? 16 : 24, MOBILE ? 12 : 16),
      new THREE.MeshBasicMaterial({
        map: tx(texSky(), { wrap: THREE.ClampToEdgeWrapping }),
        side: THREE.BackSide,
        fog: false,
      })
    );
    scene.add(sky);

    scene.add(new THREE.HemisphereLight(0x6a8498, 0x3a2014, 0.55));
    const sun = new THREE.DirectionalLight(0xffd0a8, 0.85);
    sun.position.set(-12, 18, 10);
    sun.castShadow = !MOBILE;
    if (!MOBILE) {
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 60;
      sun.shadow.camera.left = -22;
      sun.shadow.camera.right = 22;
      sun.shadow.camera.top = 18;
      sun.shadow.camera.bottom = -12;
    }
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899aa, 0.22);
    fill.position.set(10, 6, 8);
    scene.add(fill);

    buildTown();
    curveP = new THREE.CatmullRomCurve3(
      CAM.map((c) => new THREE.Vector3(c.p[0], c.p[1], c.p[2])),
      false,
      'catmullrom',
      0.42
    );
    curveT = new THREE.CatmullRomCurve3(
      CAM.map((c) => new THREE.Vector3(c.t[0], c.t[1], c.t[2])),
      false,
      'catmullrom',
      0.42
    );
  }

  let _p, _t;
  function applyCam(u) {
    if (!THREE || !curveP || !camera) return;
    if (!_p) {
      _p = new THREE.Vector3();
      _t = new THREE.Vector3();
    }
    const n = CAM.length - 1;
    const t = clamp(u / n, 0, 1);
    curveP.getPoint(t, _p);
    curveT.getPoint(t, _t);
    _p.x += RIG.mx * 0.55;
    _p.y += RIG.my * 0.25;
    camera.position.copy(_p);
    camera.lookAt(_t);
    const i = clamp(u, 0, n);
    const a = CAM[Math.floor(i)];
    const b = CAM[Math.min(n, Math.ceil(i))];
    camera.fov = lerp(a.fov, b.fov, i - Math.floor(i));
    camera.aspect = vpW() / vpH();
    camera.updateProjectionMatrix();
    if (wordMesh) wordMesh.material.opacity = clamp(1.05 - u * 0.55, 0.08, 0.9);
  }

  initGL();

  return {
    get renderer() {
      return renderer;
    },
    get scene() {
      return scene;
    },
    get camera() {
      return camera;
    },
    get lanterns() {
      return lanterns;
    },
    get moon() {
      return moon;
    },
    get curveP() {
      return curveP;
    },
    get curveT() {
      return curveT;
    },
    applyCam,
  };
}
