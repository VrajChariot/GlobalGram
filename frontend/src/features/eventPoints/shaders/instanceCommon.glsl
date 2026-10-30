// Shared by the beam and ring vertex shaders.
attribute vec3 aDirection;
attribute float aCategory;
attribute vec3 aGrowth;
attribute float aMembers;
attribute float aState;

uniform float uTime;
uniform float uSpawnDuration;
uniform vec3 uColors[6];
uniform float uBackOpacity;
uniform float uLimbOpacity;
// 0 = pure category colour, 1 = white.
uniform float uWhiteness;

float growthProgress() {
  float t = clamp((uTime - aGrowth.z) / uSpawnDuration, 0.0, 1.0);
  return 1.0 - pow(1.0 - t, 3.0);
}

float isHovered() {
  return mod(aState, 2.0);
}

float isSelected() {
  return step(1.5, aState);
}

float isCluster() {
  return step(1.5, aMembers);
}

// Tangent frame at the event: up is the surface normal.
void surfaceFrame(out vec3 up, out vec3 tangent, out vec3 bitangent) {
  up = aDirection;
  vec3 helper = abs(up.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  tangent = normalize(cross(helper, up));
  bitangent = cross(up, tangent);
}

// uBackOpacity behind the globe. In front, beams near the horizon lie side-on and
// show their full length, so they dim towards uLimbOpacity to keep the limb readable.
float facingOpacity(vec3 up) {
  vec4 base = modelViewMatrix * vec4(up, 1.0);
  float facing = dot(normalize(normalMatrix * up), normalize(-base.xyz));
  float front = mix(uLimbOpacity, 1.0, smoothstep(0.05, 0.6, facing));
  return mix(uBackOpacity, front, smoothstep(-0.02, 0.1, facing));
}

vec3 categoryColor() {
  return mix(uColors[int(aCategory + 0.5)], vec3(1.0), uWhiteness);
}
