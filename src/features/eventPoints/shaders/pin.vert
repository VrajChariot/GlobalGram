#include instanceCommon.glsl;

uniform float uPinSize;
uniform float uClusterPin;

varying vec3 vColor;
varying float vAlpha;
varying float vHovered;
varying float vSelected;
// 0 at the centre, 1 along the hexagon's edge (linear across each triangle).
varying float vRim;

// Geometry: hexagon (6-segment circle) of radius 1 in XY, billboarded at the beam tip.
void main() {
  vec3 up, tangent, bitangent;
  surfaceFrame(up, tangent, bitangent);

  float grow = growthProgress();
  float height = mix(aGrowth.x, aGrowth.y, grow);
  vHovered = isHovered();
  vSelected = isSelected();
  // Same scale as the beam so the pin stays on its tip when hovered.
  float scale = mix(1.0, 1.4, max(vHovered, vSelected));

  vec4 mvPosition = modelViewMatrix * vec4(up * (1.0 + height * scale), 1.0);
  float size = uPinSize * mix(1.0, uClusterPin, isCluster()) * scale * grow;
  mvPosition.xy += position.xy * size;

  vRim = length(position.xy);
  vColor = categoryColor();
  vAlpha = facingOpacity(up) * step(1e-4, height);
  gl_Position = projectionMatrix * mvPosition;
}
