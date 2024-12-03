#version 300 es

#define MAX_LIGHTS 16

// Fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision".
precision mediump float;

uniform bool u_show_normals;

// struct definitions
struct AmbientLight {
    vec3 color;
    float intensity;
};

struct DirectionalLight {
    vec3 direction;
    vec3 color;
    float intensity;
};

struct PointLight {
    vec3 position;
    vec3 color;
    float intensity;
};

struct Material {
    vec3 kA;
    vec3 kD;
    vec3 kS;
    vec3 emit;
    float shininess;
    sampler2D map_kD;
    sampler2D map_nS;
    sampler2D map_norm;
};

// lights and materials
uniform AmbientLight u_lights_ambient[MAX_LIGHTS];
uniform DirectionalLight u_lights_directional[MAX_LIGHTS];
uniform PointLight u_lights_point[MAX_LIGHTS];

uniform Material u_material;

// camera position in world space
uniform vec3 u_eye;

// with webgl 2, we now have to define an out that will be the color of the fragment
out vec4 o_fragColor;

// received from vertex stage
// TODO: Create variables to receive from the vertex stage
in vec3 vPos;
in vec3 v_norm;
in vec2 v_text_coord;
in mat3 TBN_matrix;

// Shades an ambient light and returns this light's contribution
vec3 shadeAmbientLight(Material material, AmbientLight light) {

    // TODO: Implement this
    // TODO: Include the material's map_kD to scale kA and to provide texture even in unlit areas
    // NOTE: We could use a separate map_kA for this, but most of the time we just want the same texture in unlit areas
    // HINT: Refer to http://paulbourke.net/dataformats/mtl/ for details
    // HINT: Parts of ./shaders/phong.frag.glsl can be re-used here

    vec3 ambColor = texture(material.map_kD, v_text_coord).rgb;

    vec3 ambientLight = material.kA * light.color * light.intensity * ambColor;

    return ambientLight;
}

// Shades a directional light and returns its contribution
vec3 shadeDirectionalLight(Material material, DirectionalLight light, vec3 normal, vec3 eye, vec3 vertex_position) {
    
    // TODO: Implement this
    // TODO: Use the material's map_kD and map_nS to scale kD and shininess
    // HINT: The darker pixels in the roughness map (map_nS) are the less shiny it should be
    // HINT: Refer to http://paulbourke.net/dataformats/mtl/ for details
    // HINT: Parts of ./shaders/phong.frag.glsl can be re-used here

    vec3 dirTexture = texture(material.map_kD,v_text_coord).rgb;
    vec3 scalekD = material.kD * dirTexture;

    float roughTexture = texture(material.map_nS, v_text_coord).r;
    float shineScale = material.shininess * roughTexture;

    vec3 viewDirect = normalize(eye - vertex_position );
    vec3 normalLight = -normalize(light.direction);
    vec3 normalized = normalize(normal);

    float NDotL = max(dot(normalized,normalLight),0.0);
    vec3 diffuse = scalekD * light.color * light.intensity * NDotL;

    vec3 reflect = reflect(-normalLight,normalized);
    float dotDirection = max(dot(viewDirect,reflect), 0.0);
    float specularFactored =  pow(dotDirection,shineScale);
    vec3 specular = light.color * material.kS * light.intensity * specularFactored;

    return specular + diffuse;
}

// Shades a point light and returns its contribution
vec3 shadePointLight(Material material, PointLight light, vec3 normal, vec3 eye, vec3 vertex_position) {

    // TODO: Implement this
    // TODO: Use the material's map_kD and map_nS to scale kD and shininess
    // HINT: The darker pixels in the roughness map (map_nS) are the less shiny it should be
    // HINT: Refer to http://paulbourke.net/dataformats/mtl/ for details
    // HINT: Parts of ./shaders/phong.frag.glsl can be re-used here

    vec3 dirTexture = texture(material.map_kD,v_text_coord).rgb;
    vec3 scalekD = material.kD * dirTexture;

    float roughTexture = texture(material.map_nS, v_text_coord).r;
    float shineScale = material.shininess * roughTexture;

    vec3 lightDirect = normalize(light.position - vertex_position);
    vec3 normalized = normalize(normal);
    vec3 viewDirect = normalize(eye - vertex_position );

    float distanceVL = length(light.position - vertex_position);


    float  linear = 0.0001;
    float constant = 1.0;
    float quadratic = 0.00001;

    float attenuation = 1.0/(constant + linear*distanceVL +  quadratic*(distanceVL * distanceVL));

    float NDotL = max(dot(normalized,lightDirect),0.0);
    vec3 diffuse = scalekD * light.color * light.intensity * NDotL * attenuation;


    vec3 reflect = reflect(-lightDirect,normalized);
    float dotDirection = max(dot(viewDirect,reflect), 0.0);
    float specularFactored =  pow(dotDirection,shineScale);

    vec3 specular = light.color * material.kS * light.intensity * specularFactored * attenuation;

    return specular + diffuse;
}

void main() {

    // TODO: Calculate the normal from the normal map and tbn matrix to get the world normal

    vec3 normMap = texture(u_material.map_norm, v_text_coord).rgb;
    normMap = normalize(normMap * 2.0 - 1.0);


    vec3 normal = normalize(TBN_matrix * normMap);

    // if we only want to visualize the normals, no further computations are needed
    // !do not change this code!
    if (u_show_normals == true) {
        o_fragColor = vec4(normal, 1.0);
        return;
    }

    // we start at 0.0 contribution for this vertex
    vec3 combinedColor = vec3(0.0);
     for(int i = 0; i < MAX_LIGHTS; i++){
        combinedColor += shadeAmbientLight(u_material, u_lights_ambient[i]);
    }

     for(int i = 0; i < MAX_LIGHTS; i++){
        combinedColor += shadeDirectionalLight(u_material, u_lights_directional[i],normal, u_eye, vPos);
    }

     for(int i = 0; i < MAX_LIGHTS; i++){
        combinedColor += shadePointLight(u_material, u_lights_point[i],normal, u_eye, vPos);
    }

    combinedColor += u_material.emit;

    combinedColor = clamp(combinedColor,0.0,1.0);

    o_fragColor = vec4(combinedColor, 1.0);
}