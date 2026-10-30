varying float vFacing;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vFacing = dot(normalize(normalMatrix * position), normalize(-mvPosition.xyz));
  gl_Position = projectionMatrix * mvPosition;
}
