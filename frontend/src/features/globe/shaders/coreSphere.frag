uniform vec3 uColor;
uniform vec3 uHighlight;
uniform float uTime;
uniform float uRimPower;
uniform float uRimStrength;
uniform float uScanlineOpacity;
uniform float uScanlineDensity;
uniform float uScanlineSpeed;
uniform float uFlicker;

varying vec3 vNormal;
varying vec3 vViewPosition;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPosition);

  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uRimPower) * uRimStrength;
  float scanline = (0.5 + 0.5 * sin(gl_FragCoord.y * uScanlineDensity + uTime * uScanlineSpeed)) * uScanlineOpacity;
  float flicker = (1.0 - uFlicker) + uFlicker * noise(uTime * 12.0);

  // The rim whitens towards the highlight; the centre stays near-black so the room shows through.
  vec3 color = mix(uColor, uHighlight, clamp(rim * 0.3, 0.0, 1.0)) * (rim + scanline) * flicker;
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
