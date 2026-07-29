// Wayfinder — three.js geometry and scenes (waʻa kaulua)
// No dependencies: receives THREE injected from the global scope.
//
// MODELS: hero, AR table and hall load the GLBs from ./models/ via loadBoats();
// if loading fails, buildCanoe() is used as a fallback. The anatomy scene always
// uses buildCanoe(), because the exploded view depends on its named parts.

/* ════════════════════════════════════════════════════════════════════════
   TUNABLES — every hand-adjustable 3D value lives in this block.
   Change a value, reload the page, and the scene reflects it.
   · Colors: hex 0xRRGGBB         · Positions: [x, y, z]
   · Angles: radians              · Light intensities: 0 = off
   ════════════════════════════════════════════════════════════════════════ */
export const CFG = {

  render: {
    pixelRatioMax: 1.75            // max canvas sharpness (↑ sharper, ↑ GPU cost)
  },

  /* ── GLB models (./models/ folder) ───────────────────────────────────── */
  botes: {
    archivos: ['Boat1.glb', 'Boat2.glb', 'Boat3.glb'],   // available model files (indices 0, 1, 2)
    heroe: { modelo: 0, eslora: 9,   quillaY: -1.15 },   // hero: model index, overall length and keel height
    mesa:  { modelo: 1, eslora: 4.6, quillaY: -0.85 },   // AR table: same fields
    sala:  { orden: [0, 1, 2, 0], eslora: 7.5, quillaY: 0.06 } // hall: model per station (4 boats / 3 models), length and keel
  },

  /* ── lights for hero / anatomy / table (day and night) ───────────────── */
  luces: {
    dia: {
      hemisferio: { color: 0xdfe6e2, suelo: 0x2a2118, intensidad: 0.85 },  // HemisphereLight · sky/ground ambient
      sol:        { color: 0xfff2dd, intensidad: 1.35, posicion: [6, 9, 5] },   // DirectionalLight · main light
      contorno:   { color: 0xe0a32e, intensidad: 0.35, posicion: [-7, 3, -6] }  // DirectionalLight · golden rim glow
    },
    noche: {
      hemisferio: { color: 0x1b3a46, suelo: 0x2a2118, intensidad: 0.28 },
      sol:        { color: 0xa9c4e6, intensidad: 0.5,  posicion: [-6, 7, -5] }, // at night the "sun" acts as the moon
      contorno:   { color: 0xe0a32e, intensidad: 0.75, posicion: [-7, 3, -6] }
    }
  },

  /* ── sea (hero scene) ────────────────────────────────────────────────── */
  mar: {
    colorDia:   0x285060,          // water color by day
    colorNoche: 0x0c2334,          // water color by night
    opacidad: 0.7,                 // water opacity (1 = opaque, 0 = invisible)
    radio: 30,                     // radius of the water disc
    anillos: 24,                   // radial mesh resolution (↑ smoother waves, ↑ CPU)
    sectores: 72,                  // angular mesh resolution
    alturaY: -0.52,                // height of the water plane
    olas: [                        // each wave: amp = height · fx/fz = frequency in X/Z · vel = speed · fase = phase offset
      { amp: 0.30, fx: 0.30, fz: 0.00,  vel: 0.85, fase: 0   },
      { amp: 0.18, fx: 0.00, fz: 0.45,  vel: 0.60, fase: 1.7 },
      { amp: 0.10, fx: 0.75, fz: 0.75,  vel: 1.30, fase: 0   },
      { amp: 0.05, fx: 1.50, fz: -1.50, vel: 1.90, fase: 0   }
    ],
    bordeSuave: 0.7,               // fraction of the radius where the swell starts to fade
    horizonte: 0.93,               // fraction of the radius where the outer edge starts to drop
    caidaBorde: 1.1                // how much the outer edge drops (horizon curve)
  },

  /* ── hero scene ──────────────────────────────────────────────────────── */
  heroe: {
    fov: 38, fovMovil: 46,         // camera field of view (desktop / screens < 620px)
    camara: { r: 17.5, theta: 0.75, phi: 1.24, alturaMirada: 1.6 },
      // initial orbit: r = distance · theta = horizontal spin · phi = elevation · alturaMirada = look-at height
    vistas: {                      // framings for the full view / bow / sail / hull buttons
      all:  { r: 17.5, theta: 0.75, phi: 1.24, ty: 1.6, part: null },
      bow:  { r: 9.5,  theta: 2.35, phi: 1.32, ty: 1.3, part: 'manu ihu' },
      sail: { r: 13,   theta: 0.55, phi: 1.1,  ty: 3.4, part: 'peʻa' },
      hull: { r: 11,   theta: 1.55, phi: 1.5,  ty: 0.4, part: 'kino waʻa' }
    },
    giroBote: -0.55,               // resting Y rotation of the boat
    balanceo: {                    // boat sway with the swell (amplitudes and periods in seconds)
      rotZ: 0.034, periodoZ: 4,    //   roll (port–starboard tilt)
      rotX: 0.02,  periodoX: 5.5,  //   pitch (bow–stern tilt)
      subida: 0.22, periodoY: 4.4  //   rise and fall with the wave
    },
    arrastre: { sensX: 0.007, sensY: 0.005, phiMin: 0.75, phiMax: 1.62 },
      // drag sensitivity (horizontal / vertical) and orbit elevation limits
    suavizado: 0.07                // camera chase toward its target (0–1, ↑ faster)
  },

  /* ── anatomy scene (scroll-driven exploded view) ─────────────────────── */
  anatomia: {
    fov: 34, fovMovil: 44,
    camara: { radio: 14, azimut: 0.95, altura: 4.6, alturaExtra: 1.6, mirada: 1.5, miradaExtra: 0.9 },
      // fixed orbit; alturaExtra / miradaExtra are added as the explode progresses (0→1)
    giroBase: -0.72, giroExtra: 0.34, // model Y rotation (at rest + extra spin while exploding)
    suavizado: 0.12                // explode smoothing while scrolling (0–1)
  },

  /* ── AR table scene ──────────────────────────────────────────────────── */
  mesa: {
    fov: 32,
    camara: { radio: 10, azimut: 0.7, altura: 4.2, mirada: 0.9 }, // fixed camera position and look-at height
    giroBase: -0.4, giroVel: 0.12, // initial boat rotation and continuous spin speed (rad/s)
    anillo: { color: 0xb87a15, radioInterior: 4.4, radioExterior: 4.5, opacidad: 0.55, alturaY: -0.9 }
      // "AR placement" ring under the boat
  },

  /* ── immersive hall ──────────────────────────────────────────────────── */
  sala: {
    fov: 62,                       // first-person camera field of view
    fondo: 0x05090b,               // background and fog color
    niebla: { cerca: 8, lejos: 56 }, // distances where the fog starts and ends
    ambiente: { color: 0x30465a, suelo: 0x05090b, intensidad: 0.16 }, // faint overall HemisphereLight
    suelo: { color: 0x0d1418, ancho: 30, largo: 120, z: -45 },        // floor plane (size and center)
    primerBarcoZ: -12,             // Z of the first boat
    separacionZ: 16,               // distance between boats (↑ more room to walk through)
    ladoX: 6.4,                    // how far each boat sits from the central aisle (sides alternate)
    giroBarco: 1.15,               // Y rotation of each boat (mirrored per side)
    foco: {                        // SpotLight hanging over each boat
      color: 0xffeccc,
      intensidad: 2.2,             //   resting brightness
      brilloExtra: 3.4,            //   how much the brightness RISES when standing in the boat's circle
      altura: 11, angulo: 0.62, penumbra: 0.75, distancia: 26, decaimiento: 1
    },
    plinto: { color: 0x141d22, radio: 5.2 }, // dark disc under each boat
    circulo: {                     // golden interactive circle on the floor
      color: 0xe0a32e,
      radioInterior: 0.92, radioExterior: 0.98, radioRelleno: 0.9, // base ring and fill disc
      factorX: 0.42, offsetZ: 3.6, //   position: boat_x × factorX · boat_z + offsetZ (sits toward the aisle)
      pulsoBase: 0.28, pulsoAmp: 0.1, pulsoVel: 1.4 // idle pulse of the ring
    },
    proximidad: {                  // how each circle reacts to the player
      radio: 1.1, alcance: 3.4,    //   starts filling at radio+alcance; fully filled at distance ≤ radio
      entrar: 0.9, salir: 0.6      //   fill thresholds (0–1) to show / hide "more info" without flicker
    },
    caminar: {
      velocidad: 0.11,             //   step per frame (WASD)
      alturaOjos: 1.62,            //   camera height
      sensX: 0.0022, sensY: 0.0018, //  mouse sensitivity (yaw / pitch)
      sensTactil: 0.005,           //   touch-drag look sensitivity (mobile)
      cabeceoMin: -0.6, cabeceoMax: 0.5, // vertical look limits
      limiteX: 10, limiteZmin: -70, limiteZmax: 5 // how far the player can walk
    },
    viaje: { suavizado: 0.045, giro: 0.05, llegada: 0.25, paradaZ: 0.6 }
      // mobile-button auto-travel: camera chase, look turn,
      // arrival radius and how far from the circle center it stops
  },

  /* ── augmented reality (WebXR + hit-test, hero boat → your space) ────── */
  ar: {
    modelo: 0,                     // index of the GLB placed in AR
    esloraReal: 19,                // REAL length in meters when placing the vessel (true size)
    reticula: 0xe0a32e,            // color of the aiming ring on the floor
    luz: { ambiente: 1.0, sol: 1.0 } // light intensities inside the AR session
  },

  /* ── procedural canoe (anatomy scene and fallback if GLBs fail) ──────── */
  canoa: {
    colorKoa: 0x5b3a23,            // hull wood
    colorOscuro: 0x3a2416,         // masts, figureheads and battens
    colorVela: 0xd2bd93,           // lauhala sail
    colorCabo: 0x6e6047,           // sennit lashings
    eslora: 10.4,                  // overall length
    mangaCasco: 0.6,               // half-beam of each hull
    puntal: 1.0,                   // hull depth
    arrufo: 0.62,                  // rise curve of bow and stern
    separacionCascos: 1.85         // distance of each hull from the center line
  }
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = t => 1 - Math.pow(1 - t, 3);

/* ---------- hull ---------- */
function hullGeometry(THREE, L, W, D, rise, stations = 28) {
  const st = [];
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const tt = clamp(t, 0.004, 0.996);
    const taper = Math.pow(Math.sin(Math.PI * tt), 0.62);
    const top = rise * Math.pow(Math.abs(t - 0.5) * 2, 2.6);
    st.push({ z: (t - 0.5) * L, w: W * taper, top, keel: top - D * Math.pow(taper, 0.45) });
  }
  const pos = [];
  const tri = (a, b, c) => { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  for (let i = 0; i < stations; i++) {
    const A = st[i], B = st[i + 1];
    const aP = [-A.w, A.top, A.z], aS = [A.w, A.top, A.z], aK = [0, A.keel, A.z];
    const bP = [-B.w, B.top, B.z], bS = [B.w, B.top, B.z], bK = [0, B.keel, B.z];
    tri(aP, aK, bK); tri(aP, bK, bP);
    tri(aS, bK, aK); tri(aS, bS, bK);
    tri(aP, bP, bS); tri(aP, bS, aS);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function sailMesh(THREE, mat, h, w, bend) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(-w * 0.12, h * 0.5, w * 0.06, h);
  s.quadraticCurveTo(w * 0.78, h * 0.94, w * 0.96, h * 0.3);
  s.quadraticCurveTo(w * 0.44, h * 0.16, 0, 0);
  const g = new THREE.ShapeGeometry(s, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = clamp(p.getX(i) / w, 0, 1), y = clamp(p.getY(i) / h, 0, 1);
    p.setZ(i, -bend * Math.sin(Math.PI * x) * Math.sin(Math.PI * y));
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.rotation.y = -Math.PI / 2;
  return m;
}

function spar(THREE, mat, from, to, r) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.65, len, 6), mat);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

/** Double-hulled canoe. Returns {group, parts} with named parts and explode direction. */
export function buildCanoe(THREE, opts = {}) {
  const C = CFG.canoa;
  const koaC = opts.koa ?? C.colorKoa;
  const mats = {
    koa: new THREE.MeshStandardMaterial({ color: koaC, roughness: 0.78, metalness: 0, flatShading: true, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: C.colorOscuro, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }),
    lau: new THREE.MeshStandardMaterial({ color: opts.sail ?? C.colorVela, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }),
    sen: new THREE.MeshStandardMaterial({ color: C.colorCabo, roughness: 0.9, flatShading: true })
  };
  const group = new THREE.Group();
  const parts = {};
  const add = (name, obj, dir) => {
    obj.name = name;
    obj.userData.base = obj.position.clone();
    obj.userData.dir = new THREE.Vector3(...(dir || [0, 0, 0]));
    parts[name] = obj;
    group.add(obj);
    return obj;
  };

  const L = C.eslora, W = C.mangaCasco, D = C.puntal, rise = C.arrufo, gap = C.separacionCascos;
  const hullG = hullGeometry(THREE, L, W, D, rise);

  [-1, 1].forEach(sgn => {
    const h = new THREE.Group();
    const shell = new THREE.Mesh(hullG, mats.koa);
    h.add(shell);
    // manu ihu / manu hope — raised bow and stern figureheads
    [1, -1].forEach(e => {
      const orn = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.15, 5), mats.dark);
      orn.position.set(0, rise + 0.42, e * (L / 2 - 0.06));
      orn.rotation.x = e * -0.5;
      h.add(orn);
    });
    h.position.set(sgn * gap, 0, 0);
    add(sgn < 0 ? 'hullPort' : 'hullStbd', h, [sgn * 1.5, 0, 0]);
  });

  const cross = new THREE.Group();
  [-2.9, -0.2, 2.6].forEach(z => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, gap * 2 + 1.2, 6), mats.sen);
    c.rotation.z = Math.PI / 2;
    c.position.set(0, 0.56, z);
    cross.add(c);
    [-gap, gap].forEach(x => {
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 6, 10), mats.sen);
      knot.position.set(x, 0.52, z);
      knot.rotation.y = Math.PI / 2;
      cross.add(knot);
    });
  });
  add('iako', cross, [0, 1.4, 0]);

  const deck = new THREE.Group();
  const pf = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.09, 5.2), mats.koa);
  pf.position.set(0, 0.66, -0.1);
  deck.add(pf);
  for (let i = 0; i < 13; i++) {
    const sl = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.05, 0.1), mats.dark);
    sl.position.set(0, 0.72, -2.5 + i * 0.42);
    deck.add(sl);
  }
  add('platform', deck, [0, 2.4, 0]);

  const rig = (z, h, w, tilt, name) => {
    const g = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, h, 6), mats.dark);
    mast.position.y = h / 2;
    g.add(mast);
    const sail = sailMesh(THREE, mats.lau, h * 0.92, w, 0.55);
    sail.position.set(0, h * 0.05, 0.06);
    g.add(sail);
    g.add(spar(THREE, mats.dark, [0, 0, 0], [0, h * 0.97, w * 0.06], 0.055));
    g.add(spar(THREE, mats.dark, [0, h * 0.06, 0], [0, h * 0.3, w * 0.96], 0.055));
    g.position.set(0, 0.7, z);
    g.rotation.x = tilt;
    return add(name, g, [0, 1.2, name === 'rigFore' ? 2.2 : -2.2]);
  };
  rig(1.5, 5.6, 3.5, 0.1, 'rigFore');
  rig(-2.6, 4.6, 2.9, 0.12, 'rigAft');

  const hoe = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), mats.dark);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.07), mats.koa);
  blade.position.y = -1.85;
  hoe.add(shaft, blade);
  hoe.position.set(0.9, 0.9, -4.4);
  hoe.rotation.set(0.55, 0, 0.3);
  add('hoeUli', hoe, [1.6, 0, -1.6]);

  return { group, parts, mats };
}

/* ---------- GLB models ---------- */
const BOAT_URLS = CFG.botes.archivos.map(f => new URL('./models/' + f, import.meta.url).href);
let boatsPromise = null;

const progressCbs = [];

// Loads the three GLBs only once (Draco-compressed); each entry can be null on failure.
function loadBoats() {
  if (!boatsPromise) {
    boatsPromise = Promise.all([
      import('https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js/+esm'),
      import('https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/DRACOLoader.js/+esm')
    ]).then(([{ GLTFLoader }, { DRACOLoader }]) => {
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/libs/draco/');
      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);
      const prog = BOAT_URLS.map(() => 0);
      const emit = () => {
        const p = prog.reduce((a, b) => a + b, 0) / prog.length;
        progressCbs.forEach(cb => cb(p));
      };
      return Promise.all(BOAT_URLS.map((url, i) =>
        new Promise(res => loader.load(url,
          g => { prog[i] = 1; emit(); res(g.scene); },
          e => { if (e && e.total) { prog[i] = Math.min(0.99, e.loaded / e.total); emit(); } },
          () => { prog[i] = 1; emit(); res(null); }
        ))
      ));
    }).catch(() => [null, null, null]);
  }
  return boatsPromise;
}

// Preloads every model reporting overall progress (0–1); drives the loading screen.
export function preloadBoats(onProgress) {
  if (onProgress) progressCbs.push(onProgress);
  return loadBoats().then(models => { progressCbs.length = 0; return models; });
}

/** Clones and normalizes a GLB: length along Z, centered in XZ, keel at keelY. */
function prepareBoat(THREE, src, targetLength, keelY) {
  const model = new THREE.Group();
  model.add(src.clone(true));
  const pivot = new THREE.Group();
  pivot.add(model);
  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  if (size.x > size.z) model.rotation.y = Math.PI / 2;
  box = new THREE.Box3().setFromObject(model);
  size = box.getSize(new THREE.Vector3());
  model.scale.setScalar(targetLength / (size.z || 1));
  box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.x -= c.x;
  model.position.z -= c.z;
  model.position.y += keelY - box.min.y;
  return pivot;
}

/* ---------- scene utilities ---------- */
function makeRenderer(THREE, canvas, alpha = true) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.render.pixelRatioMax));
  if ('useLegacyLights' in r) r.useLegacyLights = true;
  if ('outputEncoding' in r && THREE.sRGBEncoding) r.outputEncoding = THREE.sRGBEncoding;
  return r;
}

function lightRig(THREE, scene) {
  const d = CFG.luces.dia;
  const hemi = new THREE.HemisphereLight(d.hemisferio.color, d.hemisferio.suelo, d.hemisferio.intensidad);
  const sun = new THREE.DirectionalLight(d.sol.color, d.sol.intensidad);
  sun.position.set(...d.sol.posicion);
  const rim = new THREE.DirectionalLight(d.contorno.color, d.contorno.intensidad);
  rim.position.set(...d.contorno.posicion);
  scene.add(hemi, sun, rim);
  return {
    setMode(mode) {
      const m = mode === 'night' ? CFG.luces.noche : CFG.luces.dia;
      hemi.color.set(m.hemisferio.color);
      hemi.groundColor.set(m.hemisferio.suelo);
      hemi.intensity = m.hemisferio.intensidad;
      sun.color.set(m.sol.color);
      sun.intensity = m.sol.intensidad;
      sun.position.set(...m.sol.posicion);
      rim.color.set(m.contorno.color);
      rim.intensity = m.contorno.intensidad;
      rim.position.set(...m.contorno.posicion);
    }
  };
}

/* ---------- low-poly ocean (polar disc with swell) ---------- */
function makeOcean(THREE) {
  const M = CFG.mar;
  const R = M.radio, rings = M.anillos, sectors = M.sectores;
  const base = [], pos = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const r = R * i / rings;
    for (let j = 0; j < sectors; j++) {
      const a = j / sectors * Math.PI * 2;
      base.push([Math.cos(a) * r, Math.sin(a) * r, r]);
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < sectors; j++) {
    const a = i * sectors + j, b = i * sectors + (j + 1) % sectors;
    idx.push(a, a + sectors, b, b, a + sectors, b + sectors);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: M.colorDia, roughness: 0.85, metalness: 0.02, flatShading: true, side: THREE.DoubleSide, transparent: M.opacidad < 1, opacity: M.opacidad });
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.y = M.alturaY;
  const attr = g.attributes.position;
  return {
    mesh,
    setMode(m) { mat.color.set(m === 'night' ? M.colorNoche : M.colorDia); },
    update(t) {
      for (let k = 0; k < base.length; k++) {
        const x = base[k][0], z = base[k][1], r = base[k][2];
        const fade = 1 - Math.max(0, (r - R * M.bordeSuave) / (R * (1 - M.bordeSuave)));
        const dip = r > R * M.horizonte ? ((r - R * M.horizonte) / (R * (1 - M.horizonte))) * M.caidaBorde : 0;
        let h = 0;
        for (let w = 0; w < M.olas.length; w++) {
          const o = M.olas[w];
          h += o.amp * Math.sin(x * o.fx + z * o.fz + t * o.vel + o.fase);
        }
        attr.setY(k, h * fade - dip);
      }
      attr.needsUpdate = true;
      g.computeVertexNormals();
    }
  };
}

/* ---------- hero scene ---------- */
export function createHeroScene(THREE, canvas, opts = {}) {
  const H = CFG.heroe, B = CFG.botes.heroe;
  const scene = new THREE.Scene();
  const renderer = makeRenderer(THREE, canvas);
  const camera = new THREE.PerspectiveCamera(H.fov, 1, 0.1, 200);
  const group = new THREE.Group();
  const parts = {};
  group.rotation.y = H.giroBote;
  scene.add(group);
  const lights = lightRig(THREE, scene);
  const water = makeOcean(THREE);
  scene.add(water.mesh);

  const cam = { r: H.camara.r, theta: H.camara.theta, phi: H.camara.phi, ty: H.camara.alturaMirada };
  const target = { ...cam };
  let drag = null, raf = 0, t0 = performance.now(), sway = true, visible = true;
  let label = null, disposed = false;

  loadBoats().then(models => {
    if (disposed) return;
    const src = models[B.modelo] || models.find(Boolean);
    if (src) group.add(prepareBoat(THREE, src, B.eslora, B.quillaY));
    else { const c = buildCanoe(THREE); group.add(c.group); Object.assign(parts, c.parts); }
  });

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 620 ? H.fovMovil : H.fov;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const k = H.suavizado;
    cam.r += (target.r - cam.r) * k;
    cam.theta += (target.theta - cam.theta) * k;
    cam.phi += (target.phi - cam.phi) * k;
    cam.ty += (target.ty - cam.ty) * k;
    const t = (now - t0) / 1000;
    if (sway) {
      const b = H.balanceo;
      group.rotation.z = Math.sin(t * (Math.PI * 2 / b.periodoZ)) * b.rotZ;
      group.rotation.x = Math.sin(t * (Math.PI * 2 / b.periodoX) + 1) * b.rotX;
      group.position.y = Math.sin(t * (Math.PI * 2 / b.periodoY)) * b.subida;
    }
    water.update(sway ? t : 0);
    camera.position.set(
      cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
      cam.r * Math.cos(cam.phi) + cam.ty,
      cam.r * Math.sin(cam.phi) * Math.cos(cam.theta)
    );
    camera.lookAt(0, cam.ty, 0);
    renderer.render(scene, camera);
  }

  const down = e => { drag = { x: e.clientX ?? e.touches[0].clientX, y: e.clientY ?? e.touches[0].clientY }; };
  const move = e => {
    if (!drag) return;
    const x = e.clientX ?? e.touches[0].clientX, y = e.clientY ?? e.touches[0].clientY;
    target.theta -= (x - drag.x) * H.arrastre.sensX;
    target.phi = clamp(target.phi - (y - drag.y) * H.arrastre.sensY, H.arrastre.phiMin, H.arrastre.phiMax);
    drag = { x, y };
    if (e.cancelable) e.preventDefault();
  };
  const up = () => { drag = null; };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    parts,
    setMode: m => { lights.setMode(m); water.setMode(m); },
    setSway: v => { sway = v; if (!v) { group.rotation.z = 0; group.rotation.x = 0; group.position.y = 0; } },
    focus(view) {
      const v = H.vistas[view] || H.vistas.all;
      Object.assign(target, { r: v.r, theta: v.theta, phi: v.phi, ty: v.ty });
      label = v.part;
      return label;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      renderer.dispose();
    }
  };
}

/* ---------- anatomy scene (scroll-driven exploded view) ---------- */
export function createAnatomyScene(THREE, canvas) {
  const A = CFG.anatomia;
  const scene = new THREE.Scene();
  const renderer = makeRenderer(THREE, canvas);
  const camera = new THREE.PerspectiveCamera(A.fov, 1, 0.1, 200);
  const { group, parts } = buildCanoe(THREE);
  scene.add(group);
  const lights = lightRig(THREE, scene);
  group.rotation.y = A.giroBase;

  let explode = 0, shown = 0, raf = 0, visible = true;
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 620 ? A.fovMovil : A.fov;
    camera.updateProjectionMatrix();
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    shown += (explode - shown) * A.suavizado;
    const e = ease(clamp(shown, 0, 1));
    Object.values(parts).forEach(p => {
      p.position.copy(p.userData.base).addScaledVector(p.userData.dir, e);
    });
    group.rotation.y = A.giroBase + e * A.giroExtra;
    const c = A.camara;
    camera.position.set(c.radio * Math.sin(c.azimut), c.altura + e * c.alturaExtra, c.radio * Math.cos(c.azimut));
    camera.lookAt(0, c.mirada + e * c.miradaExtra, 0);
    renderer.render(scene, camera);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  resize(); raf = requestAnimationFrame(frame);

  return {
    setExplode: v => { explode = clamp(v, 0, 1); },
    setMode: m => lights.setMode(m),
    snap: v => { explode = shown = clamp(v, 0, 1); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); }
  };
}

/* ---------- AR scene (tabletop view) ---------- */
export function createTableScene(THREE, canvas) {
  const M = CFG.mesa, B = CFG.botes.mesa;
  const scene = new THREE.Scene();
  const renderer = makeRenderer(THREE, canvas);
  const camera = new THREE.PerspectiveCamera(M.fov, 1, 0.1, 200);
  const group = new THREE.Group();
  scene.add(group);
  let disposed = false;
  loadBoats().then(models => {
    if (disposed) return;
    const src = models[B.modelo] || models.find(Boolean);
    if (src) group.add(prepareBoat(THREE, src, B.eslora, B.quillaY));
    else { const c = buildCanoe(THREE); c.group.scale.setScalar(0.62); group.add(c.group); }
  });
  const lights = lightRig(THREE, scene);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(M.anillo.radioInterior, M.anillo.radioExterior, 64),
    new THREE.MeshBasicMaterial({ color: M.anillo.color, transparent: true, opacity: M.anillo.opacidad, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = M.anillo.alturaY;
  scene.add(ring);

  let raf = 0, visible = true, t0 = performance.now();
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const t = (now - t0) / 1000;
    group.rotation.y = M.giroBase + t * M.giroVel;
    const c = M.camara;
    camera.position.set(c.radio * Math.sin(c.azimut), c.altura, c.radio * Math.cos(c.azimut));
    camera.lookAt(0, c.mirada, 0);
    renderer.render(scene, camera);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  resize(); raf = requestAnimationFrame(frame);
  return {
    setMode: m => lights.setMode(m),
    dispose() { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); }
  };
}

/* ---------- immersive hall ---------- */
export function createHall(THREE, canvas, opts = {}) {
  const S = CFG.sala;
  const ships = opts.ships || [];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(S.fondo);
  scene.fog = new THREE.Fog(S.fondo, S.niebla.cerca, S.niebla.lejos);
  const renderer = makeRenderer(THREE, canvas, false);
  const camera = new THREE.PerspectiveCamera(S.fov, 1, 0.05, 200);

  scene.add(new THREE.HemisphereLight(S.ambiente.color, S.ambiente.suelo, S.ambiente.intensidad));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(S.suelo.ancho, S.suelo.largo),
    new THREE.MeshStandardMaterial({ color: S.suelo.color, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = S.suelo.z;
  scene.add(floor);

  const stations = [], holders = [];
  ships.forEach((s, i) => {
    const z = S.primerBarcoZ - i * S.separacionZ;
    const x = i % 2 ? S.ladoX : -S.ladoX;
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.rotation.y = (i % 2 ? -1 : 1) * S.giroBarco;
    scene.add(holder);
    holders.push(holder);

    const spot = new THREE.SpotLight(S.foco.color, S.foco.intensidad, S.foco.distancia, S.foco.angulo, S.foco.penumbra, S.foco.decaimiento);
    spot.position.set(x, S.foco.altura, z);
    spot.target.position.set(x, 1, z);
    scene.add(spot, spot.target);

    const plinth = new THREE.Mesh(
      new THREE.CircleGeometry(S.plinto.radio, 40),
      new THREE.MeshStandardMaterial({ color: S.plinto.color, roughness: 1 })
    );
    plinth.rotation.x = -Math.PI / 2;
    plinth.position.set(x, 0.01, z);
    scene.add(plinth);

    // floor circle — base ring + proximity fill disc
    const rx = x * S.circulo.factorX, rz = z + S.circulo.offsetZ;
    const base = new THREE.Mesh(
      new THREE.RingGeometry(S.circulo.radioInterior, S.circulo.radioExterior, 48),
      new THREE.MeshBasicMaterial({ color: S.circulo.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    base.rotation.x = -Math.PI / 2; base.position.set(rx, 0.03, rz);
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(S.circulo.radioRelleno, 48, 0, 0.001),
      new THREE.MeshBasicMaterial({ color: S.circulo.color, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    fill.rotation.x = -Math.PI / 2; fill.position.set(rx, 0.032, rz);
    scene.add(base, fill);
    stations.push({ i, x: rx, z: rz, base, fill, spot, f: 0 });
  });

  loadBoats().then(models => {
    if (!running) return;
    const BB = CFG.botes.sala;
    holders.forEach((holder, i) => {
      const src = models[BB.orden[i % BB.orden.length]] || models.find(Boolean);
      if (src) holder.add(prepareBoat(THREE, src, BB.eslora, BB.quillaY));
      else {
        const { group } = buildCanoe(THREE, { koa: ships[i].koa, sail: ships[i].sail });
        group.scale.setScalar(0.72);
        group.position.y = 1.1;
        holder.add(group);
      }
    });
  });

  const cam = { x: 0, z: 2, yaw: 0, pitch: 0 };
  const keys = {};
  let raf = 0, travel = null, prog = -1, ready = -1, readyPrev = -1, frozen = false, running = true;

  const onKey = e => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      keys[k] = e.type === 'keydown';
      // with the label card open (frozen) the arrow keys stay free to scroll the modal
      if (!frozen) e.preventDefault();
    }
  };
  const onMouse = e => {
    if (document.pointerLockElement !== canvas) return;
    cam.yaw -= e.movementX * S.caminar.sensX;
    cam.pitch = clamp(cam.pitch - e.movementY * S.caminar.sensY, S.caminar.cabeceoMin, S.caminar.cabeceoMax);
  };
  // mobile: one-finger drag to look (the "advance" button moves the player)
  canvas.style.touchAction = 'none';
  let touchLook = null;
  const onTouchDown = e => { if (e.pointerType === 'touch') touchLook = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
  const onTouchMove = e => {
    if (!touchLook || e.pointerId !== touchLook.id || frozen) return;
    cam.yaw -= (e.clientX - touchLook.x) * S.caminar.sensTactil;
    cam.pitch = clamp(cam.pitch - (e.clientY - touchLook.y) * S.caminar.sensTactil, S.caminar.cabeceoMin, S.caminar.cabeceoMax);
    touchLook.x = e.clientX; touchLook.y = e.clientY;
  };
  const onTouchUp = e => { if (touchLook && e.pointerId === touchLook.id) touchLook = null; };
  // mobile: semi-transparent d-pad (touch devices only) — forward/back + strafe
  let motionF = 0, motionS = 0, moveUI = null;
  canvas.style.webkitUserSelect = 'none';
  canvas.style.userSelect = 'none';
  if (matchMedia('(pointer: coarse)').matches) {
    moveUI = document.createElement('div');
    moveUI.style.cssText = 'position:absolute;left:14px;bottom:86px;display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(2,48px);gap:8px;z-index:5;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none';
    moveUI.addEventListener('contextmenu', e => e.preventDefault());
    const mk = (label, col, row, press, release) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'grid-column:' + col + ';grid-row:' + row + ";width:48px;height:48px;border-radius:50%;border:1px solid rgba(224,163,46,.3);background:rgba(5,9,11,.22);color:rgba(224,163,46,.75);font-size:16px;line-height:1;touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none";
      b.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, release));
      moveUI.appendChild(b);
    };
    mk('▲', 2, 1, () => { motionF = 1; }, () => { motionF = 0; });
    mk('◀', 1, 2, () => { motionS = -1; }, () => { motionS = 0; });
    mk('▼', 2, 2, () => { motionF = -1; }, () => { motionF = 0; });
    mk('▶', 3, 2, () => { motionS = 1; }, () => { motionS = 0; });
    (canvas.parentElement || document.body).appendChild(moveUI);
  }
  canvas.addEventListener('pointerdown', onTouchDown);
  window.addEventListener('pointermove', onTouchMove);
  window.addEventListener('pointerup', onTouchUp);
  window.addEventListener('pointercancel', onTouchUp);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('mousemove', onMouse);

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const W = S.caminar;
    if (!frozen) {
      let fx = 0, fz = 0;
      if (keys.w || keys.arrowup) fz -= 1;
      if (keys.s || keys.arrowdown) fz += 1;
      if (keys.a || keys.arrowleft) fx -= 1;
      if (keys.d || keys.arrowright) fx += 1;
      if (fx || fz) {
        const len = Math.hypot(fx, fz);
        const sinY = Math.sin(cam.yaw), cosY = Math.cos(cam.yaw);
        // motion = forward·(-fz) + right·fx, consistent with YXZ rotation and yaw -= movementX
        cam.x += ((fx / len) * cosY + (fz / len) * sinY) * W.velocidad;
        cam.z += (-(fx / len) * sinY + (fz / len) * cosY) * W.velocidad;
        travel = null;
      }
      if (motionF || motionS) {
        // d-pad: forward/back along the view direction + lateral strafe
        cam.x += (-Math.sin(cam.yaw) * motionF + Math.cos(cam.yaw) * motionS) * W.velocidad;
        cam.z += (-Math.cos(cam.yaw) * motionF - Math.sin(cam.yaw) * motionS) * W.velocidad;
        travel = null;
      }
      if (travel) {
        cam.x += (travel.x - cam.x) * S.viaje.suavizado;
        cam.z += (travel.z - cam.z) * S.viaje.suavizado;
        const dy = Math.atan2(-(travel.x - cam.x), -(travel.z - cam.z));
        let d = dy - cam.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        cam.yaw += d * S.viaje.giro;
        if (Math.hypot(travel.x - cam.x, travel.z - cam.z) < S.viaje.llegada) travel = null;
      }
    }
    cam.x = clamp(cam.x, -W.limiteX, W.limiteX);
    cam.z = clamp(cam.z, W.limiteZmin, W.limiteZmax);

    camera.position.set(cam.x, W.alturaOjos, cam.z);
    camera.rotation.set(cam.pitch, cam.yaw, 0, 'YXZ');

    const t = now / 1000;
    let near = null, nd = 1e9;
    stations.forEach(s => {
      const d = Math.hypot(s.x - cam.x, s.z - cam.z);
      if (d < nd) { nd = d; near = s; }
      const P = S.circulo;
      const pulse = P.pulsoBase + Math.sin(t * P.pulsoVel + s.i) * P.pulsoAmp;
      const f = clamp(1 - (d - S.proximidad.radio) / S.proximidad.alcance, 0, 1);
      s.f = f;
      s.base.material.opacity = pulse + f * 0.55;
      s.fill.geometry.dispose();
      s.fill.geometry = new THREE.CircleGeometry(P.radioRelleno, 48, -Math.PI / 2, Math.max(0.001, f * Math.PI * 2));
      s.fill.material.opacity = 0.14 + f * 0.3;
      // the boat's light gains intensity as you approach and peaks inside the circle
      s.spot.intensity = S.foco.intensidad + ease(f) * S.foco.brilloExtra;
    });
    // "more info" with hysteresis: appears when standing in the circle, no flicker at the edge
    if (ready >= 0 && stations[ready] && stations[ready].f < S.proximidad.salir) ready = -1;
    if (ready < 0) { const st = stations.find(s => s.f >= S.proximidad.entrar); if (st) ready = st.i; }
    if (ready !== readyPrev) { readyPrev = ready; opts.onReady && opts.onReady(ready); }
    const p = near ? clamp(1 - (nd - S.proximidad.radio) / S.proximidad.alcance, 0, 1) : 0;
    const idx = p > 0.05 ? near.i : -1;
    if (idx !== prog) { prog = idx; opts.onNear && opts.onNear(idx); }
    renderer.render(scene, camera);
  }

  const ro = new ResizeObserver(resize); ro.observe(canvas);
  resize(); raf = requestAnimationFrame(frame);

  return {
    travelTo(i) { const st = stations[i]; if (st) travel = { x: st.x, z: st.z + S.viaje.paradaZ }; },
    lock() { canvas.requestPointerLock && canvas.requestPointerLock(); },
    unlock() { document.pointerLockElement === canvas && document.exitPointerLock(); },
    setFrozen(v) { frozen = !!v; if (moveUI) moveUI.style.visibility = frozen ? 'hidden' : 'visible'; },
    dispose() {
      running = false;
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('pointerdown', onTouchDown);
      window.removeEventListener('pointermove', onTouchMove);
      window.removeEventListener('pointerup', onTouchUp);
      window.removeEventListener('pointercancel', onTouchUp);
      moveUI && moveUI.remove();
      document.pointerLockElement === canvas && document.exitPointerLock();
      renderer.dispose();
    }
  };
}

/* ---------- augmented reality (WebXR + hit-test) ---------- */
// Opens an immersive-ar session with the device camera: an aiming ring
// tracks the floor and tapping the screen places the vessel at REAL SIZE
// (CFG.ar.esloraReal). Requires Android + Chrome (ARCore) and HTTPS.
export async function startAR(THREE, opts = {}) {
  const A = CFG.ar;
  if (!navigator.xr || !navigator.xr.isSessionSupported) return { ok: false, reason: 'no-webxr' };
  const supported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
  if (!supported) return { ok: false, reason: 'unsupported' };
  const models = await loadBoats();
  const src = models[A.modelo] || models.find(Boolean);
  if (!src) return { ok: false, reason: 'no-model' };

  // DOM layer over the camera: exit button + hint
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;pointer-events:none';
  const exitBtn = document.createElement('button');
  exitBtn.textContent = '✕ exit ar';
  exitBtn.style.cssText = "position:absolute;right:16px;top:16px;pointer-events:auto;border:1px solid #E0A32E;background:rgba(5,9,11,.72);color:#E0A32E;padding:12px 16px;min-height:44px;font:500 11px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;border-radius:2px;cursor:pointer";
  const hint = document.createElement('div');
  hint.textContent = 'point at the floor · tap to place the canoe at real size';
  hint.style.cssText = "position:absolute;left:16px;right:16px;bottom:28px;text-align:center;color:#F2E9D8;font:500 11px/1.5 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,.85)";
  overlay.append(exitBtn, hint);
  document.body.appendChild(overlay);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.render.pixelRatioMax));
  if ('useLegacyLights' in renderer) renderer.useLegacyLights = true;
  if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x44403a, A.luz.ambiente));
  const sun = new THREE.DirectionalLight(0xfff2dd, A.luz.sol);
  sun.position.set(2, 6, 3);
  scene.add(sun);

  const boat = prepareBoat(THREE, src, A.esloraReal, 0);
  boat.visible = false;
  scene.add(boat);

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: A.reticula })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  const cleanup = () => {
    renderer.setAnimationLoop(null);
    overlay.remove();
    renderer.dispose();
    opts.onEnd && opts.onEnd();
  };

  let session = null;
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: overlay }
    });
  } catch (e) {
    cleanup();
    return { ok: false, reason: 'denied' };
  }
  session.addEventListener('end', cleanup);
  exitBtn.addEventListener('click', () => session.end());
  await renderer.xr.setSession(session);

  let hitTestSource = null;
  try {
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  } catch (e) { /* no hit-test: the vessel is placed in front on tap */ }

  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (reticle.visible) {
      boat.position.setFromMatrixPosition(reticle.matrix);
      boat.visible = true;
    } else if (!boat.visible) {
      boat.position.set(0, -1.4, -A.esloraReal * 0.75).applyMatrix4(camera.matrixWorld);
      boat.visible = true;
    }
  });
  scene.add(controller);

  renderer.setAnimationLoop((t, frame) => {
    if (frame && hitTestSource) {
      const hits = frame.getHitTestResults(hitTestSource);
      if (hits.length) {
        const pose = hits[0].getPose(renderer.xr.getReferenceSpace());
        if (pose) { reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix); }
      } else reticle.visible = false;
    }
    renderer.render(scene, camera);
  });

  return { ok: true, end: () => session.end() };
}
