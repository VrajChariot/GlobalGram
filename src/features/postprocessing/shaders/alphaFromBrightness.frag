// The canvas is premultiplied-alpha over the webcam video. Setting alpha to the
// brightest *display* (sRGB) channel keeps rgb <= alpha after output encoding,
// so the page composites as rgb + video * (1 - alpha): black stays see-through
// and bright hologram lines sit on top like light.
float toSRGB(float c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
  float alpha = max(max(toSRGB(c.r), toSRGB(c.g)), toSRGB(c.b));
  outputColor = vec4(c, alpha);
}
