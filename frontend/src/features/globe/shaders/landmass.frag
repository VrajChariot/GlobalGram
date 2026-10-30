uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uOpacity;
uniform float uBackOpacity;
uniform float uTwinkle;

varying float vFacing;
varying float vTwinkle;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;

  float disc = smoothstep(0.5, 0.15, d);
  float front = smoothstep(-0.05, 0.2, vFacing);
  float alpha = mix(uBackOpacity, 1.0, front) * uOpacity * disc;
  vec3 color = mix(uColor, uHighlight, vTwinkle * uTwinkle);
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
