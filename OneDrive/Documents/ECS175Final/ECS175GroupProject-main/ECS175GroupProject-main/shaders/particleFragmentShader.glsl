#version 300 es
precision mediump float;

in vec3 v_color; // Color passed from vertex shader
uniform float u_alpha; // Alpha value passed from the particle system

out vec4 outColor;

void main() {
    outColor = vec4(v_color, u_alpha); // Use passed color with alpha value for transparency
}
