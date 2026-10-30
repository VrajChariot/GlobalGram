uniform float uIntensity;

varying float vAlong;
varying vec3 vColor;
varying float vAlpha;
varying float vHovered;
varying float vSelected;

void main() {
  // Bright at the base, fading towards the tip.
  // Clamp: interpolation can push vAlong a hair past 1, and pow() of a negative base is NaN,
  // which bloom would smear across the whole frame.
  float glow = pow(clamp(1.0 - vAlong, 0.0, 1.0), 2.2);
  vec3 color = mix(vColor, vec3(1.0), vSelected * 0.75);
  float brightness = (0.25 + 1.2 * glow) * uIntensity * (1.0 + 0.6 * vHovered);
  gl_FragColor = vec4(color * brightness, vAlpha * (0.15 + 0.85 * glow));
  #include <colorspace_fragment>
}
