import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTaraiGateOfJusticePoses,
  buildTaraiTriangleEdges,
  buildTaraiVortexStreamlines,
  getEniesLobbyOrientYawRad,
  getEniesOrientedBasis,
  getImpelDownOrientYawRad,
  getImpelDownOrientedBasis,
  getTaraiCentroidWorld,
  isUVInTaraiTriangle,
} from './taraiCurrentNetwork';

test('Enies Lobby Gate of Justice (-Z) and Impel Down Bridge (+Z) aim straight into the Tarai Current triangle centroid', () => {
  const centroid = getTaraiCentroidWorld(10);
  const elBasis = getEniesOrientedBasis(10);
  const idBasis = getImpelDownOrientedBasis(10);

  // Enies Lobby -south must point cleanly toward triangle centroid
  const toCentFromEl = {
    x: centroid.x - elBasis.origin.x,
    y: centroid.y - elBasis.origin.y,
    z: centroid.z - elBasis.origin.z,
  };
  const elGateForward = {
    x: -elBasis.south.x,
    y: -elBasis.south.y,
    z: -elBasis.south.z,
  };
  const elDot =
    (toCentFromEl.x * elGateForward.x +
      toCentFromEl.y * elGateForward.y +
      toCentFromEl.z * elGateForward.z) /
    Math.hypot(toCentFromEl.x, toCentFromEl.y, toCentFromEl.z);
  assert.ok(elDot > 0.98, `Expected Enies Lobby -Z to aim at Tarai centroid (dot=${elDot})`);
  assert.ok(Math.abs(getEniesLobbyOrientYawRad()) > 1.2);

  // Impel Down +south must point cleanly toward triangle centroid
  const toCentFromId = {
    x: centroid.x - idBasis.origin.x,
    y: centroid.y - idBasis.origin.y,
    z: centroid.z - idBasis.origin.z,
  };
  const idDot =
    (toCentFromId.x * idBasis.south.x +
      toCentFromId.y * idBasis.south.y +
      toCentFromId.z * idBasis.south.z) /
    Math.hypot(toCentFromId.x, toCentFromId.y, toCentFromId.z);
  assert.ok(idDot > 0.98, `Expected Impel Down +Z to aim at Tarai centroid (dot=${idDot})`);
  assert.ok(Math.abs(getImpelDownOrientYawRad()) > 2.5);
});

test('Closed Tarai Current triangle has 3 inward-facing Gates of Justice, 3 closed edges, and swirling interior streamlines', () => {
  const gates = buildTaraiGateOfJusticePoses(10);
  assert.equal(gates.length, 3);
  for (const g of gates) {
    assert.ok(Math.abs(Math.hypot(g.position.x, g.position.y, g.position.z) - 10) < 1e-4);
    assert.ok(Math.abs(Math.hypot(g.inwardDir.x, g.inwardDir.y, g.inwardDir.z) - 1) < 1e-4);
  }

  const edges = buildTaraiTriangleEdges(10, 0.0028, 20);
  assert.equal(edges.length, 3);
  // Closed triangle cycle: edge[0].end == edge[1].start, edge[2].end == edge[0].start
  const end0 = edges[0].points[edges[0].points.length - 1];
  const start1 = edges[1].points[0];
  const end2 = edges[2].points[edges[2].points.length - 1];
  const start0 = edges[0].points[0];
  assert.ok(Math.hypot(end0.x - start1.x, end0.y - start1.y, end0.z - start1.z) < 1e-4);
  assert.ok(Math.hypot(end2.x - start0.x, end2.y - start0.y, end2.z - start0.z) < 1e-4);

  const streamlines = buildTaraiVortexStreamlines(10);
  assert.equal(streamlines.length, 3);
  assert.equal(isUVInTaraiTriangle(0.888, 0.546), true);
  assert.equal(isUVInTaraiTriangle(0.5, 0.5), false);
});
