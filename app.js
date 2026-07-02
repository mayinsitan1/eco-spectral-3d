/*
 * Browser-only 3D animal model viewer.
 *
 * This first-stage viewer intentionally avoids external dependencies. The goal
 * is to provide a reliable baseline for loading user-selected model files in a
 * browser before the hyperspectral mapping components are added.
 *
 * Supported now:
 * - OBJ meshes, including vertex normals, UVs, MTL diffuse texture references.
 * - STL meshes, both binary and ASCII.
 * - GLB/glTF meshes for common, uncompressed buffer/accessor layouts.
 *
 * Recognized but not loaded yet:
 * - FBX and USDZ. These formats usually require large format-specific loaders
 *   or an offline conversion step; the UI reports that clearly instead of
 *   failing silently.
 */

(function () {
  "use strict";

  const canvas = document.getElementById("viewerCanvas");
  const projectionCanvas = document.getElementById("projectionCanvas");
  const projectionCtx = projectionCanvas.getContext("2d");
  const projectionRasterCanvas = document.createElement("canvas");
  const projectionRasterCtx = projectionRasterCanvas.getContext("2d", { willReadFrequently: true });
  const dropZone = document.getElementById("dropZone");
  const dropOverlay = document.getElementById("dropOverlay");
  const fileInput = document.getElementById("fileInput");
  const folderInput = document.getElementById("folderInput");
  const statusEl = document.getElementById("status");
  const metaFile = document.getElementById("metaFile");
  const metaFormat = document.getElementById("metaFormat");
  const metaVertices = document.getElementById("metaVertices");
  const metaTriangles = document.getElementById("metaTriangles");
  const metaSurfaceArea = document.getElementById("metaSurfaceArea");
  const metaVolume = document.getElementById("metaVolume");
  const metaTexture = document.getElementById("metaTexture");
  const sunAzimuthInput = document.getElementById("sunAzimuth");
  const sunElevationInput = document.getElementById("sunElevation");
  const languageToggle = document.getElementById("languageToggle");
  const calibrationToggle = document.getElementById("calibrationToggle");
  const modelSegmentLength = document.getElementById("modelSegmentLength");
  const scaleFactor = document.getElementById("scaleFactor");
  const realLengthInput = document.getElementById("realLengthInput");
  const realUnitInput = document.getElementById("realUnitInput");
  const realSurfaceArea = document.getElementById("realSurfaceArea");
  const realVolume = document.getElementById("realVolume");

  const translations = {
    zh: {
      appTitle: "3D 模型查看器",
      appIntro: "选择或拖入模型后即可在浏览器中查看、旋转、缩放和平移。",
      projectionTitle: "投影面轮廓",
      dropTitle: "拖入 3D 模型文件",
      dropSubtitle: "支持 OBJ、STL、GLB/glTF；OBJ 可同时选择 MTL 和贴图",
      chooseFiles: "选择 3D 文件",
      chooseFolder: "选择整个文件夹",
      statusWaiting: "等待选择模型文件。",
      metaFile: "文件",
      metaFormat: "格式",
      metaVertices: "顶点",
      metaTriangles: "三角面",
      metaSurfaceArea: "表面积",
      metaVolume: "体积",
      metaTexture: "贴图",
      sunTitle: "太阳位置",
      sunAzimuth: "方位角",
      sunElevation: "高度角",
      scaleTitle: "比例尺标定",
      calibrationStart: "选择两个标定点",
      calibrationActive: "确定选点",
      modelSegment: "模型线段",
      scaleFactor: "换算比例",
      realLength: "真实长度",
      realLengthPlaceholder: "例如 12.4",
      unit: "单位",
      realSurfaceArea: "真实表面积",
      realVolume: "真实体积",
      controlsTitle: "操作",
      controlsText: "左键拖动旋转；右键或 Shift+左键拖动平移；滚轮缩放；双击重置视角。",
      textureLoaded: "已加载",
      textureUnused: "未使用",
      projectionEmpty: "加载模型后显示",
      statusWebglUnsupported: "当前浏览器不支持 WebGL，无法显示 3D 模型。",
      statusNoModel: "没有找到可加载的 3D 文件。请选择 OBJ、STL、GLB 或 glTF。",
      statusReading: "正在读取 {name} ...",
      statusUnsupportedKnown: "{format} 已识别，但当前无依赖版本尚不能直接加载。请优先选择同一模型的 OBJ、STL 或 GLB 文件。",
      statusUnsupported: "暂不支持 {format} 格式。",
      statusLoaded: "模型已加载。可以旋转、平移和缩放查看。",
      statusLoadFailed: "加载失败：{message}",
      statusCalibrationOn: "标定模式已开启：请在模型表面依次点击两个点。再次点击按钮可退出标定模式。",
      statusCalibrationOff: "标定模式已关闭。可以继续旋转、平移和缩放查看模型。",
      statusCalibrationNeedModel: "请先加载 3D 模型，再进行比例尺标定。",
      statusCalibrationMiss: "没有点到模型表面，请在模型可见区域内重新点击。",
      statusCalibrationFirst: "已选择第 1 个标定点。请继续点击第 2 个点。",
      statusCalibrationSecond: "已选择两个标定点。请输入这条线段的真实长度。",
      errorEmptyMesh: "模型中没有可绘制的三角面。请尝试选择 OBJ、STL 或未压缩的 GLB/glTF 文件。",
      errorInvalidCoordinates: "模型坐标包含无效数值，无法显示。",
      modelUnit: "模型单位",
    },
    en: {
      appTitle: "3D Model Viewer",
      appIntro: "Select or drop a model to inspect, rotate, zoom, and pan it in the browser.",
      projectionTitle: "Projected Silhouette",
      dropTitle: "Drop 3D Model Files",
      dropSubtitle: "Supports OBJ, STL, and GLB/glTF; OBJ can include MTL and texture files",
      chooseFiles: "Choose 3D Files",
      chooseFolder: "Choose Folder",
      statusWaiting: "Waiting for model files.",
      metaFile: "File",
      metaFormat: "Format",
      metaVertices: "Vertices",
      metaTriangles: "Triangles",
      metaSurfaceArea: "Surface area",
      metaVolume: "Volume",
      metaTexture: "Texture",
      sunTitle: "Sun Position",
      sunAzimuth: "Azimuth",
      sunElevation: "Elevation",
      scaleTitle: "Scale Calibration",
      calibrationStart: "Select Two Points",
      calibrationActive: "Confirm Points",
      modelSegment: "Model segment",
      scaleFactor: "Scale factor",
      realLength: "Real length",
      realLengthPlaceholder: "e.g. 12.4",
      unit: "Unit",
      realSurfaceArea: "Real surface area",
      realVolume: "Real volume",
      controlsTitle: "Controls",
      controlsText: "Left drag to rotate; right drag or Shift + left drag to pan; wheel to zoom; double click to reset.",
      textureLoaded: "Loaded",
      textureUnused: "Not used",
      projectionEmpty: "Load a model first",
      statusWebglUnsupported: "This browser does not support WebGL, so the 3D model cannot be displayed.",
      statusNoModel: "No loadable 3D file was found. Please choose OBJ, STL, GLB, or glTF.",
      statusReading: "Reading {name} ...",
      statusUnsupportedKnown: "{format} is recognized, but this dependency-free version cannot load it directly yet. Please use the same model exported as OBJ, STL, or GLB.",
      statusUnsupported: "{format} is not supported yet.",
      statusLoaded: "Model loaded. You can rotate, pan, and zoom it.",
      statusLoadFailed: "Load failed: {message}",
      statusCalibrationOn: "Calibration mode is on: click two points on the model surface. Click the button again to leave calibration mode.",
      statusCalibrationOff: "Calibration mode is off. You can continue rotating, panning, and zooming the model.",
      statusCalibrationNeedModel: "Please load a 3D model before calibrating scale.",
      statusCalibrationMiss: "No model surface was hit. Click again inside the visible model area.",
      statusCalibrationFirst: "First calibration point selected. Click a second point.",
      statusCalibrationSecond: "Two calibration points selected. Enter the real length of this segment.",
      errorEmptyMesh: "The model has no drawable triangles. Try choosing an OBJ, STL, or uncompressed GLB/glTF file.",
      errorInvalidCoordinates: "The model contains invalid coordinate values and cannot be displayed.",
      modelUnit: "model unit",
    },
  };

  const state = {
    mesh: null,
    texture: null,
    orientation: [1, 0, 0, 0],
    zoom: 3.0,
    panX: 0,
    panY: 0,
    sunAzimuth: 45,
    sunElevation: 35,
    dragging: false,
    dragMode: "rotate",
    lastPointer: [0, 0],
    calibrationActive: false,
    calibrationPoints: [],
    modelSegmentLength: null,
    scaleFactor: null,
    projectionDirty: true,
    projectionLastUpdate: 0,
    language: getStoredLanguage(),
    statusKey: "statusWaiting",
    statusVars: {},
  };

  const gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) {
    setStatusKey("statusWebglUnsupported");
    return;
  }

  const program = createProgram(
    `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aUv;
    uniform mat4 uProjection;
    uniform mat4 uModelView;
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      vNormal = mat3(uModelView) * aNormal;
      vUv = aUv;
      gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
    }
    `,
    `
    precision mediump float;
    uniform bool uHasTexture;
    uniform sampler2D uTexture;
    uniform vec3 uLightDirection;
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 light = normalize(uLightDirection);
      float diffuse = max(dot(n, light), 0.0);
      vec3 base = uHasTexture ? texture2D(uTexture, vUv).rgb : mix(vec3(0.16, 0.43, 0.50), vec3(0.82, 0.60, 0.24), n.y * 0.5 + 0.5);
      float projection = smoothstep(0.55, 0.96, diffuse);
      vec3 illuminated = mix(base, vec3(1.0, 0.82, 0.20), projection * 0.34);
      gl_FragColor = vec4(illuminated * (0.36 + diffuse * 0.64), 1.0);
    }
    `
  );

  const loc = {
    position: gl.getAttribLocation(program, "aPosition"),
    normal: gl.getAttribLocation(program, "aNormal"),
    uv: gl.getAttribLocation(program, "aUv"),
    projection: gl.getUniformLocation(program, "uProjection"),
    modelView: gl.getUniformLocation(program, "uModelView"),
    hasTexture: gl.getUniformLocation(program, "uHasTexture"),
    texture: gl.getUniformLocation(program, "uTexture"),
    lightDirection: gl.getUniformLocation(program, "uLightDirection"),
  };

  const sunProgram = createProgram(
    `
    attribute vec3 aPosition;
    uniform mat4 uProjection;
    uniform mat4 uModelView;
    uniform float uPointSize;
    void main() {
      gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
      gl_PointSize = uPointSize;
    }
    `,
    `
    precision mediump float;
    void main() {
      vec2 p = gl_PointCoord * 2.0 - 1.0;
      float d = dot(p, p);
      if (d > 1.0) discard;
      vec3 core = vec3(1.0, 0.86, 0.28);
      vec3 edge = vec3(1.0, 0.46, 0.08);
      gl_FragColor = vec4(mix(core, edge, smoothstep(0.0, 1.0, d)), 1.0);
    }
    `
  );

  const sunLoc = {
    position: gl.getAttribLocation(sunProgram, "aPosition"),
    projection: gl.getUniformLocation(sunProgram, "uProjection"),
    modelView: gl.getUniformLocation(sunProgram, "uModelView"),
    pointSize: gl.getUniformLocation(sunProgram, "uPointSize"),
  };
  const sunBuffer = gl.createBuffer();

  const beamProgram = createProgram(
    `
    attribute vec3 aPosition;
    uniform mat4 uProjection;
    uniform mat4 uModelView;
    void main() {
      gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
    }
    `,
    `
    precision mediump float;
    uniform vec4 uColor;
    void main() {
      gl_FragColor = uColor;
    }
    `
  );

  const beamLoc = {
    position: gl.getAttribLocation(beamProgram, "aPosition"),
    projection: gl.getUniformLocation(beamProgram, "uProjection"),
    modelView: gl.getUniformLocation(beamProgram, "uModelView"),
    color: gl.getUniformLocation(beamProgram, "uColor"),
  };
  const beamBuffer = gl.createBuffer();

  const whiteTexture = createSolidTexture([255, 255, 255, 255]);

  fileInput.addEventListener("change", () => loadFiles(Array.from(fileInput.files)));
  folderInput.addEventListener("change", () => loadFiles(Array.from(folderInput.files)));
  languageToggle.addEventListener("click", toggleLanguage);
  sunAzimuthInput.addEventListener("input", updateSunFromInputs);
  sunElevationInput.addEventListener("input", updateSunFromInputs);
  calibrationToggle.addEventListener("click", toggleCalibrationMode);
  realLengthInput.addEventListener("input", updateCalibrationReadout);
  realUnitInput.addEventListener("input", updateCalibrationReadout);

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!state.mesh) {
      dropOverlay.classList.remove("hidden");
    }
  });

  dropZone.addEventListener("dragleave", () => {
    if (!state.mesh) dropOverlay.classList.remove("hidden");
  });

  dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    const files = await collectDroppedFiles(event.dataTransfer);
    loadFiles(files);
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (state.calibrationActive && event.button === 0 && !event.shiftKey) {
      event.preventDefault();
      pickCalibrationPoint(event);
      return;
    }
    state.dragging = true;
    state.dragMode = event.button === 2 || event.shiftKey ? "pan" : "rotate";
    state.lastPointer = [event.clientX, event.clientY];
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const dx = event.clientX - state.lastPointer[0];
    const dy = event.clientY - state.lastPointer[1];
    if (state.dragMode === "pan") {
      state.panX += dx * 0.004;
      state.panY -= dy * 0.004;
    } else {
      const yaw = quatFromAxisAngle([0, 1, 0], dx * 0.014);
      const pitch = quatFromAxisAngle([1, 0, 0], dy * 0.014);
      state.orientation = quatNormalize(quatMultiply(pitch, quatMultiply(yaw, state.orientation)));
    }
    state.projectionDirty = true;
    state.lastPointer = [event.clientX, event.clientY];
  });

  canvas.addEventListener("pointerup", (event) => {
    state.dragging = false;
    state.projectionDirty = true;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (_) {
      // Pointer capture may already be released by the browser.
    }
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.zoom = Math.max(0.8, Math.min(12, state.zoom + event.deltaY * 0.003));
  });

  canvas.addEventListener("dblclick", () => {
    resetCamera();
    state.projectionDirty = true;
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  applyLanguage();
  requestAnimationFrame(draw);

  async function loadFiles(files) {
    if (!files.length) return;
    const index = buildFileIndex(files);
    const main = chooseMainModelFile(files);
    if (!main) {
      setStatusKey("statusNoModel");
      return;
    }

    const ext = extensionOf(main.name);
    setStatusKey("statusReading", { name: main.name });

    try {
      let loaded;
      if (ext === "obj") {
        loaded = await loadObj(main, index);
      } else if (ext === "stl") {
        loaded = await loadStl(main);
      } else if (ext === "glb") {
        loaded = await loadGlb(main);
      } else if (ext === "gltf") {
        loaded = await loadGltf(main, index);
      } else if (ext === "fbx" || ext === "usdz") {
        setStatusKey("statusUnsupportedKnown", { format: ext.toUpperCase() });
        return;
      } else {
        setStatusKey("statusUnsupported", { format: ext || "unknown" });
        return;
      }

      setMesh(loaded.mesh);
      if (loaded.textureImage) {
        state.texture = createImageTexture(loaded.textureImage);
      } else {
        state.texture = null;
      }
      resetCamera();
      state.projectionDirty = true;
      state.projectionLastUpdate = performance.now();
      dropOverlay.classList.add("hidden");
      metaFile.textContent = main.name;
      metaFormat.textContent = ext.toUpperCase();
      metaVertices.textContent = String(state.mesh.vertexCount);
      metaTriangles.textContent = String(state.mesh.triangleCount);
      metaSurfaceArea.textContent = formatMetric(state.mesh.surfaceArea, "unit²");
      metaVolume.textContent = formatMetric(state.mesh.volume, "unit³");
      metaTexture.textContent = t(loaded.textureImage ? "textureLoaded" : "textureUnused");
      resetCalibration();
      setStatusKey("statusLoaded");
    } catch (error) {
      console.error(error);
      setStatusKey("statusLoadFailed", { message: error.message });
    }
  }

  function buildFileIndex(files) {
    const map = new Map();
    for (const file of files) {
      map.set(normalizeName(file.name), file);
      if (file.webkitRelativePath) {
        map.set(normalizeName(file.webkitRelativePath), file);
      }
    }
    return map;
  }

  function chooseMainModelFile(files) {
    const priorities = ["glb", "gltf", "obj", "stl", "fbx", "usdz"];
    for (const ext of priorities) {
      const match = files.find((file) => extensionOf(file.name) === ext);
      if (match) return match;
    }
    return null;
  }

  async function loadObj(file, fileIndex) {
    const text = await file.text();
    const parsed = parseObj(text);
    let textureImage = null;

    if (parsed.materialLibrary) {
      const mtlFile = findRelatedFile(fileIndex, parsed.materialLibrary);
      if (mtlFile) {
        const mtl = parseMtl(await mtlFile.text());
        const textureName = mtl.diffuseTexture;
        if (textureName) {
          const imageFile = findRelatedFile(fileIndex, textureName);
          if (imageFile) {
            textureImage = await fileToImage(imageFile);
          }
        }
      }
    }

    return { mesh: parsed.mesh, textureImage };
  }

  function parseObj(text) {
    const positionsSrc = [];
    const normalsSrc = [];
    const uvsSrc = [];
    const positions = [];
    const normals = [];
    const uvs = [];
    let materialLibrary = null;

    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/\s+/);
      if (parts[0] === "mtllib") {
        materialLibrary = parts.slice(1).join(" ");
      } else if (parts[0] === "v") {
        positionsSrc.push(parts.slice(1, 4).map(Number));
      } else if (parts[0] === "vn") {
        normalsSrc.push(parts.slice(1, 4).map(Number));
      } else if (parts[0] === "vt") {
        const uv = parts.slice(1, 3).map(Number);
        uvsSrc.push([uv[0], 1 - uv[1]]);
      } else if (parts[0] === "f") {
        const face = parts.slice(1).map(parseObjFaceToken);
        for (let i = 1; i < face.length - 1; i++) {
          appendObjTriangle(face[0], face[i], face[i + 1], positionsSrc, normalsSrc, uvsSrc, positions, normals, uvs);
        }
      }
    }

    return {
      mesh: normalizeMesh({ positions, normals, uvs }),
      materialLibrary,
    };
  }

  function parseObjFaceToken(token) {
    const parts = token.split("/");
    return {
      v: parseObjIndex(parts[0]),
      vt: parts[1] ? parseObjIndex(parts[1]) : null,
      vn: parts[2] ? parseObjIndex(parts[2]) : null,
    };
  }

  function parseObjIndex(text) {
    const value = Number(text);
    return value > 0 ? value - 1 : value;
  }

  function appendObjTriangle(a, b, c, positionsSrc, normalsSrc, uvsSrc, positions, normals, uvs) {
    const pa = positionsSrc[a.v];
    const pb = positionsSrc[b.v];
    const pc = positionsSrc[c.v];
    const fallbackNormal = normalize(cross(sub(pb, pa), sub(pc, pa)));
    for (const item of [a, b, c]) {
      const p = positionsSrc[item.v];
      const n = item.vn !== null && normalsSrc[item.vn] ? normalsSrc[item.vn] : fallbackNormal;
      const uv = item.vt !== null && uvsSrc[item.vt] ? uvsSrc[item.vt] : [0, 0];
      positions.push(p[0], p[1], p[2]);
      normals.push(n[0], n[1], n[2]);
      uvs.push(uv[0], uv[1]);
    }
  }

  function parseMtl(text) {
    let diffuseTexture = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/\s+/);
      if (parts[0].toLowerCase() === "map_kd") {
        diffuseTexture = parts.slice(1).join(" ");
      }
    }
    return { diffuseTexture };
  }

  async function loadStl(file) {
    const buffer = await file.arrayBuffer();
    const mesh = isBinaryStl(buffer) ? parseBinaryStl(buffer) : parseAsciiStl(await file.text());
    return { mesh: normalizeMesh(mesh), textureImage: null };
  }

  function isBinaryStl(buffer) {
    if (buffer.byteLength < 84) return false;
    const view = new DataView(buffer);
    const count = view.getUint32(80, true);
    return 84 + count * 50 === buffer.byteLength;
  }

  function parseBinaryStl(buffer) {
    const view = new DataView(buffer);
    const triangleCount = view.getUint32(80, true);
    const positions = [];
    const normals = [];
    const uvs = [];
    let offset = 84;
    for (let tri = 0; tri < triangleCount; tri++) {
      const n = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
      offset += 12;
      for (let vertex = 0; vertex < 3; vertex++) {
        positions.push(view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true));
        normals.push(n[0], n[1], n[2]);
        uvs.push(0, 0);
        offset += 12;
      }
      offset += 2;
    }
    return { positions, normals, uvs };
  }

  function parseAsciiStl(text) {
    const positions = [];
    const normals = [];
    const uvs = [];
    let currentNormal = [0, 1, 0];
    for (const raw of text.split(/\r?\n/)) {
      const parts = raw.trim().split(/\s+/);
      if (parts[0] === "facet" && parts[1] === "normal") {
        currentNormal = parts.slice(2, 5).map(Number);
      } else if (parts[0] === "vertex") {
        positions.push(Number(parts[1]), Number(parts[2]), Number(parts[3]));
        normals.push(currentNormal[0], currentNormal[1], currentNormal[2]);
        uvs.push(0, 0);
      }
    }
    return { positions, normals, uvs };
  }

  async function loadGlb(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== 0x46546c67) {
      throw new Error("不是有效的 GLB 文件。");
    }
    let offset = 12;
    let json = null;
    let bin = null;
    while (offset < buffer.byteLength) {
      const chunkLength = view.getUint32(offset, true);
      const chunkType = view.getUint32(offset + 4, true);
      const chunk = buffer.slice(offset + 8, offset + 8 + chunkLength);
      if (chunkType === 0x4e4f534a) {
        json = JSON.parse(new TextDecoder().decode(chunk));
      } else if (chunkType === 0x004e4942) {
        bin = chunk;
      }
      offset += 8 + chunkLength;
    }
    if (!json || !bin) throw new Error("GLB 缺少 JSON 或 BIN 数据块。");
    return { mesh: normalizeMesh(extractGltfMesh(json, [bin])), textureImage: null };
  }

  async function loadGltf(file, fileIndex) {
    const json = JSON.parse(await file.text());
    const buffers = [];
    for (const bufferDef of json.buffers || []) {
      if (bufferDef.uri && bufferDef.uri.startsWith("data:")) {
        buffers.push(dataUriToArrayBuffer(bufferDef.uri));
      } else if (bufferDef.uri) {
        const bufferFile = findRelatedFile(fileIndex, bufferDef.uri);
        if (!bufferFile) throw new Error(`找不到 glTF buffer: ${bufferDef.uri}`);
        buffers.push(await bufferFile.arrayBuffer());
      }
    }
    return { mesh: normalizeMesh(extractGltfMesh(json, buffers)), textureImage: null };
  }

  function extractGltfMesh(gltf, buffers) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const meshDef = gltf.meshes?.[0];
    if (!meshDef) throw new Error("glTF 没有 mesh。");

    for (const primitive of meshDef.primitives || []) {
      const pos = readAccessor(gltf, buffers, primitive.attributes.POSITION);
      const nor = primitive.attributes.NORMAL !== undefined ? readAccessor(gltf, buffers, primitive.attributes.NORMAL) : null;
      const tex = primitive.attributes.TEXCOORD_0 !== undefined ? readAccessor(gltf, buffers, primitive.attributes.TEXCOORD_0) : null;
      const idx = primitive.indices !== undefined ? readAccessor(gltf, buffers, primitive.indices) : null;
      const count = idx ? idx.values.length : pos.count;

      for (let i = 0; i < count; i++) {
        const vi = idx ? idx.values[i] : i;
        positions.push(pos.values[vi * 3], pos.values[vi * 3 + 1], pos.values[vi * 3 + 2]);
        if (nor) normals.push(nor.values[vi * 3], nor.values[vi * 3 + 1], nor.values[vi * 3 + 2]);
        if (tex) uvs.push(tex.values[vi * 2], tex.values[vi * 2 + 1]);
        else uvs.push(0, 0);
      }
    }
    return { positions, normals, uvs };
  }

  function readAccessor(gltf, buffers, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const viewDef = gltf.bufferViews[accessor.bufferView];
    const buffer = buffers[viewDef.buffer];
    const componentInfo = componentTypeInfo(accessor.componentType);
    const componentCount = typeComponentCount(accessor.type);
    const byteOffset = (viewDef.byteOffset || 0) + (accessor.byteOffset || 0);
    const stride = viewDef.byteStride || componentInfo.bytes * componentCount;
    const dataView = new DataView(buffer, byteOffset, stride * accessor.count);
    const values = [];
    for (let i = 0; i < accessor.count; i++) {
      for (let c = 0; c < componentCount; c++) {
        values.push(componentInfo.read(dataView, i * stride + c * componentInfo.bytes));
      }
    }
    return { values, count: accessor.count };
  }

  function componentTypeInfo(type) {
    const little = true;
    const map = {
      5120: { bytes: 1, read: (v, o) => v.getInt8(o) },
      5121: { bytes: 1, read: (v, o) => v.getUint8(o) },
      5122: { bytes: 2, read: (v, o) => v.getInt16(o, little) },
      5123: { bytes: 2, read: (v, o) => v.getUint16(o, little) },
      5125: { bytes: 4, read: (v, o) => v.getUint32(o, little) },
      5126: { bytes: 4, read: (v, o) => v.getFloat32(o, little) },
    };
    if (!map[type]) throw new Error(`暂不支持 glTF componentType ${type}`);
    return map[type];
  }

  function typeComponentCount(type) {
    return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type] || 1;
  }

  function normalizeMesh(mesh) {
    const positions = mesh.positions.slice();
    if (positions.length < 9) {
      throw new Error(t("errorEmptyMesh"));
    }
    const rawMetrics = computeMeshMetrics(positions);
    const normals = mesh.normals.length === positions.length ? mesh.normals.slice() : computeNormals(positions);
    const uvs = mesh.uvs.length === (positions.length / 3) * 2 ? mesh.uvs.slice() : new Array((positions.length / 3) * 2).fill(0);

    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      min[0] = Math.min(min[0], positions[i]);
      min[1] = Math.min(min[1], positions[i + 1]);
      min[2] = Math.min(min[2], positions[i + 2]);
      max[0] = Math.max(max[0], positions[i]);
      max[1] = Math.max(max[1], positions[i + 1]);
      max[2] = Math.max(max[2], positions[i + 2]);
    }

    if (!min.every(Number.isFinite) || !max.every(Number.isFinite)) {
      throw new Error(t("errorInvalidCoordinates"));
    }

    const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = ((positions[i] - center[0]) / span) * 2;
      positions[i + 1] = ((positions[i + 1] - center[1]) / span) * 2;
      positions[i + 2] = ((positions[i + 2] - center[2]) / span) * 2;
    }

    const normalizedBounds = computeBounds(positions);
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      vertexCount: positions.length / 3,
      triangleCount: positions.length / 9,
      surfaceArea: rawMetrics.surfaceArea,
      volume: rawMetrics.volume,
      modelUnitPerNormalizedUnit: span / 2,
      bounds: normalizedBounds,
      sideViewMatrix: computeSideViewMatrix(positions, normalizedBounds),
    };
  }

  function computeMeshMetrics(positions) {
    let surfaceArea = 0;
    let signedVolume = 0;
    for (let i = 0; i < positions.length; i += 9) {
      const a = [positions[i], positions[i + 1], positions[i + 2]];
      const b = [positions[i + 3], positions[i + 4], positions[i + 5]];
      const c = [positions[i + 6], positions[i + 7], positions[i + 8]];
      surfaceArea += 0.5 * Math.hypot(...cross(sub(b, a), sub(c, a)));
      signedVolume += dot(a, cross(b, c)) / 6;
    }
    return {
      surfaceArea,
      volume: Math.abs(signedVolume),
    };
  }

  function formatMetric(value, unit) {
    if (!Number.isFinite(value)) return "-";
    if (value === 0) return `0 ${unit}`;
    const abs = Math.abs(value);
    const text = formatNumber(value);
    return `${text} ${unit}`;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "-";
    const abs = Math.abs(value);
    return abs >= 100000 || abs < 0.001 ? value.toExponential(4) : value.toLocaleString(undefined, { maximumSignificantDigits: 6 });
  }

  function computeBounds(positions) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      min[0] = Math.min(min[0], positions[i]);
      min[1] = Math.min(min[1], positions[i + 1]);
      min[2] = Math.min(min[2], positions[i + 2]);
      max[0] = Math.max(max[0], positions[i]);
      max[1] = Math.max(max[1], positions[i + 1]);
      max[2] = Math.max(max[2], positions[i + 2]);
    }
    return { min, max, span: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
  }

  function computeSideViewMatrix(positions, bounds) {
    // Different export formats often use different coordinate conventions.
    // The default pose is inferred from geometry instead of file-specific
    // metadata: birds are expected to have a long body axis, a thinner viewing
    // depth, and a narrow lower end formed by the feet. The scoring below keeps
    // the longest axis horizontal, places the thinnest axis as camera depth, and
    // flips the vertical sign so the narrower "foot" end is at the bottom.
    const spans = bounds.span;
    const axes = [0, 1, 2];
    const sorted = axes.slice().sort((a, b) => spans[b] - spans[a]);
    const longest = sorted[0];
    const thinnest = sorted[2];
    let best = null;

    for (const xAxis of axes) {
      for (const yAxis of axes) {
        if (yAxis === xAxis) continue;
        const zAxis = axes.find((axis) => axis !== xAxis && axis !== yAxis);
        for (const xSign of [-1, 1]) {
          for (const ySign of [-1, 1]) {
            const xVector = axisVector(xAxis, xSign);
            const yVector = axisVector(yAxis, ySign);
            const zBase = axisVector(zAxis, 1);
            const zSign = dot(cross(xVector, yVector), zBase) >= 0 ? 1 : -1;
            const zVector = axisVector(zAxis, zSign);
            const matrix = orientationMatrixFromRows(xVector, yVector, zVector);
            const orientedBounds = computeTransformedBounds(positions, matrix, 12000);
            const dimensions = orientedBounds.span;
            const footScore = scoreFeetAtBottom(positions, matrix, orientedBounds);
            const axisScore =
              (xAxis === longest ? 6 : 0) +
              (zAxis === thinnest ? 6 : 0) +
              dimensions[0] * 1.5 -
              dimensions[2] * 1.2 +
              dimensions[1] * 0.3;
            const score = axisScore + footScore;
            if (!best || score > best.score) {
              best = { score, matrix };
            }
          }
        }
      }
    }

    return best ? best.matrix : identity();
  }

  function axisVector(axis, sign) {
    const v = [0, 0, 0];
    v[axis] = sign;
    return v;
  }

  function orientationMatrixFromRows(xVector, yVector, zVector) {
    // The transform uses column-major storage, but each output coordinate is a
    // row dot-product against the source position. Storing source axes as rows
    // therefore maps model-space directions cleanly into screen X, Y, and depth.
    return [
      xVector[0], yVector[0], zVector[0], 0,
      xVector[1], yVector[1], zVector[1], 0,
      xVector[2], yVector[2], zVector[2], 0,
      0, 0, 0, 1,
    ];
  }

  function computeTransformedBounds(positions, matrix, sampleLimit) {
    const vertexCount = positions.length / 3;
    const step = Math.max(1, Math.floor(vertexCount / sampleLimit));
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let vertex = 0; vertex < vertexCount; vertex += step) {
      const i = vertex * 3;
      const p = transformPoint(matrix, [positions[i], positions[i + 1], positions[i + 2]]);
      min[0] = Math.min(min[0], p[0]);
      min[1] = Math.min(min[1], p[1]);
      min[2] = Math.min(min[2], p[2]);
      max[0] = Math.max(max[0], p[0]);
      max[1] = Math.max(max[1], p[1]);
      max[2] = Math.max(max[2], p[2]);
    }
    return { min, max, span: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
  }

  function scoreFeetAtBottom(positions, matrix, orientedBounds) {
    const vertexCount = positions.length / 3;
    const step = Math.max(1, Math.floor(vertexCount / 16000));
    const height = orientedBounds.span[1] || 1;
    const bottomLimit = orientedBounds.min[1] + height * 0.18;
    const topLimit = orientedBounds.max[1] - height * 0.18;
    const bottom = makeBandStats();
    const top = makeBandStats();

    for (let vertex = 0; vertex < vertexCount; vertex += step) {
      const i = vertex * 3;
      const p = transformPoint(matrix, [positions[i], positions[i + 1], positions[i + 2]]);
      if (p[1] <= bottomLimit) addBandPoint(bottom, p);
      if (p[1] >= topLimit) addBandPoint(top, p);
    }

    const bottomWidth = bandSpan(bottom, 0) + bandSpan(bottom, 2);
    const topWidth = bandSpan(top, 0) + bandSpan(top, 2);
    const bottomMass = bottom.count / Math.max(1, top.count);
    const narrowBottom = (topWidth - bottomWidth) * 2.5;
    const lightBottom = (1 - bottomMass) * 0.8;
    return narrowBottom + lightBottom;
  }

  function makeBandStats() {
    return {
      count: 0,
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
    };
  }

  function addBandPoint(stats, point) {
    stats.count += 1;
    for (let axis = 0; axis < 3; axis++) {
      stats.min[axis] = Math.min(stats.min[axis], point[axis]);
      stats.max[axis] = Math.max(stats.max[axis], point[axis]);
    }
  }

  function bandSpan(stats, axis) {
    return stats.count ? stats.max[axis] - stats.min[axis] : 0;
  }

  function computeNormals(positions) {
    const normals = [];
    for (let i = 0; i < positions.length; i += 9) {
      const a = [positions[i], positions[i + 1], positions[i + 2]];
      const b = [positions[i + 3], positions[i + 4], positions[i + 5]];
      const c = [positions[i + 6], positions[i + 7], positions[i + 8]];
      const n = normalize(cross(sub(b, a), sub(c, a)));
      normals.push(...n, ...n, ...n);
    }
    return normals;
  }

  function setMesh(mesh) {
    state.mesh = mesh;
    state.texture = null;

    mesh.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

    mesh.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    mesh.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
  }

  function draw() {
    resizeCanvas();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.05, 0.07, 0.10, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = canvas.width / Math.max(1, canvas.height);
    const projection = perspective(Math.PI / 4, aspect, 0.01, 100);

    if (state.mesh) {
      const modelView = viewerModelViewMatrix();

      gl.useProgram(program);
      gl.uniformMatrix4fv(loc.projection, false, new Float32Array(projection));
      gl.uniformMatrix4fv(loc.modelView, false, new Float32Array(modelView));
      gl.uniform1i(loc.hasTexture, state.texture ? 1 : 0);
      gl.uniform3fv(loc.lightDirection, new Float32Array(sunDirection()));

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, state.texture || whiteTexture);
      gl.uniform1i(loc.texture, 0);

      bindAttribute(state.mesh.positionBuffer, loc.position, 3);
      bindAttribute(state.mesh.normalBuffer, loc.normal, 3);
      bindAttribute(state.mesh.uvBuffer, loc.uv, 2);
      gl.drawArrays(gl.TRIANGLES, 0, state.mesh.vertexCount);
      drawCalibrationMarkers(projection, modelView);
    }

    drawSunBeam(projection);
    drawSun(projection);
    maybeUpdateProjectionSilhouette();

    requestAnimationFrame(draw);
  }

  function toggleCalibrationMode() {
    state.calibrationActive = !state.calibrationActive;
    calibrationToggle.classList.toggle("active", state.calibrationActive);
    calibrationToggle.textContent = t(state.calibrationActive ? "calibrationActive" : "calibrationStart");
    if (state.calibrationActive) {
      setStatusKey("statusCalibrationOn");
    } else if (state.mesh) {
      setStatusKey("statusCalibrationOff");
    }
  }

  function pickCalibrationPoint(event) {
    if (!state.mesh) {
      setStatusKey("statusCalibrationNeedModel");
      return;
    }

    const hit = pickMeshPoint(event);
    if (!hit) {
      setStatusKey("statusCalibrationMiss");
      return;
    }

    if (state.calibrationPoints.length >= 2) {
      state.calibrationPoints = [];
      state.modelSegmentLength = null;
      state.scaleFactor = null;
    }
    state.calibrationPoints.push(hit.localPoint);

    if (state.calibrationPoints.length === 1) {
      setStatusKey("statusCalibrationFirst");
    } else {
      const a = state.calibrationPoints[0];
      const b = state.calibrationPoints[1];
      const normalizedLength = distance(a, b);
      state.modelSegmentLength = normalizedLength * state.mesh.modelUnitPerNormalizedUnit;
      setStatusKey("statusCalibrationSecond");
    }
    updateCalibrationReadout();
  }

  function pickMeshPoint(event) {
    const ray = screenRayFromEvent(event);
    const matrix = viewerModelViewMatrix();
    const positions = state.mesh.positions;
    let best = null;

    for (let i = 0; i < positions.length; i += 9) {
      const aLocal = [positions[i], positions[i + 1], positions[i + 2]];
      const bLocal = [positions[i + 3], positions[i + 4], positions[i + 5]];
      const cLocal = [positions[i + 6], positions[i + 7], positions[i + 8]];
      const hit = intersectRayTriangle(
        ray.origin,
        ray.direction,
        transformPoint(matrix, aLocal),
        transformPoint(matrix, bLocal),
        transformPoint(matrix, cLocal)
      );
      if (hit && (!best || hit.t < best.t)) {
        const u = hit.u;
        const v = hit.v;
        const w = 1 - u - v;
        best = {
          t: hit.t,
          localPoint: [
            aLocal[0] * w + bLocal[0] * u + cLocal[0] * v,
            aLocal[1] * w + bLocal[1] * u + cLocal[1] * v,
            aLocal[2] * w + bLocal[2] * u + cLocal[2] * v,
          ],
        };
      }
    }
    return best;
  }

  function screenRayFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const y = 1 - ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2;
    const aspect = canvas.width / Math.max(1, canvas.height);
    const tanHalfFov = Math.tan(Math.PI / 8);
    return {
      origin: [0, 0, 0],
      direction: normalize([x * aspect * tanHalfFov, y * tanHalfFov, -1]),
    };
  }

  function intersectRayTriangle(origin, direction, a, b, c) {
    // Moller-Trumbore ray-triangle intersection in view space. It returns the
    // nearest visible surface point under the cursor without needing an
    // additional picking framebuffer.
    const epsilon = 1e-7;
    const edge1 = sub(b, a);
    const edge2 = sub(c, a);
    const h = cross(direction, edge2);
    const det = dot(edge1, h);
    if (Math.abs(det) < epsilon) return null;
    const invDet = 1 / det;
    const s = sub(origin, a);
    const u = invDet * dot(s, h);
    if (u < 0 || u > 1) return null;
    const q = cross(s, edge1);
    const v = invDet * dot(direction, q);
    if (v < 0 || u + v > 1) return null;
    const t = invDet * dot(edge2, q);
    return t > epsilon ? { t, u, v } : null;
  }

  function updateCalibrationReadout() {
    const unit = (realUnitInput.value || "unit").trim() || "unit";
    if (!state.modelSegmentLength) {
      modelSegmentLength.textContent = "-";
      scaleFactor.textContent = "-";
      realSurfaceArea.textContent = "-";
      realVolume.textContent = "-";
      return;
    }

    modelSegmentLength.textContent = formatMetric(state.modelSegmentLength, t("modelUnit"));
    const realLength = Number(realLengthInput.value);
    if (!Number.isFinite(realLength) || realLength <= 0) {
      state.scaleFactor = null;
      scaleFactor.textContent = "-";
      realSurfaceArea.textContent = "-";
      realVolume.textContent = "-";
      return;
    }

    state.scaleFactor = realLength / state.modelSegmentLength;
    scaleFactor.textContent = `${formatNumber(state.scaleFactor)} ${unit}/${t("modelUnit")}`;
    realSurfaceArea.textContent = formatMetric(state.mesh.surfaceArea * state.scaleFactor * state.scaleFactor, `${unit}²`);
    realVolume.textContent = formatMetric(state.mesh.volume * state.scaleFactor * state.scaleFactor * state.scaleFactor, `${unit}³`);
  }

  function resetCalibration() {
    state.calibrationPoints = [];
    state.modelSegmentLength = null;
    state.scaleFactor = null;
    updateCalibrationReadout();
  }

  function drawCalibrationMarkers(projection, modelView) {
    if (!state.calibrationPoints.length) return;

    if (state.calibrationPoints.length === 2) {
      gl.useProgram(beamProgram);
      gl.uniformMatrix4fv(beamLoc.projection, false, new Float32Array(projection));
      gl.uniformMatrix4fv(beamLoc.modelView, false, new Float32Array(modelView));
      gl.uniform4fv(beamLoc.color, new Float32Array([0.14, 0.91, 0.94, 0.95]));
      gl.bindBuffer(gl.ARRAY_BUFFER, beamBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...state.calibrationPoints[0], ...state.calibrationPoints[1]]), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(beamLoc.position);
      gl.vertexAttribPointer(beamLoc.position, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, 2);
    }

    gl.useProgram(sunProgram);
    gl.uniformMatrix4fv(sunLoc.projection, false, new Float32Array(projection));
    gl.uniformMatrix4fv(sunLoc.modelView, false, new Float32Array(modelView));
    gl.uniform1f(sunLoc.pointSize, 14 * (window.devicePixelRatio || 1));
    gl.bindBuffer(gl.ARRAY_BUFFER, sunBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(state.calibrationPoints.flat()), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(sunLoc.position);
    gl.vertexAttribPointer(sunLoc.position, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, state.calibrationPoints.length);
  }

  function drawSun(projection) {
    const direction = sunDirection();
    const position = [direction[0] * 2.25, direction[1] * 2.25, direction[2] * 2.25];
    let modelView = identity();
    modelView = multiply(modelView, translate(0, 0, -state.zoom));
    modelView = multiply(modelView, translate(state.panX, state.panY, 0));

    gl.useProgram(sunProgram);
    gl.uniformMatrix4fv(sunLoc.projection, false, new Float32Array(projection));
    gl.uniformMatrix4fv(sunLoc.modelView, false, new Float32Array(modelView));
    gl.uniform1f(sunLoc.pointSize, 24 * (window.devicePixelRatio || 1));
    gl.bindBuffer(gl.ARRAY_BUFFER, sunBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(sunLoc.position);
    gl.vertexAttribPointer(sunLoc.position, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, 1);
  }

  function drawSunBeam(projection) {
    const direction = sunDirection();
    const sunPosition = [direction[0] * 2.25, direction[1] * 2.25, direction[2] * 2.25];
    const targetRadius = 0.34;
    const targetOffsets = [
      [0, 0, 0],
      [targetRadius, 0, 0],
      [-targetRadius, 0, 0],
      [0, targetRadius, 0],
      [0, -targetRadius, 0],
      [0, 0, targetRadius],
      [0, 0, -targetRadius],
    ];
    const vertices = [];
    for (const target of targetOffsets) {
      vertices.push(sunPosition[0], sunPosition[1], sunPosition[2]);
      vertices.push(target[0], target[1], target[2]);
    }

    let modelView = identity();
    modelView = multiply(modelView, translate(0, 0, -state.zoom));
    modelView = multiply(modelView, translate(state.panX, state.panY, 0));

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(beamProgram);
    gl.uniformMatrix4fv(beamLoc.projection, false, new Float32Array(projection));
    gl.uniformMatrix4fv(beamLoc.modelView, false, new Float32Array(modelView));
    gl.uniform4fv(beamLoc.color, new Float32Array([1.0, 0.82, 0.20, 0.24]));
    gl.bindBuffer(gl.ARRAY_BUFFER, beamBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(beamLoc.position);
    gl.vertexAttribPointer(beamLoc.position, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, vertices.length / 3);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function maybeUpdateProjectionSilhouette() {
    if (!state.projectionDirty) return;
    if (state.dragging) return;
    const now = performance.now();
    if (now - state.projectionLastUpdate < 250) return;
    state.projectionDirty = false;
    state.projectionLastUpdate = now;
    drawProjectionSilhouette();
  }

  function updateSunFromInputs() {
    state.sunAzimuth = Number(sunAzimuthInput.value) || 0;
    state.sunElevation = Number(sunElevationInput.value) || 0;
    state.projectionDirty = true;
  }

  function sunDirection() {
    const azimuth = degreesToRadians(state.sunAzimuth);
    const elevation = degreesToRadians(state.sunElevation);
    const cosElevation = Math.cos(elevation);
    return normalize([
      Math.sin(azimuth) * cosElevation,
      Math.sin(elevation),
      Math.cos(azimuth) * cosElevation,
    ]);
  }

  function degreesToRadians(value) {
    return value * Math.PI / 180;
  }

  function drawProjectionSilhouette() {
    const width = projectionCanvas.width;
    const height = projectionCanvas.height;
    projectionCtx.clearRect(0, 0, width, height);
    projectionCtx.fillStyle = "rgba(255, 255, 255, 0.04)";
    projectionCtx.fillRect(0, 0, width, height);

    if (!state.mesh) {
      projectionCtx.fillStyle = "rgba(219, 234, 254, 0.74)";
      projectionCtx.font = "14px Segoe UI, Arial";
      projectionCtx.textAlign = "center";
      projectionCtx.fillText(t("projectionEmpty"), width / 2, height / 2 + 5);
      return;
    }

    const direction = sunDirection();
    const basis = projectionBasis(direction);
    const transform = multiply(quatToMatrix(state.orientation), state.mesh.sideViewMatrix || identity());
    const positions = state.mesh.positions;
    const vertexCount = positions.length / 3;
    const triangleCount = positions.length / 9;
    const vertexStep = Math.max(1, Math.floor(vertexCount / 10000));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let vertex = 0; vertex < vertexCount; vertex += vertexStep) {
      const i = vertex * 3;
      const p = transformPoint(transform, [positions[i], positions[i + 1], positions[i + 2]]);
      const x = dot(p, basis.u);
      const y = dot(p, basis.v);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || maxX <= minX || maxY <= minY) return;

    const pad = 18;
    const scale = Math.min((width - pad * 2) / Math.max(1e-6, maxX - minX), (height - pad * 2) / Math.max(1e-6, maxY - minY));
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;

    projectionRasterCanvas.width = width;
    projectionRasterCanvas.height = height;
    projectionRasterCtx.clearRect(0, 0, width, height);
    projectionRasterCtx.fillStyle = "rgba(255, 255, 255, 1)";

    // Rasterize the projected mesh triangles rather than using a convex hull.
    // The adaptive step keeps very dense meshes responsive while preserving the
    // concavities of the projected outline much better than vertex hulls.
    const triangleStep = Math.max(1, Math.floor(triangleCount / 90000));
    for (let tri = 0; tri < triangleCount; tri += triangleStep) {
      const i = tri * 9;
      const a = projectVertexToPreview(positions, i, transform, basis, cx, cy, scale, width, height);
      const b = projectVertexToPreview(positions, i + 3, transform, basis, cx, cy, scale, width, height);
      const c = projectVertexToPreview(positions, i + 6, transform, basis, cx, cy, scale, width, height);
      projectionRasterCtx.beginPath();
      projectionRasterCtx.moveTo(a[0], a[1]);
      projectionRasterCtx.lineTo(b[0], b[1]);
      projectionRasterCtx.lineTo(c[0], c[1]);
      projectionRasterCtx.closePath();
      projectionRasterCtx.fill();
    }

    const image = projectionRasterCtx.getImageData(0, 0, width, height);
    const edgeImage = projectionCtx.createImageData(width, height);
    const src = image.data;
    const dst = edgeImage.data;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        if (src[idx + 3] === 0) continue;
        const left = src[idx - 4 + 3];
        const right = src[idx + 4 + 3];
        const up = src[idx - width * 4 + 3];
        const down = src[idx + width * 4 + 3];
        if (left === 0 || right === 0 || up === 0 || down === 0) {
          dst[idx] = 255;
          dst[idx + 1] = 226;
          dst[idx + 2] = 122;
          dst[idx + 3] = 255;
        } else {
          dst[idx] = 255;
          dst[idx + 1] = 210;
          dst[idx + 2] = 75;
          dst[idx + 3] = 38;
        }
      }
    }
    projectionCtx.putImageData(edgeImage, 0, 0);

    projectionCtx.strokeStyle = "rgba(255, 255, 255, 0.24)";
    projectionCtx.lineWidth = 1;
    projectionCtx.beginPath();
    projectionCtx.moveTo(width / 2 - 18, height / 2);
    projectionCtx.lineTo(width / 2 + 18, height / 2);
    projectionCtx.moveTo(width / 2, height / 2 - 18);
    projectionCtx.lineTo(width / 2, height / 2 + 18);
    projectionCtx.stroke();
  }

  function projectVertexToPreview(positions, index, transform, basis, cx, cy, scale, width, height) {
    const p = transformPoint(transform, [positions[index], positions[index + 1], positions[index + 2]]);
    const x = width / 2 + (dot(p, basis.u) - cx) * scale;
    const y = height / 2 - (dot(p, basis.v) - cy) * scale;
    return [x, y];
  }

  function projectionBasis(direction) {
    const w = normalize(direction);
    const azimuth = degreesToRadians(state.sunAzimuth);
    // Use a horizontal axis derived directly from solar azimuth. This keeps the
    // 2D projection coordinate frame continuous as elevation changes. The prior
    // helper-axis method switched axes near high elevations, causing a visible
    // jump around 66-67 degrees for some azimuths.
    let u = normalize([Math.cos(azimuth), 0, -Math.sin(azimuth)]);
    if (Math.hypot(u[0], u[1], u[2]) < 1e-6) {
      u = [1, 0, 0];
    }
    const v = normalize(cross(w, u));
    return { u, v };
  }

  function transformPoint(matrix, point) {
    return [
      matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
      matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
      matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14],
    ];
  }

  function convexHull(points) {
    const sorted = points
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
    if (sorted.length <= 3) return sorted;

    const lower = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross2(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && cross2(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function cross2(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }

  function bindAttribute(buffer, location, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  function resetCamera() {
    state.orientation = [1, 0, 0, 0];
    state.zoom = 3.0;
    state.panX = 0;
    state.panY = 0;
  }

  function viewerModelViewMatrix() {
    // Trackball-style model rotation: all formats are first centered and
    // normalized, then the same quaternion orientation is applied around that
    // center. This avoids format-specific axis quirks from making STL/GLB feel
    // different from OBJ during dragging.
    let modelView = identity();
    modelView = multiply(modelView, translate(0, 0, -state.zoom));
    modelView = multiply(modelView, translate(state.panX, state.panY, 0));
    modelView = multiply(modelView, quatToMatrix(state.orientation));
    if (state.mesh && state.mesh.sideViewMatrix) {
      modelView = multiply(modelView, state.mesh.sideViewMatrix);
    }
    return modelView;
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function createProgram(vertexSource, fragmentSource) {
    const vertex = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const p = gl.createProgram();
    gl.attachShader(p, vertex);
    gl.attachShader(p, fragment);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p));
    }
    return p;
  }

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function createImageTexture(image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    setTextureParameters();
    return texture;
  }

  function createSolidTexture(rgba) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
    setTextureParameters();
    return texture;
  }

  function setTextureParameters() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`无法读取贴图：${file.name}`));
      };
      image.src = url;
    });
  }

  function dataUriToArrayBuffer(uri) {
    const base64 = uri.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function findRelatedFile(fileIndex, requestedName) {
    const normalized = normalizeName(requestedName);
    if (fileIndex.has(normalized)) return fileIndex.get(normalized);
    const basename = normalized.split("/").pop();
    for (const [key, file] of fileIndex.entries()) {
      if (key.split("/").pop() === basename) return file;
    }
    return null;
  }

  async function collectDroppedFiles(dataTransfer) {
    const files = [];
    const items = Array.from(dataTransfer.items || []);
    for (const item of items) {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        files.push(...await readEntryFiles(entry));
      } else if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    return files.length ? files : Array.from(dataTransfer.files || []);
  }

  async function readEntryFiles(entry) {
    // Chromium-based browsers expose folder drops through the legacy
    // webkitGetAsEntry API. Supporting it lets users drag the OBJ folder once
    // instead of selecting the OBJ, MTL, and texture files one by one.
    if (entry.isFile) {
      return [await new Promise((resolve, reject) => entry.file(resolve, reject))];
    }
    if (!entry.isDirectory) return [];

    const reader = entry.createReader();
    const allEntries = [];
    while (true) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      allEntries.push(...batch);
    }

    const nested = [];
    for (const child of allEntries) {
      nested.push(...await readEntryFiles(child));
    }
    return nested;
  }

  function normalizeName(name) {
    return name.replace(/\\/g, "/").toLowerCase();
  }

  function extensionOf(name) {
    const clean = name.toLowerCase().split("?")[0];
    const dot = clean.lastIndexOf(".");
    return dot >= 0 ? clean.slice(dot + 1) : "";
  }

  function toggleLanguage() {
    state.language = state.language === "zh" ? "en" : "zh";
    setStoredLanguage(state.language);
    applyLanguage();
  }

  function applyLanguage() {
    document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
    languageToggle.textContent = state.language === "zh" ? "EN" : "中";
    for (const element of document.querySelectorAll("[data-i18n]")) {
      element.textContent = t(element.dataset.i18n);
    }
    for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    }
    calibrationToggle.textContent = t(state.calibrationActive ? "calibrationActive" : "calibrationStart");
    statusEl.textContent = t(state.statusKey, state.statusVars);
    if (state.mesh) {
      metaTexture.textContent = state.texture ? t("textureLoaded") : t("textureUnused");
    }
    updateCalibrationReadout();
    state.projectionDirty = true;
  }

  function setStatusKey(key, vars = {}) {
    state.statusKey = key;
    state.statusVars = vars;
    statusEl.textContent = t(key, vars);
  }

  function t(key, vars = {}) {
    const dictionary = translations[state.language] || translations.zh;
    const fallback = translations.zh[key] || key;
    let text = dictionary[key] || fallback;
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(value);
    }
    return text;
  }

  function getStoredLanguage() {
    try {
      return localStorage.getItem("viewerLanguage") || "zh";
    } catch (_) {
      return "zh";
    }
  }

  function setStoredLanguage(language) {
    try {
      localStorage.setItem("viewerLanguage", language);
    } catch (_) {
      // Some browsers restrict localStorage for file:// pages. The language
      // switch should still work for the current session when persistence is
      // unavailable.
    }
  }

  function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  function normalize(v) {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function distance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  function quatFromAxisAngle(axis, angle) {
    const n = normalize(axis);
    const half = angle * 0.5;
    const s = Math.sin(half);
    return [Math.cos(half), n[0] * s, n[1] * s, n[2] * s];
  }

  function quatMultiply(a, b) {
    // Quaternions are stored as [w, x, y, z]. The returned orientation applies
    // b first and then a, matching the matrix multiplication convention above.
    return [
      a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
      a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
      a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    ];
  }

  function quatNormalize(q) {
    const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
  }

  function quatToMatrix(q) {
    const nq = quatNormalize(q);
    const w = nq[0];
    const x = nq[1];
    const y = nq[2];
    const z = nq[3];
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const xy = x * y;
    const xz = x * z;
    const yz = y * z;
    const wx = w * x;
    const wy = w * y;
    const wz = w * z;
    return [
      1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
      2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
      2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
      0, 0, 0, 1,
    ];
  }

  function identity() {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }

  function multiply(a, b) {
    // WebGL expects matrices in column-major order. The viewer uses column
    // vectors, so `multiply(a, b)` returns a matrix that applies `b` first and
    // then `a`. Keeping this convention consistent is important: otherwise a
    // model can appear to rotate around a distant point instead of its own
    // centered body axis.
    const out = new Array(16).fill(0);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        for (let k = 0; k < 4; k++) {
          out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
        }
      }
    }
    return out;
  }

  function translate(x, y, z) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  }

  function rotateX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  }

  function rotateY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  }

  function rotateZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }

  function lookAt(eye, target, up) {
    // Column-major OpenGL-style view matrix.
    const zAxis = normalize(sub(eye, target));
    const xAxis = normalize(cross(up, zAxis));
    const yAxis = cross(zAxis, xAxis);
    return [
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1,
    ];
  }

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
})();
