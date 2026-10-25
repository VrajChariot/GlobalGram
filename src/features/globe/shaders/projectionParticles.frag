uniform vec3 uColor;
uniform float uOpacity;

varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vAlpha * uOpacity);
  #include <colorspace_fragment>
}
