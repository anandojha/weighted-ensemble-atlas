(function () {
  "use strict";

  var state = {
    map: null,
    meta: null,
    audits: [],
    systems: [],
    missingTop: [],
    ftMeta: {},
    reviewChapters: [],
    opportunities: [],
    storySteps: [],
    pos: null,
    pr: null,
    col: null,
    flag: null,
    edges: null,
    outAdj: null,
    inAdj: null,
    nTotal: 0,
    nBase: 0,
    showAll: false,
    showEdges: true,
    showLabels: true,
    showAudits: false,
    slowSpin: true,
    storyOpen: false,
    storyIdx: 0,
    colorMode: "core",
    activeSubfield: -1,
    selectedNode: -1,
    hoveredNode: -1,
    highlightedSet: null,
    yMin: 1916,
    yMax: 2026,
    playing: false,
    playYear: 1955,
    activeDrawer: "",
    activeSubfieldTab: 0,
    activeAuditIdx: 0,
    auditFilter: "all",
    activeReviewIdx: 0,
    oppFilter: "all",
    methodTab: "corpus"
  };

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var out = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }

  function yearToY(yr) {
    if (yr >= 1996) {
      return -9.5 + (yr - 1996) * 1.12;
    }
    if (yr >= 1978) {
      return -19.5 + ((yr - 1978) / 18.0) * 10.0;
    }
    if (yr >= 1950) {
      return -25.0 + ((yr - 1950) / 28.0) * 5.5;
    }
    return -27.5 + ((Math.max(1916, yr) - 1916) / 34.0) * 2.5;
  }

  function hexToRgb01(hex) {
    var h = hex.replace("#", "");
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function yearColor(yr) {
    var t = Math.max(0, Math.min(1, (yr - 1985) / 41.0));
    if (t < 0.5) {
      var u = t * 2.0;
      return [0.24 + 0.08 * u, 0.42 + 0.36 * u, 0.88 + 0.04 * u];
    }
    var v = (t - 0.5) * 2.0;
    return [0.32 + 0.64 * v, 0.78 - 0.06 * v, 0.92 - 0.66 * v];
  }

  function loadBundleScript() {
    return new Promise(function (resolve, reject) {
      if (window.ATLAS_BUNDLE) {
        resolve(window.ATLAS_BUNDLE);
        return;
      }
      var s = document.createElement("script");
      s.src = "data/bundle.js";
      s.onload = function () {
        if (window.ATLAS_BUNDLE) resolve(window.ATLAS_BUNDLE);
        else reject(new Error("Missing ATLAS_BUNDLE"));
      };
      s.onerror = function () {
        reject(new Error("Could not load data/bundle.js"));
      };
      document.head.appendChild(s);
    });
  }

  function unpackBundle(b) {
    state.map = b.map;
    state.meta = b.meta;
    state.audits = b.audits || [];
    state.systems = b.systems || [];
    state.missingTop = b.missing_top || [];
    state.ftMeta = b.ft_meta || {};
    state.reviewChapters = b.review || [];
    state.opportunities = b.opportunities || [];
    state.storySteps = b.story || [];
    state.nTotal = b.map.n_total;
    state.nBase = b.map.n_base;

    var posBytes = b64ToBytes(b.pos_b64);
    state.pos = new Float32Array(posBytes.buffer);

    var attrBytes = b64ToBytes(b.attr_b64);
    var n = state.nTotal;
    state.pr = new Float32Array(attrBytes.buffer.slice(0, n * 4));
    state.col = new Uint8Array(attrBytes.buffer, n * 4, n);
    state.flag = new Uint8Array(attrBytes.buffer, n * 5, n);

    var edgeBytes = b64ToBytes(b.edges_b64);
    state.edges = new Uint32Array(edgeBytes.buffer);
  }

  function parseCsvSimple(txt) {
    var lines = txt.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    var headers = lines[0].split(",");
    var out = [];
    for (var i = 1; i < Math.min(lines.length, 105); i++) {
      var row = [];
      var cur = "";
      var inQ = false;
      var line = lines[i];
      for (var c = 0; c < line.length; c++) {
        var ch = line[c];
        if (ch === '"') {
          inQ = !inQ;
        } else if (ch === "," && !inQ) {
          row.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      row.push(cur);
      var obj = {};
      for (var k = 0; k < headers.length; k++) {
        obj[headers[k]] = row[k] || "";
      }
      out.push(obj);
    }
    return out;
  }

  async function loadAllData() {
    if (window.location.protocol === "file:") {
      var b = await loadBundleScript();
      unpackBundle(b);
      return;
    }
    try {
      var res = await Promise.all([
        fetch("data/map.json").then(function (r) { return r.json(); }),
        fetch("data/pos.bin").then(function (r) { return r.arrayBuffer(); }),
        fetch("data/attr.bin").then(function (r) { return r.arrayBuffer(); }),
        fetch("data/edges.bin").then(function (r) { return r.arrayBuffer(); }),
        fetch("data/meta.json").then(function (r) { return r.json(); }),
        fetch("data/audits.json").then(function (r) { return r.json(); }),
        fetch("data/systems.json").then(function (r) { return r.json(); }),
        fetch("data/missing_high_impact.csv").then(function (r) { return r.text(); }),
        fetch("data/phase34.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
      ]);
      state.map = res[0];
      state.nTotal = state.map.n_total;
      state.nBase = state.map.n_base;
      state.pos = new Float32Array(res[1]);
      var n = state.nTotal;
      state.pr = new Float32Array(res[2].slice(0, n * 4));
      state.col = new Uint8Array(res[2], n * 4, n);
      state.flag = new Uint8Array(res[2], n * 5, n);
      state.edges = new Uint32Array(res[3]);
      state.meta = res[4];
      state.audits = res[5];
      state.systems = res[6];
      state.missingTop = parseCsvSimple(res[7]);
      var p34 = res[8] || {};
      state.ftMeta = p34.ft_meta || {};
      state.reviewChapters = p34.review || [];
      state.opportunities = p34.opportunities || [];
      state.storySteps = p34.story || [];
    } catch (err) {
      var bFallback = await loadBundleScript();
      unpackBundle(bFallback);
    }
  }

  function ensureAdjacency() {
    if (state.outAdj) return;
    var n = state.nTotal;
    state.outAdj = new Array(n);
    state.inAdj = new Array(n);
    for (var i = 0; i < n; i++) {
      state.outAdj[i] = [];
      state.inAdj[i] = [];
    }
    var eLen = state.edges.length;
    for (var k = 0; k < eLen; k += 2) {
      var u = state.edges[k];
      var v = state.edges[k + 1];
      state.outAdj[u].push(v);
      state.inAdj[v].push(u);
    }
  }

  var scene, camera, renderer;
  var pointsMesh, haloMesh, edgesMesh, rayMesh, auditMesh, ringGroup, stalkGroup;
  var worldPositions = null;
  var colPalette = [];
  var colDomLabels = [];
  var ringDomLabels = [];

  var cam = {
    theta: 0.62,
    phi: 1.24,
    radius: 72.0,
    tx: 0.0,
    ty: 5.0,
    tz: 0.0,
    goalTheta: 0.62,
    goalPhi: 1.24,
    goalRadius: 72.0,
    goalTx: 0.0,
    goalTy: 5.0,
    goalTz: 0.0,
    dragging: false,
    panning: false,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    moved: false
  };

  var VERT_POINTS = [
    "attribute float aSize;",
    "attribute float aYear;",
    "attribute float aAlpha;",
    "attribute vec3 aColor;",
    "uniform float uY0;",
    "uniform float uY1;",
    "uniform float uPixelRatio;",
    "varying vec3 vColor;",
    "varying float vVis;",
    "void main() {",
    "  vColor = aColor;",
    "  float inYr = step(uY0, aYear) * step(aYear, uY1);",
    "  vVis = aAlpha * inYr;",
    "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
    "  gl_Position = projectionMatrix * mv;",
    "  float dist = max(8.0, -mv.z);",
    "  gl_PointSize = clamp(aSize * uPixelRatio * (54.0 / dist), 1.6, 46.0) * step(0.01, vVis);",
    "}"
  ].join("\n");

  var FRAG_POINTS = [
    "varying vec3 vColor;",
    "varying float vVis;",
    "void main() {",
    "  if (vVis < 0.01) discard;",
    "  vec2 d = gl_PointCoord - vec2(0.5);",
    "  float r2 = dot(d, d);",
    "  if (r2 > 0.25) discard;",
    "  float core = exp(-r2 * 15.0);",
    "  float rim = smoothstep(0.25, 0.04, r2);",
    "  vec3 col = mix(vColor, vec3(1.0), core * 0.42);",
    "  gl_FragColor = vec4(col, rim * vVis);",
    "}"
  ].join("\n");

  var FRAG_HALO = [
    "varying vec3 vColor;",
    "varying float vVis;",
    "void main() {",
    "  if (vVis < 0.01) discard;",
    "  vec2 d = gl_PointCoord - vec2(0.5);",
    "  float r2 = dot(d, d);",
    "  if (r2 > 0.25) discard;",
    "  float glow = exp(-r2 * 10.5) * 0.42;",
    "  gl_FragColor = vec4(vColor, glow * vVis);",
    "}"
  ].join("\n");

  var VERT_EDGES = [
    "attribute vec2 aYears;",
    "attribute float aBase;",
    "uniform float uY0;",
    "uniform float uY1;",
    "uniform float uShowAll;",
    "varying float vShow;",
    "void main() {",
    "  float okYr = step(uY0, aYears.x) * step(aYears.x, uY1) * step(uY0, aYears.y) * step(aYears.y, uY1);",
    "  float okSet = max(aBase, uShowAll);",
    "  vShow = okYr * okSet;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}"
  ].join("\n");

  var FRAG_EDGES = [
    "uniform vec3 uEdgeColor;",
    "uniform float uEdgeOpacity;",
    "varying float vShow;",
    "void main() {",
    "  if (vShow < 0.5) discard;",
    "  gl_FragColor = vec4(uEdgeColor, uEdgeOpacity);",
    "}"
  ].join("\n");

  function computeNodeColor(i) {
    var mode = state.colorMode;
    var flg = state.flag[i];
    var yr = state.pos[i * 3 + 1];
    if (mode === "subfield") {
      return colPalette[state.col[i]] || [0.6, 0.7, 0.9];
    }
    if (mode === "year") {
      return yearColor(yr);
    }
    if (mode === "coverage") {
      if (state.ftMeta[i]) return [0.24, 0.86, 0.59];
      if (flg & 2) return [0.24, 0.86, 0.59];
      if ((flg & 1) && (flg & 4)) return [0.33, 0.77, 0.92];
      if (flg & 1) return [1.0, 0.42, 0.42];
      return [0.38, 0.45, 0.62];
    }
    if (flg & 1) {
      if (i === state.map.root_idx) return [1.0, 0.92, 0.38];
      return [0.96, 0.73, 0.26];
    }
    return [0.39, 0.47, 0.69];
  }

  function computeNodeAlpha(i) {
    if (!state.showAll && i >= state.nBase) return 0.0;
    if (state.highlightedSet) {
      return state.highlightedSet.has(i) ? 1.0 : 0.07;
    }
    if (state.activeSubfield >= 0 && state.col[i] !== state.activeSubfield) {
      return 0.09;
    }
    var flg = state.flag[i];
    if (state.colorMode === "core" && !(flg & 1)) {
      return 0.42;
    }
    return 0.94;
  }

  function buildScene() {
    var wrap = document.getElementById("canvas-wrap");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.5, 500);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x070a12, 1);
    wrap.appendChild(renderer.domElement);

    colPalette = state.map.subfields.map(function (sf) {
      return hexToRgb01(sf.color);
    });

    var n = state.nTotal;
    worldPositions = new Float32Array(n * 3);
    var sizes = new Float32Array(n);
    var years = new Float32Array(n);
    var alphas = new Float32Array(n);
    var colors = new Float32Array(n * 3);

    for (var i = 0; i < n; i++) {
      var x = state.pos[i * 3];
      var yr = state.pos[i * 3 + 1];
      var z = state.pos[i * 3 + 2];
      var wy = yearToY(yr);
      worldPositions[i * 3] = x;
      worldPositions[i * 3 + 1] = wy;
      worldPositions[i * 3 + 2] = z;
      years[i] = yr;
      var pr = state.pr[i];
      var isCore = (state.flag[i] & 1) ? 1.0 : 0.78;
      sizes[i] = (2.8 + 7.5 * Math.pow(pr, 1.35)) * isCore;
      if (i === state.map.root_idx) sizes[i] = 14.5;
      alphas[i] = computeNodeAlpha(i);
      var rgb = computeNodeColor(i);
      colors[i * 3] = rgb[0];
      colors[i * 3 + 1] = rgb[1];
      colors[i * 3 + 2] = rgb[2];
    }

    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(worldPositions, 3));
    pGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    pGeo.setAttribute("aYear", new THREE.BufferAttribute(years, 1));
    pGeo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    pGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

    var pMat = new THREE.ShaderMaterial({
      uniforms: {
        uY0: { value: state.yMin },
        uY1: { value: state.yMax },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: VERT_POINTS,
      fragmentShader: FRAG_POINTS,
      transparent: true,
      depthWrite: false
    });
    pointsMesh = new THREE.Points(pGeo, pMat);
    scene.add(pointsMesh);

    var haloIdx = [];
    for (var h = 0; h < n; h++) {
      if (state.pr[h] > 0.36 || h === state.map.root_idx || (state.flag[h] & 16)) {
        haloIdx.push(h);
      }
    }
    var hCount = haloIdx.length;
    var hPos = new Float32Array(hCount * 3);
    var hSize = new Float32Array(hCount);
    var hYear = new Float32Array(hCount);
    var hAlpha = new Float32Array(hCount);
    var hCol = new Float32Array(hCount * 3);
    for (var k = 0; k < hCount; k++) {
      var idx = haloIdx[k];
      hPos[k * 3] = worldPositions[idx * 3];
      hPos[k * 3 + 1] = worldPositions[idx * 3 + 1];
      hPos[k * 3 + 2] = worldPositions[idx * 3 + 2];
      hSize[k] = sizes[idx] * 2.9;
      hYear[k] = years[idx];
      hAlpha[k] = alphas[idx];
      hCol[k * 3] = colors[idx * 3];
      hCol[k * 3 + 1] = colors[idx * 3 + 1];
      hCol[k * 3 + 2] = colors[idx * 3 + 2];
    }
    var hGeo = new THREE.BufferGeometry();
    hGeo.setAttribute("position", new THREE.BufferAttribute(hPos, 3));
    hGeo.setAttribute("aSize", new THREE.BufferAttribute(hSize, 1));
    hGeo.setAttribute("aYear", new THREE.BufferAttribute(hYear, 1));
    hGeo.setAttribute("aAlpha", new THREE.BufferAttribute(hAlpha, 1));
    hGeo.setAttribute("aColor", new THREE.BufferAttribute(hCol, 3));
    hGeo.userData = { haloIdx: haloIdx };

    var hMat = new THREE.ShaderMaterial({
      uniforms: {
        uY0: { value: state.yMin },
        uY1: { value: state.yMax },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: VERT_POINTS,
      fragmentShader: FRAG_HALO,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    haloMesh = new THREE.Points(hGeo, hMat);
    scene.add(haloMesh);

    var eTotal = state.edges.length / 2;
    var eBase = state.map.edges_base;
    var ePos = new Float32Array(eTotal * 6);
    var eYears = new Float32Array(eTotal * 4);
    var eBaseAttr = new Float32Array(eTotal * 2);
    for (var e = 0; e < eTotal; e++) {
      var u = state.edges[e * 2];
      var v = state.edges[e * 2 + 1];
      ePos[e * 6] = worldPositions[u * 3];
      ePos[e * 6 + 1] = worldPositions[u * 3 + 1];
      ePos[e * 6 + 2] = worldPositions[u * 3 + 2];
      ePos[e * 6 + 3] = worldPositions[v * 3];
      ePos[e * 6 + 4] = worldPositions[v * 3 + 1];
      ePos[e * 6 + 5] = worldPositions[v * 3 + 2];
      var yu = years[u];
      var yv = years[v];
      eYears[e * 4] = yu;
      eYears[e * 4 + 1] = yv;
      eYears[e * 4 + 2] = yu;
      eYears[e * 4 + 3] = yv;
      var isB = e < eBase ? 1.0 : 0.0;
      eBaseAttr[e * 2] = isB;
      eBaseAttr[e * 2 + 1] = isB;
    }
    var eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
    eGeo.setAttribute("aYears", new THREE.BufferAttribute(eYears, 2));
    eGeo.setAttribute("aBase", new THREE.BufferAttribute(eBaseAttr, 1));
    var eMat = new THREE.ShaderMaterial({
      uniforms: {
        uY0: { value: state.yMin },
        uY1: { value: state.yMax },
        uShowAll: { value: 0.0 },
        uEdgeColor: { value: new THREE.Color(0x4b6094) },
        uEdgeOpacity: { value: 0.11 }
      },
      vertexShader: VERT_EDGES,
      fragmentShader: FRAG_EDGES,
      transparent: true,
      depthWrite: false
    });
    edgesMesh = new THREE.LineSegments(eGeo, eMat);
    scene.add(edgesMesh);

    ringGroup = new THREE.Group();
    stalkGroup = new THREE.Group();
    var ringYears = [
      { y: 1959, txt: "1959 · Wall & Erpenbeck splitting" },
      { y: 1980, txt: "1980 · Northrup, McCammon & Karplus" },
      { y: 1984, txt: "1984 · NAM Brownian surfaces" },
      { y: 1989, txt: "1989 · Hill steady flux" },
      { y: 1996, txt: "1996 · Huber & Kim" },
      { y: 2010, txt: "2010 · Zhang & Bhatt" },
      { y: 2015, txt: "2015 · WESTPA" },
      { y: 2020, txt: "2020" },
      { y: 2025, txt: "2025" }
    ];
    var ringRad = state.map.col_radius + 5.8;
    var labelsRoot = document.getElementById("labels");
    labelsRoot.innerHTML = "";

    ringYears.forEach(function (rObj) {
      var ry = rObj.y;
      var pts = [];
      var segs = 96;
      var yy = yearToY(ry);
      for (var s = 0; s <= segs; s++) {
        var ang = (s / segs) * Math.PI * 2.0;
        pts.push(new THREE.Vector3(Math.cos(ang) * ringRad, yy, Math.sin(ang) * ringRad));
      }
      var rGeo = new THREE.BufferGeometry().setFromPoints(pts);
      var isRootYr = ry === 1996 || ry === 1980;
      var rMat = new THREE.LineBasicMaterial({
        color: ry === 1996 ? 0xf5b942 : (ry === 1980 ? 0x54c5eb : 0x3b4b72),
        transparent: true,
        opacity: isRootYr ? 0.45 : 0.22
      });
      ringGroup.add(new THREE.Line(rGeo, rMat));

      var rLbl = document.createElement("div");
      rLbl.className = "year-ring-label";
      rLbl.textContent = rObj.txt;
      if (ry === 1996) rLbl.style.color = "#f5b942";
      if (ry === 1980) rLbl.style.color = "#54c5eb";
      labelsRoot.appendChild(rLbl);
      ringDomLabels.push({ el: rLbl, pos: new THREE.Vector3(-ringRad * 0.88, yy, ringRad * 0.46) });
    });
    scene.add(ringGroup);

    state.map.subfields.forEach(function (sf) {
      var sPts = [
        new THREE.Vector3(sf.cx, yearToY(1980), sf.cz),
        new THREE.Vector3(sf.cx, yearToY(2026) + 1.4, sf.cz)
      ];
      var sGeo = new THREE.BufferGeometry().setFromPoints(sPts);
      var sMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(sf.color),
        transparent: true,
        opacity: 0.24
      });
      stalkGroup.add(new THREE.Line(sGeo, sMat));

      var cLbl = document.createElement("div");
      cLbl.className = "col-label";
      cLbl.textContent = sf.short;
      cLbl.onclick = function () {
        selectSubfield(state.activeSubfield === sf.id ? -1 : sf.id);
      };
      labelsRoot.appendChild(cLbl);
      colDomLabels.push({
        id: sf.id,
        el: cLbl,
        pos: new THREE.Vector3(sf.cx, yearToY(2026) + 2.5, sf.cz)
      });
    });
    scene.add(stalkGroup);

    var rayGeo = new THREE.BufferGeometry();
    rayGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    rayGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
    rayMesh = new THREE.LineSegments(
      rayGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false })
    );
    scene.add(rayMesh);

    var aGeo = new THREE.BufferGeometry();
    aGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    aGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
    auditMesh = new THREE.LineSegments(
      aGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.94, depthWrite: false })
    );
    scene.add(auditMesh);
    rebuildAuditArcs(-1);
  }

  function addArc(segPos, segCol, u, v, rgb0, rgb1) {
    if (u < 0 || v < 0 || u >= state.nTotal || v >= state.nTotal || u === v) return;
    var p0 = new THREE.Vector3(worldPositions[u * 3], worldPositions[u * 3 + 1], worldPositions[u * 3 + 2]);
    var p2 = new THREE.Vector3(worldPositions[v * 3], worldPositions[v * 3 + 1], worldPositions[v * 3 + 2]);
    var mid = p0.clone().add(p2).multiplyScalar(0.5);
    mid.x *= 1.18;
    mid.z *= 1.18;
    mid.y += 2.0;
    var curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    var pts = curve.getPoints(20);
    for (var s = 0; s < pts.length - 1; s++) {
      segPos.push(pts[s].x, pts[s].y, pts[s].z, pts[s + 1].x, pts[s + 1].y, pts[s + 1].z);
      var t = s / (pts.length - 1);
      var r = rgb0[0] + (rgb1[0] - rgb0[0]) * t;
      var g = rgb0[1] + (rgb1[1] - rgb0[1]) * t;
      var b = rgb0[2] + (rgb1[2] - rgb0[2]) * t;
      segCol.push(r, g, b, r, g, b);
    }
  }

  function rebuildAuditArcs(singleAuditIdx) {
    if (!auditMesh || !worldPositions) return;
    var segPos = [];
    var segCol = [];
    var list = singleAuditIdx >= 0 && state.audits[singleAuditIdx] ? [state.audits[singleAuditIdx]] : state.audits;
    list.forEach(function (a) {
      if (a.src_idx >= 0 && a.target_idx >= 0) {
        addArc(segPos, segCol, a.src_idx, a.target_idx, [0.98, 0.74, 0.26], [0.24, 0.86, 0.59]);
      }
      (a.events || []).forEach(function (ev) {
        if (a.src_idx >= 0 && ev.citing_idx >= 0) {
          var endCol = [0.33, 0.77, 0.92];
          if (ev.kind === "copies") endCol = [1.0, 0.36, 0.36];
          else if (ev.kind === "criticizes") endCol = [0.24, 0.88, 0.58];
          addArc(segPos, segCol, a.src_idx, ev.citing_idx, [0.98, 0.74, 0.26], endCol);
        }
      });
    });
    auditMesh.geometry.dispose();
    var nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segPos), 3));
    nGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(segCol), 3));
    auditMesh.geometry = nGeo;
    auditMesh.visible = state.showAudits;
  }

  function refreshColorsAndAlphas() {
    if (!pointsMesh) return;
    var n = state.nTotal;
    var pCol = pointsMesh.geometry.attributes.aColor;
    var pAlp = pointsMesh.geometry.attributes.aAlpha;
    for (var i = 0; i < n; i++) {
      var rgb = computeNodeColor(i);
      pCol.array[i * 3] = rgb[0];
      pCol.array[i * 3 + 1] = rgb[1];
      pCol.array[i * 3 + 2] = rgb[2];
      pAlp.array[i] = computeNodeAlpha(i);
    }
    pCol.needsUpdate = true;
    pAlp.needsUpdate = true;

    var hIdx = haloMesh.geometry.userData.haloIdx;
    var hCol = haloMesh.geometry.attributes.aColor;
    var hAlp = haloMesh.geometry.attributes.aAlpha;
    for (var k = 0; k < hIdx.length; k++) {
      var idx = hIdx[k];
      hCol.array[k * 3] = pCol.array[idx * 3];
      hCol.array[k * 3 + 1] = pCol.array[idx * 3 + 1];
      hCol.array[k * 3 + 2] = pCol.array[idx * 3 + 2];
      hAlp.array[k] = pAlp.array[idx];
    }
    hCol.needsUpdate = true;
    hAlp.needsUpdate = true;

    edgesMesh.material.uniforms.uShowAll.value = state.showAll ? 1.0 : 0.0;
    edgesMesh.visible = state.showEdges;
    renderLegend();
    updateHudStats();
  }

  function setRaysForNode(idx, lineagePath) {
    ensureAdjacency();
    var pArr = pointsMesh.geometry.attributes.position.array;
    var posOut = [];
    var colOut = [];

    if (lineagePath && lineagePath.length > 1) {
      for (var p = 0; p < lineagePath.length - 1; p++) {
        addArc(posOut, colOut, lineagePath[p], lineagePath[p + 1], [0.98, 0.58, 0.92], [0.98, 0.82, 0.32]);
      }
    } else if (idx >= 0) {
      var outs = state.outAdj[idx] || [];
      var ins = state.inAdj[idx] || [];
      var x0 = pArr[idx * 3], y0 = pArr[idx * 3 + 1], z0 = pArr[idx * 3 + 2];
      for (var i = 0; i < Math.min(outs.length, 400); i++) {
        var dst = outs[i];
        if (!state.showAll && dst >= state.nBase) continue;
        posOut.push(x0, y0, z0, pArr[dst * 3], pArr[dst * 3 + 1], pArr[dst * 3 + 2]);
        colOut.push(0.33, 0.77, 0.94, 0.22, 0.55, 0.86);
      }
      for (var j = 0; j < Math.min(ins.length, 400); j++) {
        var src = ins[j];
        if (!state.showAll && src >= state.nBase) continue;
        posOut.push(x0, y0, z0, pArr[src * 3], pArr[src * 3 + 1], pArr[src * 3 + 2]);
        colOut.push(0.96, 0.74, 0.26, 0.96, 0.56, 0.22);
      }
    }

    rayMesh.geometry.dispose();
    var nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(posOut), 3));
    nGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colOut), 3));
    rayMesh.geometry = nGeo;
  }

  function findLineageFromRoot(targetIdx) {
    ensureAdjacency();
    var root = state.map.root_idx;
    if (targetIdx === root) return [root];
    var visited = new Int32Array(state.nTotal);
    for (var i = 0; i < state.nTotal; i++) visited[i] = -1;
    var queue = [root];
    visited[root] = root;
    var head = 0;
    while (head < queue.length) {
      var cur = queue[head++];
      var citing = state.inAdj[cur] || [];
      for (var k = 0; k < citing.length; k++) {
        var nxt = citing[k];
        if (visited[nxt] === -1) {
          visited[nxt] = cur;
          if (nxt === targetIdx) {
            var path = [targetIdx];
            var step = targetIdx;
            while (step !== root) {
              step = visited[step];
              path.push(step);
            }
            path.reverse();
            return path;
          }
          queue.push(nxt);
        }
      }
    }
    return null;
  }

  function pickNodeAtScreen(clientX, clientY) {
    if (!pointsMesh) return -1;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var pArr = pointsMesh.geometry.attributes.position.array;
    var bestIdx = -1;
    var bestScore = 1e9;
    var v = new THREE.Vector3();
    var maxN = state.showAll ? state.nTotal : state.nBase;

    for (var i = 0; i < maxN; i++) {
      var yr = state.pos[i * 3 + 1];
      if (yr < state.yMin || yr > state.yMax) continue;
      if (state.activeSubfield >= 0 && state.col[i] !== state.activeSubfield) continue;
      v.set(pArr[i * 3], pArr[i * 3 + 1], pArr[i * 3 + 2]);
      v.project(camera);
      if (v.z < -1 || v.z > 1) continue;
      var sx = (v.x * 0.5 + 0.5) * w;
      var sy = (-v.y * 0.5 + 0.5) * h;
      var dx = sx - clientX;
      var dy = sy - clientY;
      var d2 = dx * dx + dy * dy;
      if (d2 <= 196.0) {
        var score = d2 - 34.0 * state.pr[i];
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
    }
    return bestIdx;
  }

  function badgesHtml(idx) {
    var flg = state.flag[idx];
    var parts = [];
    if (idx === state.map.root_idx) {
      parts.push('<span class="badge badge-seed">1996 Root Paper</span>');
    } else if (flg & 1) {
      parts.push('<span class="badge badge-seed">Core Weighted Ensemble</span>');
    }
    var ft = state.ftMeta[idx];
    if (ft) {
      parts.push('<span class="badge badge-pdf">Full Text · ' + ft.w.toLocaleString() + "w · " + ft.e + " eq</span>");
    } else if (flg & 2) {
      parts.push('<span class="badge badge-pdf">Flatiron PDF</span>');
    }
    if (flg & 8) parts.push('<span class="badge badge-check">Cited in weighted/</span>');
    if (!ft && (flg & 4)) parts.push('<span class="badge badge-oa">Open Access</span>');
    if ((flg & 1) && !(flg & 2) && !(flg & 4) && !ft) {
      parts.push('<span class="badge badge-missing">Missing PDF</span>');
    }
    if (flg & 16) parts.push('<span class="badge badge-check">Verified Audit</span>');
    return parts.join("");
  }

  function renderMath(tex, displayMode) {
    if (window.katex && tex) {
      try {
        return window.katex.renderToString(tex, {
          displayMode: displayMode !== false,
          throwOnError: false
        });
      } catch (e) {
        return "<code>" + tex + "</code>";
      }
    }
    return "<code>" + (tex || "") + "</code>";
  }

  function openNodeCard(idx) {
    if (idx < 0 || idx >= state.nTotal) {
      state.selectedNode = -1;
      state.highlightedSet = null;
      document.getElementById("node-card").classList.remove("open");
      setRaysForNode(-1, null);
      refreshColorsAndAlphas();
      return;
    }
    if (idx >= state.nBase && !state.showAll) {
      state.showAll = true;
      document.getElementById("chk-all").checked = true;
    }
    ensureAdjacency();
    state.selectedNode = idx;
    var m = state.meta[idx];
    var sf = state.map.subfields[state.col[idx]];
    var pArr = pointsMesh.geometry.attributes.position.array;
    cam.goalTx = pArr[idx * 3] * 0.45;
    cam.goalTy = pArr[idx * 3 + 1];
    cam.goalTz = pArr[idx * 3 + 2] * 0.45;

    document.getElementById("card-title").textContent = m[0];
    document.getElementById("card-authors").textContent =
      (m[2] || m[1]) + " · " + (m[6] || "Preprint / Monograph") + " (" + m[3] + ")";
    document.getElementById("card-badges").innerHTML = badgesHtml(idx);

    var outs = state.outAdj[idx] || [];
    var ins = state.inAdj[idx] || [];
    var hopTxt = m[10] >= 0 ? " · " + m[10] + " hops from Huber 1996" : "";
    document.getElementById("card-stats").textContent =
      m[4] + " global cites · cites " + outs.length + " · cited by " + ins.length + hopTxt;

    var linksHtml = [];
    linksHtml.push(
      '<span class="card-link" id="btn-subfield-jump" style="color:' + sf.color + '">' + sf.short + "</span>"
    );
    if (m[5]) {
      linksHtml.push(
        '<a class="card-link" href="https://doi.org/' +
          encodeURIComponent(m[5]).replace(/%2F/g, "/") +
          '" target="_blank" rel="noopener">DOI</a>'
      );
    }
    if (m[7]) {
      linksHtml.push('<a class="card-link" href="' + m[7] + '" target="_blank" rel="noopener">Open Access</a>');
    }
    if (m[10] > 0) {
      linksHtml.push('<button class="card-link" id="btn-trace-root">Trace lineage to Huber 1996</button>');
    }
    var matchingAuditIdx = -1;
    for (var ai = 0; ai < state.audits.length; ai++) {
      if (state.audits[ai].src_idx === idx || state.audits[ai].target_idx === idx) {
        matchingAuditIdx = ai;
        break;
      }
    }
    if (matchingAuditIdx >= 0) {
      linksHtml.push('<button class="card-link" id="btn-open-audit" style="border-color:var(--purple);color:var(--purple)">Open Audit Card</button>');
    }
    document.getElementById("card-links").innerHTML = linksHtml.join("");

    var codeDiv = document.getElementById("card-code");
    var ft = state.ftMeta[idx];
    var codeParts = [];
    if (m[8]) codeParts.push("Flatiron file " + m[8]);
    if (m[9]) codeParts.push("referenced in " + m[9]);
    if (ft && ft.t) codeParts.push("ingested via " + ft.t);
    codeDiv.textContent = codeParts.join(" · ");

    var eqBox = document.getElementById("card-eq");
    if (ft && ft.q) {
      eqBox.innerHTML =
        '<div class="math-box" style="font-size:11.6px;">' +
        (ft.f === "latex" ? renderMath(ft.q, true) : "<code>" + ft.q.replace(/</g, "&lt;") + "</code>") +
        "</div>";
    } else {
      eqBox.innerHTML = "";
    }

    document.getElementById("card-abstract").textContent =
      m[11] ? m[11] + (m[11].length >= 415 ? "..." : "") : "Abstract metadata not indexed in OpenAlex.";

    var nbrBox = document.getElementById("card-neighbors");
    var topIns = ins.slice().sort(function (a, b) { return state.pr[b] - state.pr[a]; }).slice(0, 4);
    var topOuts = outs.slice().sort(function (a, b) { return state.pr[b] - state.pr[a]; }).slice(0, 4);
    var nHtml = "";
    if (topIns.length) {
      nHtml += '<div class="sr-group" style="padding-left:0;">Cited downstream by</div>';
      topIns.forEach(function (u) {
        var mu = state.meta[u];
        nHtml +=
          '<div class="neighbor-item" data-node="' + u + '">↑ ' + mu[1] + " (" + mu[3] + ") · " + mu[0].slice(0, 68) + "</div>";
      });
    }
    if (topOuts.length) {
      nHtml += '<div class="sr-group" style="padding-left:0;margin-top:6px;">Builds upon</div>';
      topOuts.forEach(function (v) {
        var mv = state.meta[v];
        nHtml +=
          '<div class="neighbor-item" data-node="' + v + '">↓ ' + mv[1] + " (" + mv[3] + ") · " + mv[0].slice(0, 68) + "</div>";
      });
    }
    nbrBox.innerHTML = nHtml;
    nbrBox.querySelectorAll(".neighbor-item").forEach(function (el) {
      el.onclick = function () {
        openNodeCard(parseInt(el.getAttribute("data-node"), 10));
      };
    });

    var sfJump = document.getElementById("btn-subfield-jump");
    if (sfJump) sfJump.onclick = function () { selectSubfield(sf.id); };

    var auditBtn = document.getElementById("btn-open-audit");
    if (auditBtn) {
      auditBtn.onclick = function () {
        state.activeAuditIdx = matchingAuditIdx;
        state.auditFilter = "all";
        openDrawer("audits");
      };
    }

    var traceBtn = document.getElementById("btn-trace-root");
    if (traceBtn) {
      traceBtn.onclick = function () {
        var path = findLineageFromRoot(idx);
        if (path) {
          state.highlightedSet = new Set(path);
          setRaysForNode(idx, path);
          refreshColorsAndAlphas();
          var chainHtml = '<div class="sr-group" style="padding-left:0;">Lineage from Huber &amp; Kim 1996</div>';
          path.forEach(function (pNode, stepIdx) {
            var mp = state.meta[pNode];
            chainHtml +=
              '<div class="neighbor-item" data-node="' +
              pNode +
              '">' +
              (stepIdx + 1) +
              ". " +
              mp[1] +
              " (" +
              mp[3] +
              ") · " +
              mp[0].slice(0, 64) +
              "</div>";
          });
          nbrBox.innerHTML = chainHtml;
          nbrBox.querySelectorAll(".neighbor-item").forEach(function (el) {
            el.onclick = function () {
              openNodeCard(parseInt(el.getAttribute("data-node"), 10));
            };
          });
        }
      };
    }

    state.highlightedSet = null;
    setRaysForNode(idx, null);
    refreshColorsAndAlphas();
    document.getElementById("node-card").classList.add("open");
  }

  function selectSubfield(sfId) {
    state.activeSubfield = sfId;
    document.getElementById("subfield-select").value = String(sfId);
    colDomLabels.forEach(function (c) {
      c.el.classList.toggle("active", c.id === sfId);
    });
    if (sfId >= 0) {
      var sf = state.map.subfields[sfId];
      cam.goalTx = sf.cx * 0.55;
      cam.goalTz = sf.cz * 0.55;
      cam.goalTy = 5.0;
      cam.goalRadius = 56.0;
    } else {
      cam.goalTx = 0.0;
      cam.goalTy = 5.0;
      cam.goalTz = 0.0;
      cam.goalRadius = 72.0;
    }
    refreshColorsAndAlphas();
  }

  function renderLegend() {
    var leg = document.getElementById("legend");
    var mode = state.colorMode;
    if (mode === "core") {
      leg.innerHTML =
        '<div class="leg-item"><span class="leg-dot" style="background:#f5b942"></span>Core Weighted Ensemble paper (' +
        state.map.n_core +
        ")</div>" +
        '<div class="leg-item"><span class="leg-dot" style="background:#6378b0"></span>Cited ancestor or rare event neighbor</div>';
      return;
    }
    if (mode === "coverage") {
      var ftCount = Object.keys(state.ftMeta).length;
      leg.innerHTML =
        '<div class="leg-item"><span class="leg-dot" style="background:#3ddc97"></span>Full text ingested / Flatiron (' +
        Math.max(ftCount, state.map.n_local_works) +
        ")</div>" +
        '<div class="leg-item"><span class="leg-dot" style="background:#54c5eb"></span>Open Access online</div>' +
        '<div class="leg-item"><span class="leg-dot" style="background:#ff6b6b"></span>Closed access core gap (' +
        state.map.n_core_missing +
        ")</div>" +
        '<div class="leg-item"><span class="leg-dot" style="background:#61739e"></span>Context shell</div>';
      return;
    }
    if (mode === "year") {
      leg.innerHTML =
        '<div class="leg-item"><span class="leg-dot" style="background:#3d6be0"></span>1951 to 1995 foundations</div>' +
        '<div class="leg-item"><span class="leg-dot" style="background:#52c7ea"></span>1996 to 2016 expansion</div>' +
        '<div class="leg-item"><span class="leg-dot" style="background:#f5b942"></span>2017 to 2026 modern era</div>';
      return;
    }
    leg.innerHTML = state.map.subfields
      .map(function (sf) {
        return (
          '<div class="leg-item" data-sf="' +
          sf.id +
          '"><span class="leg-dot" style="background:' +
          sf.color +
          '"></span>' +
          sf.short +
          "</div>"
        );
      })
      .join("");
    leg.querySelectorAll(".leg-item").forEach(function (el) {
      el.onclick = function () {
        var id = parseInt(el.getAttribute("data-sf"), 10);
        selectSubfield(state.activeSubfield === id ? -1 : id);
      };
    });
  }

  function updateHudStats() {
    var shown = state.showAll ? state.nTotal : state.nBase;
    var edgesShown = state.showAll ? state.map.edges_total : state.map.edges_base;
    var ftCount = Object.keys(state.ftMeta).length;
    document.getElementById("hud-stats").textContent =
      shown.toLocaleString() +
      " papers & " +
      edgesShown.toLocaleString() +
      " citation edges · " +
      (ftCount || 311) +
      " full texts & " +
      state.audits.length +
      " verified audits. Drag to rotate, scroll to zoom, right drag to pan, click any star.";
  }

  function sparklineSvg(vals, color) {
    var maxV = Math.max.apply(null, vals.concat([1]));
    var w = 320;
    var h = 52;
    var bw = w / vals.length;
    var bars = vals
      .map(function (v, idx) {
        var bh = Math.max(1.5, (v / maxV) * (h - 10));
        return (
          '<rect x="' +
          (idx * bw + 0.8).toFixed(1) +
          '" y="' +
          (h - bh).toFixed(1) +
          '" width="' +
          Math.max(1.5, bw - 1.6).toFixed(1) +
          '" height="' +
          bh.toFixed(1) +
          '" rx="1.5" fill="' +
          color +
          '" opacity="0.88"><title>' +
          (1996 + idx) +
          " (" +
          v +
          " core papers)</title></rect>"
        );
      })
      .join("");
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" height="58">' + bars + "</svg>";
  }

  function renderCitationsInline(text) {
    return (text || "").replace(/\[([^\]]+)\]\(node:(\d+)\)/g, function (_m, label, nStr) {
      return '<span class="cite-chip" data-cite-node="' + nStr + '">' + label + "</span>";
    });
  }

  function wireInlineCitations(container) {
    var tip = document.getElementById("tooltip");
    container.querySelectorAll("[data-cite-node]").forEach(function (chip) {
      var idx = parseInt(chip.getAttribute("data-cite-node"), 10);
      chip.onmouseenter = function (ev) {
        if (idx >= 0 && idx < state.nTotal) {
          var m = state.meta[idx];
          tip.innerHTML =
            '<div class="tip-title">' +
            m[0] +
            '</div><div class="tip-meta">' +
            m[1] +
            " · " +
            (m[6] || "") +
            " (" +
            m[3] +
            ") · " +
            m[4] +
            " cites</div>" +
            '<div class="badge-row">' +
            badgesHtml(idx) +
            "</div>";
          tip.style.left = Math.min(window.innerWidth - 350, ev.clientX + 12) + "px";
          tip.style.top = Math.min(window.innerHeight - 110, ev.clientY + 12) + "px";
          tip.style.display = "block";
        }
      };
      chip.onmouseleave = function () {
        tip.style.display = "none";
      };
      chip.onclick = function () {
        tip.style.display = "none";
        openDrawer("");
        openNodeCard(idx);
      };
    });
  }

  function toggleStoryMode(turnOn) {
    state.storyOpen = turnOn;
    var sp = document.getElementById("story-panel");
    var hud = document.getElementById("hud");
    document.getElementById("btn-story").classList.toggle("active", turnOn);
    if (turnOn) {
      openDrawer("");
      hud.style.display = "none";
      sp.classList.add("open");
      renderStoryPanel();
      applyStoryStep(state.storyIdx);
    } else {
      sp.classList.remove("open");
      hud.style.display = "flex";
      document.getElementById("btn-explore").classList.add("active");
    }
  }

  function renderStoryPanel() {
    var sp = document.getElementById("story-panel");
    var steps = state.storySteps;
    if (!steps || !steps.length) {
      sp.innerHTML = '<div class="story-step"><h4>Story Tour</h4><p>Tour steps loading.</p></div>';
      return;
    }
    sp.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<strong style="font-size:14.5px;">Guided 3D Tour (1951 to 2026)</strong>' +
      '<button class="card-close" id="story-close">✕</button></div>' +
      steps
        .map(function (st, idx) {
          return (
            '<div class="story-step ' +
            (idx === state.storyIdx ? "active" : "") +
            '" data-story-idx="' +
            idx +
            '">' +
            '<div class="story-era">' +
            st.era +
            "</div>" +
            "<h4>" +
            st.title +
            "</h4>" +
            "<p>" +
            renderCitationsInline(st.body) +
            "</p></div>"
          );
        })
        .join("") +
      '<button class="hud-btn active" id="story-exit-explore">Enter Full 3D Explore →</button>';

    document.getElementById("story-close").onclick = function () {
      toggleStoryMode(false);
    };
    document.getElementById("story-exit-explore").onclick = function () {
      toggleStoryMode(false);
    };
    sp.querySelectorAll("[data-story-idx]").forEach(function (el) {
      el.onclick = function () {
        var idx = parseInt(el.getAttribute("data-story-idx"), 10);
        state.storyIdx = idx;
        renderStoryPanel();
        applyStoryStep(idx);
      };
    });
    wireInlineCitations(sp);
  }

  function applyStoryStep(idx) {
    var st = state.storySteps[idx];
    if (!st) return;
    var yMinEl = document.getElementById("year-min");
    var yMaxEl = document.getElementById("year-max");
    yMinEl.value = String(Math.max(1950, st.y0 || 1950));
    yMaxEl.value = String(st.y1 || 2026);
    yMaxEl.oninput();

    state.showAll = Boolean(st.show_all);
    document.getElementById("chk-all").checked = state.showAll;

    state.colorMode = st.color_mode || "core";
    document.getElementById("color-select").value = state.colorMode;

    state.showAudits = Boolean(st.show_audits);
    document.getElementById("chk-audits").checked = state.showAudits;
    rebuildAuditArcs(-1);

    if (typeof st.subfield === "number") {
      selectSubfield(st.subfield);
    } else {
      selectSubfield(-1);
    }
    if (typeof st.radius === "number") cam.goalRadius = st.radius;
    if (typeof st.ty === "number") cam.goalTy = st.ty;
    if (typeof st.focus_node === "number" && st.focus_node >= 0) {
      openNodeCard(st.focus_node);
    } else {
      openNodeCard(-1);
    }
    refreshColorsAndAlphas();
  }

  function openDrawer(name) {
    var drawer = document.getElementById("drawer");
    if (name && state.storyOpen) {
      state.storyOpen = false;
      document.getElementById("story-panel").classList.remove("open");
      document.getElementById("hud").style.display = "flex";
      document.getElementById("btn-story").classList.remove("active");
    }
    if (!name || state.activeDrawer === name) {
      state.activeDrawer = "";
      drawer.classList.remove("open");
    } else {
      state.activeDrawer = name;
      drawer.classList.add("open");
      populateDrawer(name);
    }
    document.querySelectorAll("[data-drawer]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-drawer") === state.activeDrawer && !state.storyOpen);
    });
  }

  function populateDrawer(name) {
    var titleEl = document.getElementById("drawer-title");
    var bodyEl = document.getElementById("drawer-body");

    if (name === "audits") {
      titleEl.textContent = "Audit & Citation Propagation Browser (" + state.audits.length + " Verified)";
      var filtered = state.audits.filter(function (a) {
        return state.auditFilter === "all" || a.severity === state.auditFilter;
      });
      if (!filtered.length) filtered = state.audits;
      if (state.activeAuditIdx >= filtered.length) state.activeAuditIdx = 0;

      var severities = ["all", "Published correction", "Estimator bias", "Validity condition", "Citation & metadata"];
      var filterPills = severities
        .map(function (sv) {
          return (
            '<button class="pill-btn ' +
            (state.auditFilter === sv ? "active" : "") +
            '" data-aud-filt="' +
            sv +
            '">' +
            (sv === "all" ? "All (" + state.audits.length + ")" : sv) +
            "</button>"
          );
        })
        .join("");

      // Interactive Handmer-style SVG sparkline bar strip
      var sw = 480, sh = 46;
      var bw = sw / Math.max(1, filtered.length);
      var maxEv = 1;
      filtered.forEach(function (a) {
        maxEv = Math.max(maxEv, 1 + (a.events ? a.events.length : 0));
      });
      var sparkBars = filtered
        .map(function (a, i) {
          var evN = 1 + (a.events ? a.events.length : 0);
          var bh = Math.max(8, (evN / maxEv) * (sh - 8));
          var col = "#f5b942";
          if (a.severity === "Published correction" || a.severity === "Estimator bias") col = "#ff6b6b";
          else if (a.severity === "Citation & metadata") col = "#b18cfe";
          var stroke = i === state.activeAuditIdx ? ' stroke="#ffffff" stroke-width="1.4"' : "";
          return (
            '<rect class="aud-bar" data-aud-idx="' +
            i +
            '" x="' +
            (i * bw + 1).toFixed(1) +
            '" y="' +
            (sh - bh).toFixed(1) +
            '" width="' +
            Math.max(3, bw - 2.2).toFixed(1) +
            '" height="' +
            bh.toFixed(1) +
            '" rx="2" fill="' +
            col +
            '"' +
            stroke +
            ' style="cursor:pointer;"><title>' +
            a.title +
            "</title></rect>"
          );
        })
        .join("");

      var curA = filtered[state.activeAuditIdx] || filtered[0];
      var globalIdx = state.audits.indexOf(curA);
      var evHtml = (curA.events || [])
        .map(function (ev) {
          var tag = ev.kind === "copies" ? "propagates assumption" : (ev.kind === "criticizes" ? "diagnoses / corrects" : "adopts exact form");
          return (
            '<div class="event-item event-' +
            ev.kind +
            '" data-ev-node="' +
            ev.citing_idx +
            '">' +
            "<strong>" +
            (ev.author || "Citing work") +
            " (" +
            ev.year +
            ") · " +
            tag +
            "</strong><br/>" +
            ev.text +
            "</div>"
          );
        })
        .join("");

      bodyEl.innerHTML =
        '<div class="pill-strip">' +
        filterPills +
        "</div>" +
        '<div class="spark-bar-wrap">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<span class="hud-section-label">Click any bar to inspect (' +
        (state.activeAuditIdx + 1) +
        " of " +
        filtered.length +
        ")</span>" +
        '<div style="display:flex;gap:5px;">' +
        '<button class="pill-btn" id="aud-prev">‹ Prev</button>' +
        '<button class="pill-btn" id="aud-next">Next ›</button>' +
        "</div></div>" +
        '<svg viewBox="0 0 ' + sw + " " + sh + '" width="100%" height="48">' + sparkBars + "</svg>" +
        "</div>" +
        '<div class="audit-card">' +
        '<div class="badge-row" style="margin:0 0 7px 0;">' +
        '<span class="badge badge-check">' + curA.category + "</span>" +
        '<span class="badge badge-seed">' + curA.severity + "</span></div>" +
        "<h4>" + curA.title + "</h4>" +
        '<div style="font-size:11.8px;color:var(--accent);margin-bottom:6px;">' + curA.paper_label + "</div>" +
        "<p><strong>Paper or literature pattern</strong> " + curA.claimed + "</p>" +
        "<p><strong>Verified resolution</strong> " + curA.corrected + "</p>" +
        '<div class="math-box">' + renderMath(curA.math_tex, true) + "</div>" +
        '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;">' +
        (curA.src_idx >= 0 ? '<button class="card-link" id="aud-locate">Illuminate propagation arcs on 3D cylinder</button>' : "") +
        "</div>" +
        (evHtml ? '<div class="hud-section-label" style="margin-top:11px;"><span>Verified Citation &amp; Lineage Events</span></div>' + evHtml : "") +
        "</div>" +
        '<div class="hud-section-label" style="margin:12px 0 6px;"><span>All records in current view</span></div>' +
        '<table class="data-table"><thead><tr><th>Year</th><th>Severity</th><th>Finding</th></tr></thead><tbody>' +
        filtered
          .map(function (a, idx) {
            return (
              '<tr data-pick-aud="' +
              idx +
              '" style="' +
              (idx === state.activeAuditIdx ? "background:var(--accent-soft);" : "") +
              '"><td>' +
              a.year +
              "</td><td>" +
              a.severity +
              "</td><td>" +
              a.title +
              "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table>";

      bodyEl.querySelectorAll("[data-aud-filt]").forEach(function (b) {
        b.onclick = function () {
          state.auditFilter = b.getAttribute("data-aud-filt");
          state.activeAuditIdx = 0;
          populateDrawer("audits");
        };
      });
      bodyEl.querySelectorAll("[data-aud-idx]").forEach(function (r) {
        r.onclick = function () {
          state.activeAuditIdx = parseInt(r.getAttribute("data-aud-idx"), 10);
          populateDrawer("audits");
        };
      });
      bodyEl.querySelectorAll("[data-pick-aud]").forEach(function (tr) {
        tr.onclick = function () {
          state.activeAuditIdx = parseInt(tr.getAttribute("data-pick-aud"), 10);
          populateDrawer("audits");
          bodyEl.scrollTop = 0;
        };
      });
      document.getElementById("aud-prev").onclick = function () {
        state.activeAuditIdx = (state.activeAuditIdx - 1 + filtered.length) % filtered.length;
        populateDrawer("audits");
      };
      document.getElementById("aud-next").onclick = function () {
        state.activeAuditIdx = (state.activeAuditIdx + 1) % filtered.length;
        populateDrawer("audits");
      };
      var locBtn = document.getElementById("aud-locate");
      if (locBtn) {
        locBtn.onclick = function () {
          state.showAudits = true;
          document.getElementById("chk-audits").checked = true;
          rebuildAuditArcs(globalIdx);
          openDrawer("");
          openNodeCard(curA.src_idx);
        };
      }
      bodyEl.querySelectorAll("[data-ev-node]").forEach(function (el) {
        el.onclick = function () {
          var nIdx = parseInt(el.getAttribute("data-ev-node"), 10);
          if (nIdx >= 0) {
            state.showAudits = true;
            document.getElementById("chk-audits").checked = true;
            rebuildAuditArcs(globalIdx);
            openDrawer("");
            openNodeCard(nIdx);
          }
        };
      });
      return;
    }

    if (name === "subfields") {
      titleEl.textContent = "12 Weighted Ensemble Subfield Dossiers";
      var sf = state.map.subfields[state.activeSubfieldTab] || state.map.subfields[0];
      var pills = state.map.subfields
        .map(function (s) {
          return (
            '<button class="pill-btn ' +
            (s.id === sf.id ? "active" : "") +
            '" data-sf-tab="' +
            s.id +
            '">' +
            s.short +
            "</button>"
          );
        })
        .join("");

      var questionsHtml = (sf.questions || [])
        .map(function (q) {
          var cls = q.status === "settled" ? "q-settled" : (q.status === "contested" ? "q-contested" : "q-open");
          var lbl = q.status === "settled" ? "Largely settled" : (q.status === "contested" ? "Contested" : "Open problem");
          return (
            '<div class="q-row">' +
            '<span class="q-status ' + cls + '">' + lbl + "</span>" +
            '<div style="font-weight:600;color:var(--fg);margin-bottom:3px;">' + q.q + "</div>" +
            '<div style="font-size:12px;color:var(--fg-dim);">' + q.detail + "</div></div>"
          );
        })
        .join("");

      var topPapers = sf.top_nodes
        .map(function (idx) {
          var m = state.meta[idx];
          return (
            '<tr data-node="' + idx + '"><td>' + m[3] + "</td><td>" + m[1] + "</td><td>" + m[0] + "</td><td>" + m[4] + "</td></tr>"
          );
        })
        .join("");

      bodyEl.innerHTML =
        '<div class="pill-strip">' + pills + "</div>" +
        '<h3 style="margin:4px 0;color:' + sf.color + '">' + sf.name + "</h3>" +
        '<p style="color:var(--fg-dim);margin:6px 0 12px 0;">' + sf.summary + "</p>" +
        '<div class="stat-grid">' +
        '<div class="stat-box"><div class="stat-val">' + sf.count_core + '</div><div class="stat-lbl">Core Weighted Ensemble</div></div>' +
        '<div class="stat-box"><div class="stat-val">' + sf.count_total + '</div><div class="stat-lbl">Total with context shell</div></div>' +
        '<div class="stat-box"><div class="stat-val">' + sf.count_local + '</div><div class="stat-lbl">In Flatiron PDFs</div></div>' +
        '<div class="stat-box"><div class="stat-val">' + sf.count_oa + '</div><div class="stat-lbl">Open Access online</div></div>' +
        "</div>" +
        '<div class="hud-section-label" style="margin:10px 0 4px;"><span>Core papers per year (1996 to 2026)</span></div>' +
        sparklineSvg(sf.hist_1996_2026, sf.color) +
        '<div style="margin:8px 0 12px;"><button class="card-link" id="btn-focus-col">Focus 3D camera on ' + sf.short + "</button></div>" +
        (questionsHtml ? '<div class="hud-section-label" style="margin:12px 0 6px;"><span>Settled, Open &amp; Contested Questions</span></div>' + questionsHtml : "") +
        '<div class="hud-section-label" style="margin:12px 0 6px;"><span>Central papers in column</span></div>' +
        '<table class="data-table"><thead><tr><th>Year</th><th>Author</th><th>Title</th><th>Cites</th></tr></thead><tbody>' +
        topPapers +
        "</tbody></table>";

      bodyEl.querySelectorAll("[data-sf-tab]").forEach(function (btn) {
        btn.onclick = function () {
          state.activeSubfieldTab = parseInt(btn.getAttribute("data-sf-tab"), 10);
          populateDrawer("subfields");
        };
      });
      document.getElementById("btn-focus-col").onclick = function () {
        selectSubfield(sf.id);
        openDrawer("");
      };
      bodyEl.querySelectorAll("tr[data-node]").forEach(function (tr) {
        tr.onclick = function () {
          var nIdx = parseInt(tr.getAttribute("data-node"), 10);
          openDrawer("");
          openNodeCard(nIdx);
        };
      });
      return;
    }

    if (name === "review") {
      titleEl.textContent = "13 Chapter Field Review (Hover or Click Citations)";
      var chs = state.reviewChapters;
      if (!chs || !chs.length) {
        bodyEl.innerHTML = "<p>Review chapters compiling.</p>";
        return;
      }
      if (state.activeReviewIdx >= chs.length) state.activeReviewIdx = 0;
      var ch = chs[state.activeReviewIdx];
      var chPills = chs
        .map(function (c, i) {
          return (
            '<button class="pill-btn ' +
            (i === state.activeReviewIdx ? "active" : "") +
            '" data-rev-idx="' +
            i +
            '">' +
            c.short +
            "</button>"
          );
        })
        .join("");

      var parasHtml = (ch.paragraphs || [])
        .map(function (p) {
          return "<p>" + renderCitationsInline(p) + "</p>";
        })
        .join("");

      bodyEl.innerHTML =
        '<div class="pill-strip">' + chPills + "</div>" +
        '<div class="review-chapter">' +
        '<h3 style="margin:4px 0 10px 0;color:var(--accent);">' + ch.title + "</h3>" +
        parasHtml +
        "</div>";

      bodyEl.querySelectorAll("[data-rev-idx]").forEach(function (b) {
        b.onclick = function () {
          state.activeReviewIdx = parseInt(b.getAttribute("data-rev-idx"), 10);
          populateDrawer("review");
          bodyEl.scrollTop = 0;
        };
      });
      wireInlineCitations(bodyEl);
      return;
    }

    if (name === "opportunities") {
      titleEl.textContent = "AI & Mathematical Opportunities (" + state.opportunities.length + " Research Briefs)";
      var kinds = ["all", "Settle now", "Estimator audit", "Speed up"];
      var kPills = kinds
        .map(function (k) {
          return (
            '<button class="pill-btn ' +
            (state.oppFilter === k ? "active" : "") +
            '" data-opp-filt="' +
            k +
            '">' +
            (k === "all" ? "All (" + state.opportunities.length + ")" : k) +
            "</button>"
          );
        })
        .join("");

      var opps = state.opportunities.filter(function (o) {
        return state.oppFilter === "all" || o.kind === state.oppFilter;
      });

      bodyEl.innerHTML =
        '<div class="pill-strip">' + kPills + "</div>" +
        opps
          .map(function (o, idx) {
            var sf = state.map.subfields[o.subfield_id] || state.map.subfields[0];
            return (
              '<div class="audit-card">' +
              '<div class="badge-row" style="margin:0 0 6px 0;">' +
              '<span class="badge badge-seed">' + o.kind + "</span>" +
              '<span class="badge badge-oa" style="color:' + sf.color + '">' + sf.short + "</span></div>" +
              "<h4>" + o.title + "</h4>" +
              "<p>" + renderCitationsInline(o.summary) + "</p>" +
              "<p><strong>Concrete attack plan</strong> " + renderCitationsInline(o.first_steps) + "</p>" +
              '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;">' +
              '<button class="card-link opp-sf-btn" data-sf="' + sf.id + '">Highlight ' + sf.short + " column</button>" +
              '<button class="card-link opp-dl-btn" data-opp-i="' + idx + '">Download research brief (.md)</button>' +
              "</div></div>"
            );
          })
          .join("");

      bodyEl.querySelectorAll("[data-opp-filt]").forEach(function (b) {
        b.onclick = function () {
          state.oppFilter = b.getAttribute("data-opp-filt");
          populateDrawer("opportunities");
        };
      });
      bodyEl.querySelectorAll(".opp-sf-btn").forEach(function (b) {
        b.onclick = function () {
          selectSubfield(parseInt(b.getAttribute("data-sf"), 10));
          openDrawer("");
        };
      });
      bodyEl.querySelectorAll(".opp-dl-btn").forEach(function (b) {
        b.onclick = function () {
          var o = opps[parseInt(b.getAttribute("data-opp-i"), 10)];
          var md =
            "# Research Brief · " + o.title + "\n\n" +
            "- Category: " + o.kind + "\n" +
            "- Subfield: " + (state.map.subfields[o.subfield_id] || {}).name + "\n\n" +
            "## Problem Statement\n" + o.summary.replace(/\[([^\]]+)\]\(node:\d+\)/g, "$1") + "\n\n" +
            "## Concrete First Steps\n" + o.first_steps.replace(/\[([^\]]+)\]\(node:\d+\)/g, "$1") + "\n";
          var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = (o.slug || "weighted_ensemble_brief") + ".md";
          a.click();
        };
      });
      wireInlineCitations(bodyEl);
      return;
    }

    if (name === "method") {
      titleEl.textContent = "Methodology, Coverage & Benchmark Systems";
      var mTabs = [
        { id: "corpus", lbl: "Corpus & 4 Audit Depths" },
        { id: "coverage", lbl: "Coverage & 22 Missing Papers" },
        { id: "systems", lbl: "145 Benchmark Systems" }
      ];
      var tHtml = mTabs
        .map(function (t) {
          return (
            '<button class="pill-btn ' +
            (state.methodTab === t.id ? "active" : "") +
            '" data-mtab="' +
            t.id +
            '">' +
            t.lbl +
            "</button>"
          );
        })
        .join("");

      var inner = "";
      if (state.methodTab === "corpus") {
        var ftN = Object.keys(state.ftMeta).length || 311;
        inner =
          '<div class="stat-grid">' +
          '<div class="stat-box"><div class="stat-val">' + state.nTotal.toLocaleString() + '</div><div class="stat-lbl">Mapped works (1916 to 2026)</div></div>' +
          '<div class="stat-box"><div class="stat-val">' + state.map.edges_total.toLocaleString() + '</div><div class="stat-lbl">Citation graph edges</div></div>' +
          '<div class="stat-box"><div class="stat-val" style="color:var(--green)">' + ftN + '</div><div class="stat-lbl">Ingested full texts</div></div>' +
          '<div class="stat-box"><div class="stat-val" style="color:var(--accent)">' + state.audits.length + '</div><div class="stat-lbl">Verified audit records</div></div>' +
          "</div>" +
          '<div class="audit-card">' +
          "<h4>Four Depth Literature &amp; Physics Audit Architecture</h4>" +
          "<p><strong>Depth 1 · Seed &amp; Citation Graph Construction</strong> Anchored on the 1951 to 1989 splitting and Brownian dynamics ancestors, Huber &amp; Kim (1996), 29 landmark Weighted Ensemble method and software works, and an institutional reference archive of 257 Weighted Ensemble files, expanded via OpenAlex to 3,154 works and 51,535 citation edges.</p>" +
          "<p><strong>Depth 2 · Multi Channel Full Text &amp; Equation Ingestion</strong> Extracted 311 full texts (84 lossless arXiv <code>.tex</code> source packages, 37 Europe PMC JATS XML articles, 28 open repository PDFs, and 162 digital Flatiron PDFs and text files), indexing 2,990 equations and 1,922 citing sentences inside <code>corpus.sqlite</code>.</p>" +
          "<p><strong>Depth 3 · Two Pass Equation, Estimator &amp; Propagation Verification</strong> Five domain auditors inspected equations, published errata, and estimator validity conditions, paired with cross verification of every node index, DOI, and citing sentence excerpt.</p>" +
          "<p><strong>Depth 4 · Synthesis Into Subfield Dossiers, 13 Chapter Review &amp; Research Briefs</strong> Compiled into 12 subfield dossiers, a 13 chapter hover cited review, a 7 step 3D Story camera tour, and downloadable Markdown research briefs.</p>" +
          "</div>" +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' +
          '<a class="card-link" href="data/audits.json" download>Download audits.json</a>' +
          '<a class="card-link" href="data/systems.json" download>Download systems.json</a>' +
          '<a class="card-link" href="data/missing_high_impact.csv" download>Download missing_high_impact.csv</a>' +
          '<a class="card-link" href="ucsd_22_papers.html" target="_blank">Open 22 Closed Access Journal Launcher</a>' +
          "</div>";
      } else if (state.methodTab === "coverage") {
        var pct = ((100.0 * state.map.n_core_covered) / Math.max(1, state.map.n_core)).toFixed(1);
        var rowsHtml = state.missingTop
          .slice(0, 40)
          .map(function (r) {
            return (
              '<tr data-doi="' + (r.doi || "") + '"><td>' + r.year + "</td><td>" + r.first_author + "</td><td>" + r.title + "</td><td>" + r.journal + "</td><td>" + r.global_citations + "</td></tr>"
            );
          })
          .join("");
        inner =
          '<div class="stat-grid">' +
          '<div class="stat-box"><div class="stat-val">' + state.map.n_core + '</div><div class="stat-lbl">Core Weighted Ensemble</div></div>' +
          '<div class="stat-box"><div class="stat-val" style="color:var(--green)">' + pct + '%</div><div class="stat-lbl">Covered by Flatiron or OA</div></div>' +
          '<div class="stat-box"><div class="stat-val">311</div><div class="stat-lbl">Ingested in SQLite</div></div>' +
          '<div class="stat-box"><div class="stat-val" style="color:var(--red)">22</div><div class="stat-lbl">Closed access journal gap</div></div>' +
          "</div>" +
          '<div style="margin:8px 0 12px;display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="card-link" id="btn-color-cov">Colour 3D cylinder by coverage status</button>' +
          '<a class="card-link" href="ucsd_22_papers.html" target="_blank">Open 22 Journal PDF Launcher</a>' +
          "</div>" +
          '<table class="data-table"><thead><tr><th>Year</th><th>Author</th><th>Title</th><th>Journal</th><th>Cites</th></tr></thead><tbody>' +
          rowsHtml +
          "</tbody></table>";
      } else {
        var sysHtml = state.systems
          .slice(0, 80)
          .map(function (s) {
            return (
              "<tr><td><strong>" + s.system.slice(0, 75) + "</strong></td><td>" + s.lab + "</td><td>" + s.protocol.slice(0, 110) + "</td><td>" + s.reference + "</td></tr>"
            );
          })
          .join("");
        inner =
          '<table class="data-table"><thead><tr><th>System</th><th>Group</th><th>Protocol</th><th>Reference</th></tr></thead><tbody>' +
          sysHtml +
          "</tbody></table>";
      }

      bodyEl.innerHTML = '<div class="pill-strip">' + tHtml + "</div>" + inner;
      bodyEl.querySelectorAll("[data-mtab]").forEach(function (b) {
        b.onclick = function () {
          state.methodTab = b.getAttribute("data-mtab");
          populateDrawer("method");
        };
      });
      var covBtn = document.getElementById("btn-color-cov");
      if (covBtn) {
        covBtn.onclick = function () {
          state.colorMode = "coverage";
          document.getElementById("color-select").value = "coverage";
          refreshColorsAndAlphas();
          openDrawer("");
        };
      }
      bodyEl.querySelectorAll("tr[data-doi]").forEach(function (tr) {
        tr.onclick = function () {
          var d = tr.getAttribute("data-doi");
          if (!d) return;
          for (var i = 0; i < state.nTotal; i++) {
            if (state.meta[i][5] === d) {
              openDrawer("");
              openNodeCard(i);
              break;
            }
          }
        };
      });
    }
  }

  function wireControls() {
    var sfSel = document.getElementById("subfield-select");
    state.map.subfields.forEach(function (sf) {
      var opt = document.createElement("option");
      opt.value = String(sf.id);
      opt.textContent = sf.name + " (" + sf.count_core + ")";
      sfSel.appendChild(opt);
    });
    sfSel.onchange = function () {
      selectSubfield(parseInt(sfSel.value, 10));
    };

    var colSel = document.getElementById("color-select");
    colSel.onchange = function () {
      state.colorMode = colSel.value;
      refreshColorsAndAlphas();
    };

    document.getElementById("lbl-all-papers").textContent =
      "All " + state.nTotal.toLocaleString() + " papers including context shell";
    document.getElementById("lbl-audits-count").textContent =
      "Highlight all " + state.audits.length + " verified audits & arcs";

    var yMinEl = document.getElementById("year-min");
    var yMaxEl = document.getElementById("year-max");
    var yLbl = document.getElementById("year-label");

    function syncYearSliders() {
      var a = parseInt(yMinEl.value, 10);
      var b = parseInt(yMaxEl.value, 10);
      if (a > b) {
        var tmp = a;
        a = b;
        b = tmp;
      }
      state.yMin = a <= 1950 ? 1916 : a;
      state.yMax = b;
      yLbl.textContent = (a <= 1950 ? "start" : String(a)) + " to " + b;
      pointsMesh.material.uniforms.uY0.value = state.yMin;
      pointsMesh.material.uniforms.uY1.value = state.yMax;
      haloMesh.material.uniforms.uY0.value = state.yMin;
      haloMesh.material.uniforms.uY1.value = state.yMax;
      edgesMesh.material.uniforms.uY0.value = state.yMin;
      edgesMesh.material.uniforms.uY1.value = state.yMax;
    }
    yMinEl.oninput = syncYearSliders;
    yMaxEl.oninput = syncYearSliders;

    var playBtn = document.getElementById("play-btn");
    playBtn.onclick = function () {
      state.playing = !state.playing;
      if (state.playing) {
        state.playYear = 1955;
        yMinEl.value = "1950";
        yMaxEl.value = "1955";
        syncYearSliders();
        playBtn.textContent = "⏸ Pause playback";
        playBtn.classList.add("active");
      } else {
        playBtn.textContent = "▶ Play 1955 to 2026";
        playBtn.classList.remove("active");
      }
    };

    document.getElementById("reset-btn").onclick = function () {
      state.playing = false;
      playBtn.textContent = "▶ Play 1955 to 2026";
      playBtn.classList.remove("active");
      yMinEl.value = "1950";
      yMaxEl.value = "2026";
      syncYearSliders();
      state.highlightedSet = null;
      rebuildAuditArcs(-1);
      selectSubfield(-1);
      openNodeCard(-1);
      cam.goalTheta = 0.62;
      cam.goalPhi = 1.24;
      cam.goalRadius = 72.0;
    };

    document.getElementById("chk-audits").onchange = function (ev) {
      state.showAudits = ev.target.checked;
      rebuildAuditArcs(-1);
      if (state.showAudits && !state.storyOpen) openDrawer("audits");
    };

    document.getElementById("chk-all").onchange = function (ev) {
      state.showAll = ev.target.checked;
      refreshColorsAndAlphas();
    };

    document.getElementById("chk-edges").onchange = function (ev) {
      state.showEdges = ev.target.checked;
      edgesMesh.visible = state.showEdges;
    };

    document.getElementById("chk-labels").onchange = function (ev) {
      state.showLabels = ev.target.checked;
      document.getElementById("labels").style.display = state.showLabels ? "block" : "none";
      ringGroup.visible = state.showLabels;
      stalkGroup.visible = state.showLabels;
    };

    document.getElementById("chk-spin").onchange = function (ev) {
      state.slowSpin = ev.target.checked;
    };

    document.getElementById("card-close").onclick = function () {
      openNodeCard(-1);
    };

    document.getElementById("drawer-close").onclick = function () {
      openDrawer("");
    };

    document.getElementById("btn-story").onclick = function () {
      toggleStoryMode(!state.storyOpen);
    };

    document.querySelectorAll("[data-drawer]").forEach(function (btn) {
      btn.onclick = function () {
        var d = btn.getAttribute("data-drawer");
        if (!d && state.storyOpen) {
          toggleStoryMode(false);
          return;
        }
        openDrawer(d);
      };
    });

    document.getElementById("theme-btn").onclick = function () {
      var html = document.documentElement;
      var next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
      html.setAttribute("data-theme", next);
      renderer.setClearColor(next === "light" ? 0xf4f6fb : 0x070a12, 1);
      edgesMesh.material.uniforms.uEdgeColor.value.setHex(next === "light" ? 0x6c7ea8 : 0x4b6094);
    };

    var sInput = document.getElementById("search-input");
    var sBox = document.getElementById("search-results");
    sInput.oninput = function () {
      var q = sInput.value.trim().toLowerCase();
      if (q.length < 2) {
        sBox.classList.remove("open");
        if (state.highlightedSet && state.selectedNode < 0) {
          state.highlightedSet = null;
          refreshColorsAndAlphas();
        }
        return;
      }
      var authorCounts = {};
      var paperMatches = [];
      for (var i = 0; i < state.nTotal; i++) {
        var m = state.meta[i];
        var authLower = (m[2] || m[1]).toLowerCase();
        var titleLower = m[0].toLowerCase();
        var doiLower = (m[5] || "").toLowerCase();
        if (authLower.indexOf(q) !== -1) {
          var names = (m[2] || m[1]).split(",");
          for (var a = 0; a < names.length; a++) {
            var nm = names[a].trim();
            if (nm.toLowerCase().indexOf(q) !== -1) {
              authorCounts[nm] = (authorCounts[nm] || 0) + 1;
            }
          }
        }
        if (titleLower.indexOf(q) !== -1 || authLower.indexOf(q) !== -1 || doiLower.indexOf(q) !== -1) {
          paperMatches.push(i);
        }
      }
      paperMatches.sort(function (a, b) {
        return state.pr[b] - state.pr[a];
      });
      var topAuthors = Object.keys(authorCounts)
        .sort(function (a, b) { return authorCounts[b] - authorCounts[a]; })
        .slice(0, 4);

      var html = "";
      if (topAuthors.length) {
        html += '<div class="sr-group">Authors (click to illuminate all works)</div>';
        topAuthors.forEach(function (au) {
          html +=
            '<div class="sr-item" data-author="' +
            au.replace(/"/g, "&quot;") +
            '"><div class="sr-title">' +
            au +
            '</div><div class="sr-meta">' +
            authorCounts[au] +
            " papers in atlas</div></div>";
        });
      }
      if (paperMatches.length) {
        html += '<div class="sr-group">Papers (' + paperMatches.length + " matches)</div>";
        paperMatches.slice(0, 14).forEach(function (idx) {
          var mp = state.meta[idx];
          html +=
            '<div class="sr-item" data-node="' +
            idx +
            '"><div class="sr-title">' +
            mp[0] +
            '</div><div class="sr-meta">' +
            mp[1] +
            " · " +
            mp[3] +
            " · " +
            mp[4] +
            " cites</div></div>";
        });
      }
      if (!html) {
        html = '<div class="sr-item"><div class="sr-meta">No matching authors or papers</div></div>';
      }
      sBox.innerHTML = html;
      sBox.classList.add("open");

      sBox.querySelectorAll("[data-author]").forEach(function (el) {
        el.onclick = function () {
          var targetAu = el.getAttribute("data-author").toLowerCase();
          var set = new Set();
          for (var k = 0; k < state.nTotal; k++) {
            if ((state.meta[k][2] || state.meta[k][1]).toLowerCase().indexOf(targetAu) !== -1) {
              set.add(k);
            }
          }
          state.showAll = true;
          document.getElementById("chk-all").checked = true;
          state.highlightedSet = set;
          refreshColorsAndAlphas();
          sBox.classList.remove("open");
        };
      });

      sBox.querySelectorAll("[data-node]").forEach(function (el) {
        el.onclick = function () {
          var idx = parseInt(el.getAttribute("data-node"), 10);
          sBox.classList.remove("open");
          openNodeCard(idx);
        };
      });
    };

    var dom = renderer.domElement;
    var tip = document.getElementById("tooltip");

    dom.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    dom.addEventListener("pointerdown", function (e) {
      cam.dragging = true;
      cam.panning = e.button === 2 || e.shiftKey;
      cam.downX = e.clientX;
      cam.downY = e.clientY;
      cam.lastX = e.clientX;
      cam.lastY = e.clientY;
      cam.moved = false;
    });

    window.addEventListener("pointermove", function (e) {
      if (cam.dragging) {
        var dx = e.clientX - cam.lastX;
        var dy = e.clientY - cam.lastY;
        cam.lastX = e.clientX;
        cam.lastY = e.clientY;
        if (Math.hypot(e.clientX - cam.downX, e.clientY - cam.downY) > 4) {
          cam.moved = true;
        }
        if (cam.panning) {
          var panScale = cam.radius * 0.0014;
          var rightX = Math.cos(cam.theta);
          var rightZ = -Math.sin(cam.theta);
          cam.goalTx -= dx * panScale * rightX;
          cam.goalTz -= dx * panScale * rightZ;
          cam.goalTy += dy * panScale;
        } else {
          cam.goalTheta -= dx * 0.0055;
          cam.goalPhi = Math.max(0.18, Math.min(Math.PI - 0.18, cam.goalPhi - dy * 0.0055));
        }
        tip.style.display = "none";
        return;
      }
      if (e.target !== dom) return;
      var pIdx = pickNodeAtScreen(e.clientX, e.clientY);
      state.hoveredNode = pIdx;
      dom.style.cursor = pIdx >= 0 ? "pointer" : "grab";
      if (pIdx >= 0) {
        var m = state.meta[pIdx];
        tip.innerHTML =
          '<div class="tip-title">' +
          m[0] +
          '</div><div class="tip-meta">' +
          m[1] +
          " · " +
          m[3] +
          " · " +
          m[4] +
          " citations</div>" +
          '<div class="badge-row">' +
          badgesHtml(pIdx) +
          "</div>";
        tip.style.left = Math.min(window.innerWidth - 350, e.clientX + 14) + "px";
        tip.style.top = Math.min(window.innerHeight - 110, e.clientY + 14) + "px";
        tip.style.display = "block";
      } else {
        tip.style.display = "none";
      }
    });

    window.addEventListener("pointerup", function (e) {
      if (cam.dragging && !cam.moved && e.target === dom && e.button === 0) {
        var hit = pickNodeAtScreen(e.clientX, e.clientY);
        openNodeCard(hit);
      }
      cam.dragging = false;
    });

    dom.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        cam.goalRadius = Math.max(14.0, Math.min(145.0, cam.goalRadius * (1.0 + e.deltaY * 0.001)));
      },
      { passive: false }
    );

    window.addEventListener("resize", function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var hash = (window.location.hash || "").replace("#", "");
    if (hash === "story") {
      toggleStoryMode(true);
    } else if (["audits", "subfields", "review", "opportunities", "method"].indexOf(hash) !== -1) {
      openDrawer(hash);
    }
  }

  function updateProjectedLabels() {
    if (!state.showLabels) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var tmp = new THREE.Vector3();

    colDomLabels.forEach(function (item) {
      tmp.copy(item.pos).project(camera);
      if (tmp.z < -1 || tmp.z > 1) {
        item.el.style.display = "none";
        return;
      }
      item.el.style.display = "block";
      item.el.style.left = ((tmp.x * 0.5 + 0.5) * w).toFixed(1) + "px";
      item.el.style.top = ((-tmp.y * 0.5 + 0.5) * h).toFixed(1) + "px";
    });

    ringDomLabels.forEach(function (item) {
      tmp.copy(item.pos).project(camera);
      if (tmp.z < -1 || tmp.z > 1) {
        item.el.style.display = "none";
        return;
      }
      item.el.style.display = "block";
      item.el.style.left = ((tmp.x * 0.5 + 0.5) * w).toFixed(1) + "px";
      item.el.style.top = ((-tmp.y * 0.5 + 0.5) * h).toFixed(1) + "px";
    });
  }

  var lastTick = performance.now();
  var playAccum = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    var dt = Math.min(0.05, (now - lastTick) * 0.001);
    lastTick = now;

    if (state.slowSpin && !cam.dragging && state.selectedNode < 0) {
      cam.goalTheta += dt * 0.075;
    }

    if (state.playing) {
      playAccum += dt;
      if (playAccum >= 0.2) {
        playAccum = 0;
        state.playYear += 1;
        if (state.playYear > 2026) {
          state.playing = false;
          var playBtn = document.getElementById("play-btn");
          playBtn.textContent = "▶ Play 1955 to 2026";
          playBtn.classList.remove("active");
        } else {
          var yMaxEl = document.getElementById("year-max");
          yMaxEl.value = String(state.playYear);
          yMaxEl.oninput();
        }
      }
    }

    var damp = 0.14;
    cam.theta += (cam.goalTheta - cam.theta) * damp;
    cam.phi += (cam.goalPhi - cam.phi) * damp;
    cam.radius += (cam.goalRadius - cam.radius) * damp;
    cam.tx += (cam.goalTx - cam.tx) * damp;
    cam.ty += (cam.goalTy - cam.ty) * damp;
    cam.tz += (cam.goalTz - cam.tz) * damp;

    var sinPhi = Math.sin(cam.phi);
    camera.position.set(
      cam.tx + cam.radius * sinPhi * Math.sin(cam.theta),
      cam.ty + cam.radius * Math.cos(cam.phi),
      cam.tz + cam.radius * sinPhi * Math.cos(cam.theta)
    );
    camera.lookAt(cam.tx, cam.ty, cam.tz);

    updateProjectedLabels();
    renderer.render(scene, camera);
  }

  loadAllData()
    .then(function () {
      buildScene();
      wireControls();
      refreshColorsAndAlphas();
      requestAnimationFrame(animate);
    })
    .catch(function (err) {
      document.getElementById("hud-stats").textContent = "Error loading atlas data (" + err.message + ")";
    });
})();
