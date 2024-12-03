#version 300 es
precision mediump float;

layout(location = 0) in vec3 a_position;

uniform mat4 u_v;
uniform mat4 u_p;
uniform vec3 u_position;
uniform vec3 u_color; // Add color uniform

out vec3 v_color; // Pass color to fragment shader

void main() {
    gl_Position = u_p * u_v * vec4(a_position + u_position, 1.0);
    gl_PointSize = 5.0; // Adjust size as needed
    v_color = u_color; // Pass the color to the fragment shader
}
