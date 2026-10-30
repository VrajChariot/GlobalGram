// A holographic emitter plate: soft inner disc, bright main ring, thin inner
// ring and a slowly rotating dashed outer ring. Radius 1 = plane edge.
uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;

float band(float r, float centre, float width) {
  float d = (r - centre) / width;
  return exp(-d * d);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float angle = atan(p.y, p.x);

  float disc = 0.08 * (1.0 - smoothstep(0.0, 0.72, r));
  float main = band(r, 0.72, 0.025);
  float inner = 0.5 * band(r, 0.6, 0.008);
  float dashes = step(0.5, fract(angle * 36.0 / 6.2831853 + uTime * 0.04)) * band(r, 0.9, 0.01) * 0.7;
  float pulse = 0.85 + 0.15 * sin(uTime * 1.6);

  vec3 color = mix(uColor, uHighlight, main * 0.5) * (disc + main * pulse + inner + dashes);
  gl_FragColor = vec4(color * uIntensity, 1.0);
  #include <colorspace_fragment>
}
