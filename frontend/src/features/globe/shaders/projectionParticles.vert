// Particles rising from the emitter ring towards the globe, fading in and out.
attribute vec4 aSeed; // angle, radius, speed, phase

uniform float uTime;
uniform float uRise;
uniform float uSize;
uniform float uHalfHeight;

varying float vAlpha;

void main() {
  float t = fract(uTime * aSeed.z + aSeed.w);
  float radius = aSeed.y * (1.0 - 0.25 * t);
  vec3 p = vec3(cos(aSeed.x) * radius, t * uRise, sin(aSeed.x) * radius);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  vAlpha = sin(3.14159265 * t);
  gl_PointSize = uSize * projectionMatrix[1][1] * uHalfHeight / -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
