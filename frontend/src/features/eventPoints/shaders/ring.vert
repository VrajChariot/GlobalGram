#include instanceCommon.glsl;

uniform float uRingSize;
uniform float uRingOpacity;

varying vec3 vColor;
varying float vAlpha;
varying float vSelected;

// Geometry: flat ring in the XY plane, outer radius 1. Static: no pulse.
void main() {
  vec3 up, tangent, bitangent;
  surfaceFrame(up, tangent, bitangent);

  float hovered = isHovered();
  vSelected = isSelected();
  float scale = uRingSize
    * mix(1.0, 1.6, isCluster())
    * mix(1.0, 1.4, max(hovered, vSelected))
    * growthProgress();

  vec3 local = up * 1.0015 + (tangent * position.x + bitangent * position.y) * scale;

  vColor = categoryColor();
  vAlpha = uRingOpacity * facingOpacity(up) * mix(1.0, 1.6, hovered);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(local, 1.0);
}
