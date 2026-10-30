#include instanceCommon.glsl;

uniform float uWidth;
uniform float uClusterWidth;

varying float vAlong;
varying vec3 vColor;
varying float vAlpha;
varying float vHovered;
varying float vSelected;

// Geometry: open unit cylinder, y in [0, 1] along the beam.
void main() {
  vec3 up, tangent, bitangent;
  surfaceFrame(up, tangent, bitangent);

  float height = mix(aGrowth.x, aGrowth.y, growthProgress());
  vHovered = isHovered();
  vSelected = isSelected();
  float scale = mix(1.0, 1.4, max(vHovered, vSelected));
  float width = uWidth * mix(1.0, uClusterWidth, isCluster()) * scale;

  vec3 local = up * (1.0 + position.y * height * scale) + (tangent * position.x + bitangent * position.z) * width;

  vAlong = position.y;
  vColor = categoryColor();
  vAlpha = facingOpacity(up) * step(1e-4, height);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(local, 1.0);
}
