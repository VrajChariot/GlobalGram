uniform float uIntensity;

varying vec3 vColor;
varying float vAlpha;
varying float vHovered;
varying float vSelected;
varying float vRim;

void main() {
  // Dim glassy fill with a bright hexagonal outline.
  float edge = smoothstep(0.7, 0.92, vRim);
  float fill = 0.3 + 0.25 * vHovered + 0.5 * vSelected;
  vec3 color = mix(vColor, vec3(1.0), vSelected);
  gl_FragColor = vec4(color * mix(fill, 1.6, edge) * uIntensity, vAlpha);
  #include <colorspace_fragment>
}
