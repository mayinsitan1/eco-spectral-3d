/*
 * Lightweight default common kingfisher example.
 *
 * The high-resolution source OBJ is too large for a normal GitHub repository,
 * so this built-in example uses a continuous low-poly mesh with kingfisher-like
 * proportions. It is intended for first-run testing of loading, viewing,
 * illumination, projection, and scale-calibration tools.
 */
(function () {
  "use strict";

  const positions = [];

  function addTriangle(a, b, c) {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }

  function addQuad(a, b, c, d) {
    addTriangle(a, b, c);
    addTriangle(a, c, d);
  }

  function transformPoint(point, center, radii, rotationY) {
    const x = point[0] * radii[0];
    const y = point[1] * radii[1];
    const z = point[2] * radii[2];
    const c = Math.cos(rotationY);
    const s = Math.sin(rotationY);
    return [
      center[0] + x * c + z * s,
      center[1] + y,
      center[2] - x * s + z * c,
    ];
  }

  function spherePoint(theta, phi) {
    return [
      Math.cos(theta) * Math.sin(phi),
      Math.cos(phi),
      Math.sin(theta) * Math.sin(phi),
    ];
  }

  function addEllipsoid(center, radii, segments, rings, rotationY) {
    for (let ring = 0; ring < rings; ring++) {
      const phi0 = (ring / rings) * Math.PI;
      const phi1 = ((ring + 1) / rings) * Math.PI;
      for (let segment = 0; segment < segments; segment++) {
        const theta0 = (segment / segments) * Math.PI * 2;
        const theta1 = ((segment + 1) / segments) * Math.PI * 2;
        const a = transformPoint(spherePoint(theta0, phi0), center, radii, rotationY);
        const b = transformPoint(spherePoint(theta1, phi0), center, radii, rotationY);
        const c = transformPoint(spherePoint(theta1, phi1), center, radii, rotationY);
        const d = transformPoint(spherePoint(theta0, phi1), center, radii, rotationY);
        addQuad(a, b, c, d);
      }
    }
  }

  function addCone(baseCenter, tip, radiusY, radiusZ, segments) {
    const base = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      base.push([baseCenter[0], baseCenter[1] + Math.cos(theta) * radiusY, baseCenter[2] + Math.sin(theta) * radiusZ]);
    }
    for (let i = 0; i < segments; i++) {
      addTriangle(base[i], base[(i + 1) % segments], tip);
    }
  }

  function addPrism(points, depth) {
    const front = points.map((p) => [p[0], p[1], p[2] + depth]);
    const back = points.map((p) => [p[0], p[1], p[2] - depth]);
    for (let i = 1; i < points.length - 1; i++) {
      addTriangle(front[0], front[i], front[i + 1]);
      addTriangle(back[0], back[i + 1], back[i]);
    }
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      addQuad(front[i], front[next], back[next], back[i]);
    }
  }

  function addCylinder(a, b, radius, segments) {
    const axis = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
    const up = [axis[0] / len, axis[1] / len, axis[2] / len];
    const side = Math.abs(up[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = normalize(cross(up, side));
    const v = cross(up, u);
    const ringA = [];
    const ringB = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const offset = [
        (Math.cos(theta) * u[0] + Math.sin(theta) * v[0]) * radius,
        (Math.cos(theta) * u[1] + Math.sin(theta) * v[1]) * radius,
        (Math.cos(theta) * u[2] + Math.sin(theta) * v[2]) * radius,
      ];
      ringA.push([a[0] + offset[0], a[1] + offset[1], a[2] + offset[2]]);
      ringB.push([b[0] + offset[0], b[1] + offset[1], b[2] + offset[2]]);
    }
    for (let i = 0; i < segments; i++) {
      addQuad(ringA[i], ringA[(i + 1) % segments], ringB[(i + 1) % segments], ringB[i]);
    }
  }

  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  function normalize(v) {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  addEllipsoid([0.0, 0.05, 0.0], [0.95, 0.42, 0.34], 28, 14, 0.08);
  addEllipsoid([0.88, 0.22, 0.0], [0.34, 0.30, 0.28], 24, 12, 0.0);
  addCone([1.18, 0.23, 0.0], [1.78, 0.20, 0.0], 0.075, 0.06, 18);
  addPrism([[-0.92, 0.08, 0], [-1.55, 0.20, 0], [-1.72, 0.02, 0], [-0.98, -0.12, 0]], 0.09);
  addPrism([[-0.35, 0.16, 0.24], [0.48, 0.15, 0.25], [0.12, -0.32, 0.27], [-0.48, -0.18, 0.25]], 0.035);
  addPrism([[-0.35, 0.16, -0.24], [0.48, 0.15, -0.25], [0.12, -0.32, -0.27], [-0.48, -0.18, -0.25]], 0.035);
  addCylinder([-0.18, -0.34, 0.10], [-0.20, -0.80, 0.12], 0.025, 10);
  addCylinder([0.18, -0.34, -0.10], [0.20, -0.80, -0.12], 0.025, 10);
  addCylinder([-0.34, -0.81, 0.12], [0.02, -0.82, 0.12], 0.018, 8);
  addCylinder([0.04, -0.81, -0.12], [0.40, -0.82, -0.12], 0.018, 8);

  window.DEFAULT_KINGFISHER_EXAMPLE = {
    name: "Common kingfisher lightweight example",
    format: "Built-in low-poly example",
    textureImage: null,
    mesh: {
      positions,
      normals: [],
      uvs: [],
    },
    sourceTriangleCount: null,
    sampledTriangleCount: positions.length / 9,
  };
})();
