uniform float uIntensity;

varying vec3 vColor;
varying float vAlpha;
varying float vSelected;

void main() {
  vec3 color = mix(vColor, vec3(1.0), vSelected * 0.75);
  gl_FragColor = vec4(color * uIntensity, vAlpha);
  #include <colorspace_fragment>
}
