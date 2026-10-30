uniform float uSize;
uniform float uHalfHeight;
uniform float uTime;

varying float vFacing;
varying float vTwinkle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  // Points sit on a unit sphere, so position doubles as the surface normal.
  vec3 normal = normalize(normalMatrix * position);
  vFacing = dot(normal, normalize(-mvPosition.xyz));

  float seed = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  vTwinkle = 0.5 + 0.5 * sin(uTime * 1.5 + seed * 6.2831853);

  // World-space size: projectionMatrix[1][1] / -z converts to NDC, uHalfHeight to pixels.
  gl_PointSize = uSize * projectionMatrix[1][1] * uHalfHeight / -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
