// Rendered on the back faces of a sphere slightly larger than the globe.
uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;
uniform float uInnerFade;
// -dot(N, V) where the view ray grazes the globe's silhouette.
uniform float uGlobeEdge;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Back faces point away from the camera: 0 at the halo's outer edge, rising towards the centre.
  float f = -dot(normalize(vNormal), normalize(vViewPosition));
  float halo = pow(clamp(f / uGlobeEdge, 0.0, 1.0), uPower);
  // smoothstep is undefined when its edges are equal, so keep the fade width above zero.
  float inside = 1.0 - smoothstep(uGlobeEdge, uGlobeEdge + max(uInnerFade, 1e-4), f);
  gl_FragColor = vec4(uColor * halo * inside * uIntensity, 1.0);
  #include <colorspace_fragment>
}
