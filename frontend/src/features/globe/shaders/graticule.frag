uniform vec3 uColor;
uniform float uOpacity;
uniform float uBackOpacity;

varying float vFacing;

void main() {
  float front = smoothstep(-0.05, 0.2, vFacing);
  gl_FragColor = vec4(uColor, uOpacity * mix(uBackOpacity, 1.0, front));
  #include <colorspace_fragment>
}
