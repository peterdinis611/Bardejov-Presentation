import * as THREE from 'three';
import './styles.css';
import { I18N, LANGS } from './lang.js';

/* Bardejov — dusk walk through a live UNESCO square */
(() => {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const root = document.documentElement;
  const nav = $('#nav');
  const preEl = $('#pre');
  const preFill = $('#pre-fill');
  const prePct = $('#pre-pct');
  const preHint = $('#pre-hint');
  const PLACES = {
    square: { lat: 'FORUM', year: '1376', photo: 'assets/square.jpg' },
    hall: { lat: 'CURIA', year: '1505', photo: 'assets/radnica.jpg' },
    basilica: { lat: 'BASILICA', year: '15. st.', photo: 'assets/basilica.jpg' },
    walls: { lat: 'MOENIA', year: '14.–16. st.', photo: 'assets/walls.jpg' },
    synagogue: { lat: 'SYNAGOGA', year: '18. st.', photo: 'assets/synagogue.jpg' },
    mikve: { lat: 'MIQVEH', year: 'suterén', photo: 'assets/synagogue.jpg' },
    midrash: { lat: 'BETH HAMIDRASH', year: '18. st.', photo: 'assets/synagogue.jpg' },
    spa: { lat: 'AQUAE', year: 'pramene', photo: 'assets/spa.jpg' },
  };
  const GUILDS = {
    weavers: { lat: 'TEXTORES', year: '1480', photo: 'assets/houses.jpg' },
    potters: { lat: 'FIGULI', year: 'oltár', photo: 'assets/houses.jpg' },
    tailors: { lat: 'SUTORES', year: '1480', photo: 'assets/radnica.jpg' },
    carpenters: { lat: 'FABRI', year: '1500', photo: 'assets/radnica.jpg' },
    masons: { lat: 'CAEMENTARII', year: '1480', photo: 'assets/walls.jpg' },
    furriers: { lat: 'PELLIONES', year: 'cesta', photo: 'assets/houses.jpg' },
    gold: { lat: 'AURIFABRI', year: 'erb', photo: 'assets/radnica.jpg' },
    sieves: { lat: 'CRIBRARII', year: '1485', photo: 'assets/basilica.jpg' },
    farmers: { lat: 'AGRICOLAE', year: '1480', photo: 'assets/basilica.jpg' },
  };
  const ALTARS = {
    andrew: { lat: 'ANDREAS', year: '1440–1460', photo: 'assets/altars/andrew.jpg' },
    barbara: { lat: 'BARBARA', year: '1450–1470', photo: 'assets/altars/barbara.jpg' },
    elisabeth: { lat: 'ELISABETH', year: '1480', photo: 'assets/altars/elisabeth.jpg' },
    ann: { lat: 'ANNA', year: '1485', photo: 'assets/altars/ann.jpg' },
    mager: { lat: 'VIRGO', year: '1489', photo: 'assets/altars/mager.jpg' },
    cross: { lat: 'CRUX', year: '1480–1490', photo: 'assets/altars/cross.jpg' },
    pieta: { lat: 'PIETAS', year: '1480–1490', photo: 'assets/altars/pieta.jpg' },
    apollonia: { lat: 'APOLLONIA', year: '1485', photo: 'assets/altars/apollonia.jpg' },
    nativity: { lat: 'NATIVITAS', year: '1480–1490', photo: 'assets/altars/nativity.jpg' },
    erasmus: { lat: 'ERASMUS', year: 'cech', photo: 'assets/altars/erasmus.jpg' },
    sorrows: { lat: 'VIR DOLORUM', year: '1500–1510', photo: 'assets/altars/sorrows.jpg' },
  };
  const ERAS = {
    1241: { lat: 'TATARI', year: '1241', photo: 'assets/square.jpg' },
    1365: { lat: 'IUS GLADII', year: '1365', photo: 'assets/radnica.jpg' },
    1376: { lat: 'CIVITAS', year: '1376', photo: 'assets/square.jpg' },
    1505: { lat: 'CURIA', year: '1505', photo: 'assets/radnica.jpg' },
    '18c': { lat: 'SUBURBIUM', year: 'XVIII', photo: 'assets/synagogue.jpg' },
    2000: { lat: 'UNESCO', year: '2000', photo: 'assets/square-wide.jpg' },
  };
  const ITERS = {
    '2h': {
      cap: 'FORUM · 2 HORAE',
      path: 'M298 196 L298 98 L168 98',
      on: ['square', 'hall', 'basilica', 'walls'],
      ids: ['square', 'basilica', 'walls'],
    },
    half: {
      cap: 'MOENIA · DIES MEDIUS',
      path: 'M298 196 L298 98 L168 98 L132 360',
      on: ['square', 'hall', 'basilica', 'walls', 'suburb'],
      ids: ['hall', 'basilica', 'walls', 'synagogue'],
    },
    full: {
      cap: 'AQUAE · DIES TOTUS',
      path: 'M298 196 L298 98 L168 98 L132 360 M298 196 L478 90 L520 64',
      on: ['square', 'hall', 'basilica', 'walls', 'suburb', 'spa'],
      ids: ['hall', 'synagogue', 'square', 'spa'],
    },
  };
  const TOUR_PATH = [
    { at: 0, p: [0.2, 3.5, 8.8], t: [0, 4.2, -8], fov: 38, lat: 'FORUM' },
    { at: 7, p: [-4.8, 2.3, 4.6], t: [0.1, 2.6, -1.1], fov: 44, lat: 'CURIA' },
    { at: 15, p: [1.4, 5.2, 2.4], t: [0, 7.4, -12], fov: 36, lat: 'BASILICA' },
    { at: 23, p: [8.8, 3.8, -1.2], t: [-2, 2.8, -8], fov: 42, lat: 'MOENIA' },
    { at: 32, p: [0.15, 3.55, 8.6], t: [0, 4.4, -9], fov: 38, lat: 'CIVITAS' },
  ];
  let lang = 'sk';
  let iterKey = '2h';
  let sheetId = null;
  let wxSnap = null;
  const TOUR_LEN = 32000;
  const cursor = $('#cursor');
  const grain = $('#grain');

  function vpW() {
    return window.innerWidth;
  }
  function vpH() {
    return window.innerHeight;
  }
  function setVW() {
    root.style.setProperty('--vw', `${vpW()}px`);
  }

  let load = 0;
  function setLoad(n) {
    load = Math.max(load, Math.min(100, n | 0));
    preFill.style.right = `${100 - load}%`;
    prePct.textContent = String(load);
    preEl.style.setProperty('--p', `${load}%`);
    if (preHint) {
      const hints = pack().hints || [];
      const marks = [0, 24, 48, 72, 90];
      let text = hints[0] || '';
      marks.forEach((m, i) => {
        if (load >= m && hints[i]) text = hints[i];
      });
      if (preHint.textContent !== text) preHint.textContent = text;
    }
  }

  function makeGrain() {
    const c = document.createElement('canvas');
    c.width = 180;
    c.height = 180;
    const x = c.getContext('2d');
    const img = x.createImageData(180, 180);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 80 + Math.random() * 140;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grain.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  }

  /* -------------------------------------------------------------- Three.js */
  const canvas = $('#gl');
  let renderer,
    scene,
    camera,
    town,
    lanterns = [];
  let moon, wordMesh;
  let curveP, curveT;
  const RIG = { prog: 0, smooth: 0, mx: 0, my: 0, tmx: 0, tmy: 0, intro: 0 };
  const GWALL = { x: 0, user: 0, primed: false, root: null, track: null, moved: 0, drift: true };
  const ROOD = { x: 0, user: 0, primed: false, root: null, track: null, moved: 0, drift: false };
  const CAM = [
    { p: [0.15, 3.55, 8.6], t: [0.0, 4.4, -9.0], fov: 38 },
    { p: [-3.8, 2.25, 5.2], t: [0.6, 3.2, -3.4], fov: 46 },
    { p: [6.8, 3.05, 1.6], t: [-1.4, 3.0, -8.2], fov: 42 },
    { p: [-0.8, 2.05, -1.2], t: [0.2, 6.2, -14.0], fov: 40 },
    { p: [-7.4, 3.2, 2.8], t: [-1.6, 2.4, -5.2], fov: 44 },
    { p: [0.2, 13.6, 1.2], t: [0.0, 0.4, -8.0], fov: 50 },
    { p: [0.0, 8.6, 4.4], t: [0.0, 3.8, -10.0], fov: 44 },
    { p: [1.6, 11.2, 10.4], t: [0.0, 1.8, -6.0], fov: 48 },
  ];

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
    t.anisotropy = o.aniso || 8;
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

  /* -------------------------------------------------------------- walk: sound, sheet, tour */
  const bus = {
    ctx: null,
    master: null,
    gBell: null,
    gStep: null,
    gWater: null,
    enabled: false,
    nextBell: 0,
    nextStep: 0,
    noise: null,
  };
  let sheetOpen = false,
    touring = false,
    tourT0 = 0,
    lastCaption = '';
  const spoken = new Set();
  const HOT_DEF = [
    { place: 'hall', p: [0, 2.7, 0.15] },
    { place: 'basilica', p: [0, 9.6, -8.5] },
    { place: 'walls', p: [-10.2, 2.6, 6.4] },
  ];
  let hotVecs = [];
  let _look, _hp;

  function pack() {
    const all = I18N || {};
    return (
      all[lang] ||
      all.sk || {
        ui: {},
        cat: {},
        voice: {},
        tour: [],
        hints: [],
        iters: {},
        wx: {},
        hours: {},
        meta: {},
      }
    );
  }
  function fallbackPack() {
    return I18N?.sk || pack();
  }
  function ui(key) {
    const a = pack().ui || {};
    const b = fallbackPack().ui || {};
    return a[key] != null ? a[key] : b[key] || '';
  }
  function fmt(s, data) {
    if (!s) return '';
    return String(s).replace(/\{(\w+)\}/g, (_, k) => (data[k] != null ? data[k] : ''));
  }
  function locale() {
    const list = LANGS || [];
    const found = list.find((l) => l.id === lang);
    return found?.locale || 'sk-SK';
  }
  function catalog(id) {
    const base = PLACES[id] || GUILDS[id] || ALTARS[id] || ERAS[id];
    if (!base) return null;
    const extra = pack().cat?.[id] || fallbackPack().cat?.[id] || {};
    return Object.assign({}, base, extra);
  }
  function tourStep(i) {
    const base = TOUR_PATH[i] || {};
    const extra = pack().tour?.[i] || fallbackPack().tour?.[i] || {};
    return Object.assign({}, base, extra);
  }
  function iterData(key) {
    const base = ITERS[key] || ITERS['2h'];
    const rows = pack().iters?.[key] || fallbackPack().iters?.[key] || [];
    return Object.assign({}, base, {
      stops: rows.map((s, i) => [s[0], s[1], base.ids[i]]),
    });
  }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  }

  function audioInit() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    bus.ctx = new AC();
    bus.master = bus.ctx.createGain();
    bus.master.gain.value = 0;
    bus.master.connect(bus.ctx.destination);
    bus.gBell = bus.ctx.createGain();
    bus.gBell.gain.value = 0;
    bus.gBell.connect(bus.master);
    bus.gStep = bus.ctx.createGain();
    bus.gStep.gain.value = 0;
    bus.gStep.connect(bus.master);
    bus.gWater = bus.ctx.createGain();
    bus.gWater.gain.value = 0;
    bus.gWater.connect(bus.master);
    const len = bus.ctx.sampleRate * 2;
    const buf = bus.ctx.createBuffer(1, len, bus.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    bus.noise = buf;
    const src = bus.ctx.createBufferSource();
    src.buffer = bus.noise;
    src.loop = true;
    const lp = bus.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 640;
    const hp = bus.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 160;
    src.connect(hp);
    hp.connect(lp);
    lp.connect(bus.gWater);
    src.start();
  }
  function strikeBell(freq, gain) {
    if (!bus.ctx || !bus.enabled) return;
    const now = bus.ctx.currentTime;
    const freqs = [freq, freq * 2.01, freq * 2.99, freq * 4.18, freq * 5.4];
    const amps = [1, 0.42, 0.2, 0.11, 0.07];
    freqs.forEach((f, i) => {
      const o = bus.ctx.createOscillator();
      const g = bus.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(Math.max(0.0001, gain * amps[i]), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 4.4);
      o.connect(g);
      g.connect(bus.gBell);
      o.start(now);
      o.stop(now + 4.5);
    });
  }
  function footstep() {
    if (!bus.ctx || !bus.enabled || !bus.noise) return;
    const now = bus.ctx.currentTime;
    const src = bus.ctx.createBufferSource();
    src.buffer = bus.noise;
    const bp = bus.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 240 + Math.random() * 180;
    bp.Q.value = 1.6;
    const g = bus.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    src.connect(bp);
    bp.connect(g);
    g.connect(bus.gStep);
    src.start(now);
    src.stop(now + 0.18);
  }
  function setSound(on) {
    const btn = $('#snd');
    if (on) {
      if (!bus.ctx) audioInit();
      if (!bus.ctx) return;
      bus.ctx.resume();
      bus.enabled = true;
      bus.master.gain.cancelScheduledValues(bus.ctx.currentTime);
      bus.master.gain.linearRampToValueAtTime(0.4, bus.ctx.currentTime + 0.45);
      document.documentElement.classList.add('is-sound');
      if (btn) {
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', ui('soundOff'));
      }
      strikeBell(196, 0.26);
      speakFor(activeSec, true);
    } else {
      bus.enabled = false;
      if (bus.ctx) {
        bus.master.gain.cancelScheduledValues(bus.ctx.currentTime);
        bus.master.gain.linearRampToValueAtTime(0, bus.ctx.currentTime + 0.28);
      }
      document.documentElement.classList.remove('is-sound');
      if (btn) {
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', ui('soundOn'));
      }
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
  function tickAudio(now, prog) {
    if (!bus.enabled || !bus.ctx) return;
    const t = bus.ctx.currentTime;
    let bells = 0,
      steps = 0,
      water = 0;
    if (touring) bells = 0.8;
    else {
      bells = clamp(1.05 - Math.abs(prog - 0.55) * 0.7, 0, 0.85);
      if (prog > 1.8) bells *= clamp(1 - (prog - 1.8) * 0.8, 0, 1);
      steps = prog > 0.15 && prog < 4.1 ? 0.5 : 0.12;
      water = clamp((prog - 4.6) / 1.1, 0, 0.62);
    }
    bus.gBell.gain.setTargetAtTime(bells, t, 0.45);
    bus.gStep.gain.setTargetAtTime(steps, t, 0.4);
    bus.gWater.gain.setTargetAtTime(water, t, 0.55);
    if (bells > 0.12 && now > bus.nextBell) {
      strikeBell(178 + Math.random() * 36, 0.16 + Math.random() * 0.08);
      bus.nextBell = now + 7800 + Math.random() * 7200;
    }
    if (steps > 0.2 && now > bus.nextStep) {
      footstep();
      bus.nextStep = now + 580 + Math.random() * 460;
    }
  }
  function speakFor(sec, force) {
    if (!bus.enabled || REDUCE || !window.speechSynthesis) return;
    const id = SECS[sec]?.id || 'top';
    const text = pack().voice?.[id] || fallbackPack().voice?.[id];
    if (!text || (!force && spoken.has(id))) return;
    spoken.add(id);
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = locale();
      u.rate = 0.9;
      u.pitch = 0.86;
      u.volume = 0.68;
      const voices = window.speechSynthesis.getVoices();
      const prefix = locale().slice(0, 2).toLowerCase();
      const match =
        voices.find((v) =>
          (v.lang || '').toLowerCase().replace('_', '-').startsWith(locale().toLowerCase())
        ) || voices.find((v) => (v.lang || '').toLowerCase().startsWith(prefix));
      if (match) u.voice = match;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function openSheet(id, compact) {
    const d = catalog(id);
    if (!d) return;
    sheetId = id;
    const sheet = $('#sheet');
    const img = $('#sheet-img');
    img.src = d.photo || 'assets/square.jpg';
    img.alt = d.title;
    $('#sheet-lat').textContent = d.lat || '';
    $('#sheet-yr').textContent = d.year || '';
    $('#sheet-title').textContent = d.title;
    $('#sheet-lead').textContent = d.lead || '';
    $('#sheet-copy').textContent = d.body || '';
    $('#sheet-mins').textContent = d.mins || '';
    $('#sheet-how').textContent = d.how || '';
    sheet.classList.toggle('compact', !!compact);
    sheet.classList.add('on');
    sheet.setAttribute('aria-hidden', 'false');
    sheetOpen = true;
    document.documentElement.classList.add('is-sheet');
  }
  function closeSheet() {
    const sheet = $('#sheet');
    if (!sheet) return;
    sheet.classList.remove('on');
    sheet.setAttribute('aria-hidden', 'true');
    sheetOpen = false;
    sheetId = null;
    document.documentElement.classList.remove('is-sheet');
  }

  function startTour() {
    if (touring) return;
    if (!renderer || REDUCE || document.body.classList.contains('no-webgl')) {
      openSheet('square');
      return;
    }
    closeSheet();
    touring = true;
    tourT0 = performance.now();
    lastCaption = '';
    $('#tour').hidden = false;
    document.documentElement.classList.add('is-tour');
    if (bus.enabled) strikeBell(196, 0.24);
  }
  function endTour() {
    touring = false;
    $('#tour').hidden = true;
    document.documentElement.classList.remove('is-tour');
    const fill = $('#tour-fill');
    if (fill) fill.style.width = '0%';
  }
  function tickTour(now) {
    if (!touring || !camera) return false;
    if (!_look) _look = new THREE.Vector3();
    const elapsed = now - tourT0;
    const u = clamp(elapsed / TOUR_LEN, 0, 1);
    const fill = $('#tour-fill');
    if (fill) fill.style.width = `${u * 100}%`;
    let a = tourStep(0),
      b = tourStep(TOUR_PATH.length - 1);
    for (let i = 0; i < TOUR_PATH.length - 1; i++) {
      if (elapsed <= TOUR_PATH[i + 1].at * 1000) {
        a = tourStep(i);
        b = tourStep(i + 1);
        break;
      }
    }
    const span = Math.max(1, (b.at - a.at) * 1000);
    const t = easeInOut(clamp((elapsed - a.at * 1000) / span, 0, 1));
    camera.position.set(lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t), lerp(a.p[2], b.p[2], t));
    _look.set(lerp(a.t[0], b.t[0], t), lerp(a.t[1], b.t[1], t), lerp(a.t[2], b.t[2], t));
    camera.lookAt(_look);
    camera.fov = lerp(a.fov, b.fov, t);
    camera.aspect = vpW() / vpH();
    camera.updateProjectionMatrix();
    if (a.title !== lastCaption) {
      lastCaption = a.title;
      $('#tour-lat').textContent = a.lat;
      $('#tour-title').textContent = a.title;
      $('#tour-k').textContent = a.k;
    }
    if (u >= 1) endTour();
    return true;
  }

  function initHots() {
    if (!THREE) return;
    hotVecs = HOT_DEF.map((h) => ({
      place: h.place,
      v: new THREE.Vector3(h.p[0], h.p[1], h.p[2]),
      el: $(`.hot[data-place="${h.place}"]`),
    })).filter((h) => h.el);
  }
  function updateHots() {
    const wrap = $('#hots');
    if (!wrap || !camera || !hotVecs.length) return;
    if (!_hp) _hp = new THREE.Vector3();
    const show =
      !touring && !sheetOpen && RIG.smooth < 1.65 && !document.body.classList.contains('no-webgl');
    wrap.classList.toggle('show', show);
    hotVecs.forEach((h) => {
      _hp.copy(h.v).project(camera);
      const x = (_hp.x * 0.5 + 0.5) * vpW();
      const y = (-_hp.y * 0.5 + 0.5) * vpH();
      const vis =
        show && _hp.z > -1 && _hp.z < 1 && x > 48 && x < vpW() - 48 && y > 90 && y < vpH() - 90;
      h.el.style.left = `${x}px`;
      h.el.style.top = `${y}px`;
      h.el.style.opacity = vis ? '1' : '0';
      h.el.style.pointerEvents = vis ? 'auto' : 'none';
    });
  }

  function hoursToday() {
    const h = pack().hours || fallbackPack().hours || {};
    const d = new Date();
    const day = d.getDay();
    const summer = d.getMonth() >= 4 && d.getMonth() <= 8;
    let bas = h.basWeek || '',
      basUntil = '16:00';
    if (day === 0) {
      bas = h.basSun || '';
      basUntil = '14:30';
    } else if (day === 6) {
      bas = h.basSat || '';
      basUntil = '15:00';
    }
    let hall = summer ? h.hallSummer || '' : h.hallWinter || '';
    const hallUntil = day === 1 ? '' : summer ? '16:30' : '16:00';
    if (day === 1) hall = h.hallMon || '';
    return { bas: bas + (h.basNote || ''), hall: hall, basUntil, hallUntil };
  }
  function wxWord(code) {
    const w = pack().wx || fallbackPack().wx || {};
    if (code === 0) return w['0'];
    if (code <= 3) return w['3'];
    if (code <= 48) return w['48'];
    if (code <= 57) return w['57'];
    if (code <= 67) return w['67'];
    if (code <= 77) return w['77'];
    if (code <= 82) return w['82'];
    return w['99'];
  }
  function setWxLine(text) {
    $$('[data-wx]').forEach((el) => {
      el.textContent = text;
    });
  }
  function paintHoursAndWx() {
    const hrs = hoursToday();
    const hallEl = $('#hrs-hall');
    const basEl = $('#hrs-bas');
    if (hallEl) hallEl.textContent = hrs.hall;
    if (basEl) basEl.textContent = hrs.bas;
    const wx = pack().wx || {};
    const basBit = hrs.basUntil ? fmt(wx.basOpen, { t: hrs.basUntil }) : wx.basLiturgy || '';
    const hallBit = hrs.hallUntil ? fmt(wx.hallUntil, { t: hrs.hallUntil }) : wx.hallClosed || '';
    if (wxSnap)
      setWxLine(fmt(wx.today, { t: wxSnap.t, w: wxWord(wxSnap.code), bas: basBit, hall: hallBit }));
    else setWxLine(fmt(wx.dusk, { bas: basBit, hall: hallBit }) || ui('wxFallback'));
  }
  function loadWeather() {
    paintHoursAndWx();
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=49.2944&longitude=21.2758&current=temperature_2m,weather_code&timezone=Europe%2FBratislava'
    )
      .then((r) => r.json())
      .then((j) => {
        wxSnap = { t: Math.round(j.current.temperature_2m), code: j.current.weather_code };
        paintHoursAndWx();
      })
      .catch(() => {
        wxSnap = null;
        paintHoursAndWx();
      });
  }

  function setIter(key) {
    iterKey = key;
    const data = iterData(key);
    const path = $('#plan-path');
    const cap = $('#plan-cap');
    const list = $('#stops');
    if (path) path.setAttribute('d', data.path);
    if (cap) cap.textContent = data.cap;
    $$('#plan [data-stop]').forEach((g) => {
      g.classList.toggle('is-off', data.on.indexOf(g.getAttribute('data-stop')) === -1);
    });
    if (list) {
      list.innerHTML = data.stops
        .map(
          (s) =>
            `<li${s[2] ? ` data-place="${s[2]}" data-cursor` : ''}><div><b>${s[0]}</b><span>${s[1]}</span></div></li>`
        )
        .join('');
      $$('#stops [data-place]').forEach((el) => {
        el.addEventListener('click', () => openSheet(el.getAttribute('data-place')));
      });
    }
    $$('.itab').forEach((b) => {
      const on = b.getAttribute('data-iter') === key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function navIndex(sec) {
    const id = SECS[sec]?.id;
    if (id === 'gate') return 0;
    if (id === 'pathways') return 1;
    if (id === 'lessons') return 2;
    if (id === 'suburb') return 3;
    if (id === 'walk' || id === 'eternity') return 4;
    return -1;
  }

  function initGL() {
    if (!THREE) throw new Error('three missing');
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(vpW(), vpH(), false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x120c09);
    scene.fog = new THREE.FogExp2(0x140e0b, 0.036);

    camera = new THREE.PerspectiveCamera(36, vpW() / vpH(), 0.25, 180);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(90, 24, 16),
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
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -12;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899aa, 0.22);
    fill.position.set(10, 6, 8);
    scene.add(fill);

    buildTown();
    initHots();
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

  const _p = new THREE.Vector3(),
    _t = new THREE.Vector3();
  function applyCam(u) {
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

  /* -------------------------------------------------------------- page */
  const SECS = $$('[data-cam]');
  let anchors = [],
    maxScroll = 1,
    activeSec = 0,
    lastY = 0;

  function measure() {
    setVW();
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vpH());
    anchors = SECS.map((el, i) => {
      if (i === 0) return 0;
      if (i === SECS.length - 1) return maxScroll;
      return clamp(el.offsetTop + el.offsetHeight * 0.22 - vpH() * 0.22, 0, maxScroll);
    });
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  }
  function progressFor(y) {
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++)
      if (y <= anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }

  function resetWordReveal() {
    $$('.word-reveal').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const phrase = (key ? ui(key) : '') || el.getAttribute('aria-label') || '';
      delete el.dataset.wordReady;
      el.classList.remove('word-reveal');
      el.removeAttribute('aria-label');
      el.textContent = phrase;
    });
  }
  function applyI18n() {
    const shown = $$('.rv-in');
    resetWordReveal();
    $$('[data-i18n]').forEach((el) => {
      const v = ui(el.getAttribute('data-i18n'));
      if (!v) return;
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, v);
      else el.textContent = v;
    });
    const metaPack = pack().meta || fallbackPack().meta || {};
    if (metaPack.title) document.title = metaPack.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && metaPack.description) desc.setAttribute('content', metaPack.description);
    const spec = (LANGS || []).find((l) => l.id === lang);
    document.documentElement.lang = spec?.html || lang;
    const now = $('#lingua-now');
    if (now) now.textContent = spec?.label || (lang || 'sk').toUpperCase();
    const flag = $('#lingua-flag');
    if (flag) flag.className = `flag flag-${lang}`;
    $$('#lingua-list [data-lang]').forEach((el) => {
      el.setAttribute('aria-selected', el.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    const lingua = $('#lingua');
    const linguaBtn = $('#lingua-btn');
    if (lingua) lingua.setAttribute('aria-label', ui('lingua'));
    if (linguaBtn) {
      const nm = spec?.name || '';
      linguaBtn.setAttribute('aria-label', ui('lingua') + (nm ? ` — ${nm}` : ''));
    }
    const snd = $('#snd');
    if (snd) snd.setAttribute('aria-label', bus.enabled ? ui('soundOff') : ui('soundOn'));
    const burger = $('.nav-burger');
    if (burger) burger.setAttribute('aria-label', ui('menu'));
    const peek = $('#tour-btn');
    if (peek) peek.setAttribute('aria-label', ui('peekAria'));
    const prev = $('#tape-prev');
    if (prev) prev.setAttribute('aria-label', ui('tapePrev'));
    const next = $('#tape-next');
    if (next) next.setAttribute('aria-label', ui('tapeNext'));
    const close = $('.sheet-x');
    if (close) close.setAttribute('aria-label', ui('sheetClose'));
    $$('#rail button').forEach((b, i) => {
      b.setAttribute('aria-label', `${ui('chapter')} ${i}`);
    });
    const guildKeys = {
      weavers: 'gWeavers',
      potters: 'gPotters',
      tailors: 'gTailors',
      carpenters: 'gCarp',
      masons: 'gMasons',
      furriers: 'gFur',
      gold: 'gGold',
      sieves: 'gSieves',
      farmers: 'gFarm',
    };
    $$('[data-guild]').forEach((el) => {
      const k = guildKeys[el.getAttribute('data-guild')];
      if (k) el.setAttribute('aria-label', `${ui(k)} — ${ui('gldOpen')}`);
    });
    $$('[data-i18n-ext]').forEach((a) => {
      const name = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (name) a.setAttribute('aria-label', `${name} — ${ui('extNew')}`);
    });
    const SITE = 'https://peterdinis611.github.io/Bardejov-Presentation/';
    const ogLoc = { sk: 'sk_SK', cs: 'cs_CZ', en: 'en_GB', pl: 'pl_PL', hu: 'hu_HU', uk: 'uk_UA' };
    const og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute('content', ogLoc[lang] || 'sk_SK');
    const ogt = document.querySelector('meta[property="og:title"]');
    if (ogt && metaPack.title) ogt.setAttribute('content', metaPack.title);
    const ogd = document.querySelector('meta[property="og:description"]');
    if (ogd && metaPack.description) ogd.setAttribute('content', metaPack.description);
    const ogu = document.querySelector('meta[property="og:url"]');
    if (ogu) ogu.setAttribute('content', SITE + (lang === 'sk' ? '' : `?lang=${lang}`));
    const twt = document.querySelector('meta[name="twitter:title"]');
    if (twt && metaPack.title) twt.setAttribute('content', metaPack.title);
    const twd = document.querySelector('meta[name="twitter:description"]');
    if (twd && metaPack.description) twd.setAttribute('content', metaPack.description);
    splitHeadingWords();
    shown.forEach((el) => {
      if (el.isConnected) el.classList.add('rv-in');
    });
    $$('#hero .mask-line, #hero [data-rv]').forEach((el) => {
      el.classList.add('rv-in');
    });
    $$('.word-reveal.rv-in .word').forEach((w) => {
      w.style.transition = 'none';
    });
  }
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && I18N?.[q]) return q;
    try {
      const saved = localStorage.getItem('bv-lang');
      if (saved && I18N?.[saved]) return saved;
    } catch {}
    const n = (navigator.language || 'sk').toLowerCase();
    if (n.startsWith('cs')) return 'cs';
    if (n.startsWith('en')) return 'en';
    if (n.startsWith('pl')) return 'pl';
    if (n.startsWith('hu')) return 'hu';
    if (n.startsWith('uk')) return 'uk';
    return 'sk';
  }
  function setLang(id) {
    if (!I18N?.[id]) return;
    lang = id;
    try {
      localStorage.setItem('bv-lang', id);
    } catch {}
    spoken.clear();
    applyI18n();
    paintHoursAndWx();
    setIter(iterKey);
    if (sheetOpen && sheetId) openSheet(sheetId, $('#sheet')?.classList.contains('compact'));
    if (touring) lastCaption = '';
  }
  function setLinguaOpen(open) {
    const box = $('#lingua');
    const btn = $('#lingua-btn');
    if (!box || !btn) return;
    box.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      const sel = $('#lingua-list [aria-selected="true"]');
      if (sel) sel.focus();
    }
  }
  function wireLang() {
    lang = detectLang();
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q && I18N?.[q]) localStorage.setItem('bv-lang', q);
    } catch {}
    applyI18n();
    const box = $('#lingua');
    const btn = $('#lingua-btn');
    if (!box || !btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLinguaOpen(!box.classList.contains('open'));
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setLinguaOpen(true);
      }
    });
    $$('#lingua-list [data-lang]').forEach((el) => {
      el.addEventListener('click', () => {
        setLang(el.getAttribute('data-lang'));
        setLinguaOpen(false);
        btn.focus();
      });
      el.addEventListener('keydown', (e) => {
        const opts = $$('#lingua-list [data-lang]');
        const i = opts.indexOf(el);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          opts[(i + 1) % opts.length].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          opts[(i - 1 + opts.length) % opts.length].focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          opts[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          opts[opts.length - 1].focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setLinguaOpen(false);
          btn.focus();
        } else if (e.key === 'Tab') {
          setLinguaOpen(false);
        }
      });
    });
    document.addEventListener('click', (e) => {
      if (!box.contains(e.target)) setLinguaOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && box.classList.contains('open')) {
        setLinguaOpen(false);
        btn.focus();
      }
    });
  }

  function splitHeadingWords() {
    if (REDUCE) return;
    $$('h1.display, h2.display').forEach((heading) => {
      const lines = heading.querySelectorAll('.mask-line');
      const targets = lines.length ? [].slice.call(lines) : [heading];
      targets.forEach((target) => {
        if (target.dataset.wordReady === 'true') return;
        const phrase = target.textContent.replace(/\s+/g, ' ').trim();
        if (!phrase) return;
        target.dataset.wordReady = 'true';
        target.classList.add('word-reveal');
        target.setAttribute('aria-label', phrase);
        target.textContent = '';
        phrase.split(' ').forEach((word, i) => {
          if (i) target.appendChild(document.createTextNode(' '));
          const mask = document.createElement('span');
          const inner = document.createElement('span');
          mask.className = 'word-mask';
          mask.setAttribute('aria-hidden', 'true');
          inner.className = 'word';
          inner.textContent = word;
          inner.style.setProperty('--word-delay', `${i * 72}ms`);
          mask.appendChild(inner);
          target.appendChild(mask);
        });
      });
    });
  }

  function wireReveals() {
    splitHeadingWords();
    const items = $$('[data-rv], .mask-line');
    items.forEach((el, i) => {
      el.dataset.rvd = String((i % 6) * 70);
    });
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const d = parseFloat(e.target.dataset.rvd || 0);
          setTimeout(() => e.target.classList.add('rv-in'), REDUCE ? 0 : d);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.04 }
    );
    items.forEach((el) => {
      if (!el.closest('#hero')) io.observe(el);
    });
    requestAnimationFrame(() => {
      $$('#hero [data-rv], #hero .mask-line').forEach((el) => {
        el.classList.add('rv-in');
      });
    });
  }

  function wireForeground() {
    const pairs = $$('.sec .fg, .foot .fg')
      .map((stage) => ({
        section: stage.closest('.sec, .foot'),
        stage,
      }))
      .filter((p) => p.section);
    const sky = $('#fg-sky');
    if (!pairs.length || !sky) return;
    const homes = new WeakMap(pairs.map((p) => [p.stage, p.section]));
    let active = null;
    const lift = (stage) => {
      if (stage.parentNode !== sky) sky.appendChild(stage);
    };
    const park = (stage) => {
      const home = homes.get(stage);
      if (home && stage.parentNode !== home) home.insertBefore(stage, home.firstChild);
    };
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          const pair = pairs.find((p) => p.section === e.target);
          if (!pair) return;
          if (e.isIntersecting && e.intersectionRatio > 0.28) {
            if (active && active !== pair.stage) {
              active.classList.remove('fg-active');
              active.classList.add('fg-retiring');
              const old = active;
              setTimeout(() => {
                old.classList.remove('fg-retiring');
                park(old);
              }, 900);
            }
            lift(pair.stage);
            pair.stage.classList.add('fg-active');
            pair.stage.classList.remove('fg-retiring');
            active = pair.stage;
          }
        });
      },
      { threshold: [0.28, 0.5] }
    );
    pairs.forEach((p) => {
      io.observe(p.section);
    });
  }

  function wireRail() {
    const rail = $('#rail');
    SECS.forEach((el, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<i></i>';
      b.setAttribute('aria-label', `${ui('chapter')} ${i}`);
      b.addEventListener('click', () =>
        el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' })
      );
      rail.appendChild(b);
    });
  }

  function wireNav() {
    const burger = $('.nav-burger');
    const links = $('#navlinks');
    burger.addEventListener('click', () => {
      setLinguaOpen(false);
      const open = nav.classList.toggle('menu-open');
      burger.classList.toggle('active', open);
      document.documentElement.classList.toggle('nav-open', open);
    });
    $$('.nav-link', links).forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('menu-open');
        burger.classList.remove('active');
        document.documentElement.classList.remove('nav-open');
      });
    });
    $$('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const map = ['gate', 'pathways', 'lessons', 'eternity'];
        goToId(map[chip.getAttribute('data-chip')]);
      });
    });
  }

  function openLesson(art) {
    if (!art?.classList.contains('les')) return;
    $$('.les').forEach((el) => {
      el.classList.remove('is-open');
      const row = $('.les-row', el);
      if (row) row.setAttribute('aria-expanded', 'false');
    });
    art.classList.add('is-open');
    const btn = $('.les-row', art);
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('menu-open');
    const burger = $('.nav-burger');
    if (burger) burger.classList.remove('active');
    document.documentElement.classList.remove('nav-open');
  }
  function goToId(id, instant) {
    if (!id) return false;
    const el = document.getElementById(id);
    if (!el) return false;
    if (el.classList.contains('les')) openLesson(el);
    el.scrollIntoView({ behavior: instant || REDUCE ? 'auto' : 'smooth', block: 'start' });
    return true;
  }
  function wireAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = (a.getAttribute('href') || '').replace(/^#/, '');
        if (!id) return;
        if (!goToId(id)) return;
        e.preventDefault();
        closeNav();
        try {
          history.replaceState(null, '', `#${id}`);
        } catch {}
      });
    });
  }

  function wireCursor() {
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    window.addEventListener('pointermove', (e) => {
      cursor.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      RIG.tmx = (e.clientX / vpW()) * 2 - 1;
      RIG.tmy = (e.clientY / vpH()) * 2 - 1;
    });
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle(
        'act',
        !!e.target.closest('[data-cursor], a, button, .chip, .les, .card')
      );
    });
  }

  function updateProgress() {
    const y = window.scrollY || 0;
    RIG.prog = progressFor(y);
    const sec = clamp(Math.round(RIG.prog), 0, SECS.length - 1);
    if (sec !== activeSec) {
      activeSec = sec;
      const ni = navIndex(sec);
      $$('.nav-link').forEach((a, i) => {
        a.classList.toggle('on', i === ni);
      });
      $$('.chip').forEach((c, i) => {
        const id = SECS[sec]?.id;
        const on =
          (i === 0 && id === 'gate') ||
          (i === 1 && id === 'pathways') ||
          (i === 2 && id === 'lessons') ||
          (i === 3 && (id === 'walk' || id === 'eternity'));
        c.classList.toggle('on', on);
      });
      $$('#rail button').forEach((b, i) => {
        b.classList.toggle('on', i === sec);
      });
      speakFor(sec);
    }
    nav.classList.toggle('stuck', y > 24);
    return y;
  }
  function onScroll() {
    const y = updateProgress();
    nav.classList.toggle('hide', y > lastY + 8 && y > 120 && !nav.classList.contains('menu-open'));
    if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;
  }

  function wireTape() {
    const tape = $('#tape');
    const prev = $('#tape-prev');
    const next = $('#tape-next');
    if (!tape) return;
    const step = () => Math.max(220, Math.min(tape.clientWidth * 0.72, 340));
    const syncBtns = () => {
      const max = Math.max(0, tape.scrollWidth - tape.clientWidth - 2);
      if (prev) prev.disabled = tape.scrollLeft <= 2;
      if (next) next.disabled = tape.scrollLeft >= max;
    };
    if (prev)
      prev.addEventListener('click', () =>
        tape.scrollBy({ left: -step(), behavior: REDUCE ? 'auto' : 'smooth' })
      );
    if (next)
      next.addEventListener('click', () =>
        tape.scrollBy({ left: step(), behavior: REDUCE ? 'auto' : 'smooth' })
      );
    tape.addEventListener('scroll', syncBtns, { passive: true });
    tape.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) < 1 && Math.abs(e.deltaX) < 1) return;
        const goingH = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        if (goingH) return;
        e.preventDefault();
        tape.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
    let down = false,
      x0 = 0,
      sl = 0,
      moved = 0;
    tape.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true;
      moved = 0;
      x0 = e.clientX;
      sl = tape.scrollLeft;
      tape.classList.add('is-drag');
      try {
        tape.setPointerCapture(e.pointerId);
      } catch {}
    });
    tape.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - x0;
      moved = Math.max(moved, Math.abs(dx));
      tape.scrollLeft = sl - dx;
    });
    const endDrag = () => {
      down = false;
      tape.classList.remove('is-drag');
    };
    tape.addEventListener('pointerup', endDrag);
    tape.addEventListener('pointercancel', endDrag);
    $$('.ann', tape).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (moved > 8) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        openSheet(btn.getAttribute('data-era'), true);
      });
    });
    syncBtns();
    window.addEventListener('resize', syncBtns);
  }

  function stripMax(S) {
    if (!S.root || !S.track) return 0;
    return Math.max(0, S.track.scrollWidth - S.root.clientWidth);
  }

  function viewWalk(el) {
    const rail = el.getBoundingClientRect();
    const vh = vpH();
    if (rail.bottom < -80 || rail.top > vh + 80) return null;
    const start = vh * 0.82;
    const end = vh * 0.18;
    return clamp((start - rail.top) / Math.max(80, start - end), 0, 1);
  }

  function bindStrip(S, root, track) {
    S.root = root;
    S.track = track;
    S.x = 0;
    S.user = 0;
    S.primed = false;
    S.moved = 0;
    if (!root || !track) return;
    root.addEventListener(
      'wheel',
      (e) => {
        if (REDUCE) return;
        if (Math.abs(e.deltaY) < 1 && Math.abs(e.deltaX) < 1) return;
        e.preventDefault();
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const travel = Math.max(stripMax(S), S.drift ? Math.min(220, vpW() * 0.13) : 0);
        S.user = clamp(S.user - d, -travel - 48, travel + 48);
        S.hot = performance.now();
      },
      { passive: false }
    );
    let down = false,
      x0 = 0,
      u0 = 0;
    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true;
      S.moved = 0;
      x0 = e.clientX;
      u0 = S.user;
    });
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - x0;
      S.moved = Math.max(S.moved, Math.abs(dx));
      if (S.moved > 4) {
        S.user = u0 + dx;
        S.hot = performance.now();
      }
    };
    const endDrag = () => {
      down = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  function tickStrip(S) {
    const root = S.root;
    const track = S.track;
    if (!root || !track) return;
    if (REDUCE) {
      track.style.transform = '';
      return;
    }
    const walked = viewWalk(root);
    if (walked == null) return;
    const extra = stripMax(S);
    const travel = extra > 12 ? extra : S.drift ? Math.min(220, Math.max(88, vpW() * 0.13)) : 0;
    if (travel < 8 && !S.drift) return;
    const look = RIG.mx * (extra > 12 ? 22 : 36);
    const walkX = extra > 12 ? lerp(0, -travel, walked) : lerp(travel, -travel, walked);
    const minX = extra > 12 ? -travel : -travel;
    const maxX = extra > 12 ? 0 : travel;
    const aim = clamp(walkX - look + S.user, minX, maxX);
    if (!S.primed) {
      S.x = aim;
      S.primed = true;
    } else {
      const k = performance.now() - (S.hot || 0) < 120 ? 0.32 : 0.1;
      S.x += (aim - S.x) * k;
    }
    track.style.transform = `translate3d(${S.x.toFixed(2)}px,0,0)`;
  }

  function wireStrips() {
    bindStrip(GWALL, $('#gwall'), $('#gwall') && $('.gwall-track', $('#gwall')));
    bindStrip(ROOD, $('#rood'), $('#rood') && $('.rood-track', $('#rood')));
  }

  function tickStrips() {
    tickStrip(GWALL);
    tickStrip(ROOD);
  }

  function wireWalk() {
    const snd = $('#snd');
    if (snd) snd.addEventListener('click', () => setSound(!bus.enabled));
    const tourBtn = $('#tour-btn');
    const tourMob = $('#tour-mob');
    if (tourBtn) tourBtn.addEventListener('click', startTour);
    if (tourMob) tourMob.addEventListener('click', startTour);
    const skip = $('#tour-skip');
    if (skip) skip.addEventListener('click', endTour);
    $$('#hots .hot, .card[data-place], .sub-card[data-place], .gate-stats [data-place]').forEach(
      (el) => {
        const open = () => openSheet(el.getAttribute('data-place'), el.classList.contains('hot'));
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        });
      }
    );
    $$('#plan [data-place]').forEach((el) => {
      el.addEventListener('click', () => openSheet(el.getAttribute('data-place')));
    });
    $$('[data-guild]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (GWALL.moved > 8) {
          e.preventDefault();
          return;
        }
        openSheet(el.getAttribute('data-guild'));
      });
    });
    $$('[data-altar]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (ROOD.moved > 8) {
          e.preventDefault();
          return;
        }
        openSheet(el.getAttribute('data-altar'));
      });
    });
    $$('[data-era]:not(.ann)').forEach((el) => {
      el.addEventListener('click', () => openSheet(el.getAttribute('data-era'), true));
    });
    $$('.itab').forEach((el) => {
      el.addEventListener('click', () => setIter(el.getAttribute('data-iter')));
    });
    $$('#sheet [data-close]').forEach((el) => {
      el.addEventListener('click', closeSheet);
    });
    $$('.les-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const art = btn.closest('.les');
        const open = art.classList.contains('is-open');
        $$('.les').forEach((el) => {
          el.classList.remove('is-open');
          const row = $('.les-row', el);
          if (row) row.setAttribute('aria-expanded', 'false');
        });
        if (!open) {
          art.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (sheetOpen) closeSheet();
      else if (touring) endTour();
    });
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
    wireTape();
    wireStrips();
    const stats = $('.gate-stats');
    if (stats) {
      const io = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            io.unobserve(e.target);
            $$('[data-count]', stats).forEach((el) => {
              const end = parseInt(el.getAttribute('data-count'), 10);
              if (!Number.isFinite(end)) return;
              const startAt = performance.now();
              const dur = 1200;
              const tick = (now) => {
                const t = Math.min(1, (now - startAt) / dur);
                const eased = 1 - (1 - t) ** 3;
                el.textContent = String(Math.round(end * eased));
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = String(end);
              };
              requestAnimationFrame(tick);
            });
          });
        },
        { threshold: 0.45 }
      );
      io.observe(stats);
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    updateProgress();
    RIG.mx += (RIG.tmx - RIG.mx) * 0.06;
    RIG.my += (RIG.tmy - RIG.my) * 0.06;
    RIG.smooth += (RIG.prog - RIG.smooth) * (REDUCE ? 1 : 0.045);
    if (RIG.intro < 1) RIG.intro = Math.min(1, RIG.intro + 0.012);
    tickStrips();
    tickAudio(now, RIG.smooth);
    if (renderer && curveP) {
      if (!tickTour(now)) applyCam(RIG.smooth);
      updateHots();
      lanterns.forEach((l, i) => {
        l.intensity = 0.95 + Math.sin(now * 0.004 + i * 1.7) * 0.18;
      });
      if (moon) moon.position.x = 8.5 + Math.sin(now * 0.00012) * 0.4;
      renderer.render(scene, camera);
    }
  }

  function onResize() {
    measure();
    GWALL.primed = false;
    ROOD.primed = false;
    if (renderer) {
      renderer.setSize(vpW(), vpH(), false);
      camera.aspect = vpW() / vpH();
      camera.updateProjectionMatrix();
    }
  }

  function ready() {
    document.body.classList.remove('is-locked');
    preEl.classList.add('done');
    measure();
    onScroll();
    wireReveals();
    wireForeground();
    loadWeather();
    setIter('2h');
    const hash = (location.hash || '').replace(/^#/, '');
    if (hash) setTimeout(() => goToId(hash, true), 60);
  }

  function boot() {
    makeGrain();
    setVW();
    wireLang();
    wireRail();
    wireNav();
    wireAnchors();
    wireCursor();
    wireWalk();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const start = () => {
      try {
        initGL();
        setLoad(92);
        requestAnimationFrame(loop);
        setTimeout(() => {
          setLoad(100);
          setTimeout(ready, 280);
        }, 240);
      } catch (err) {
        console.warn(err);
        document.body.classList.add('no-webgl');
        setLoad(100);
        setTimeout(ready, 200);
      }
    };
    if (document.fonts?.ready) document.fonts.ready.then(start);
    else start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
