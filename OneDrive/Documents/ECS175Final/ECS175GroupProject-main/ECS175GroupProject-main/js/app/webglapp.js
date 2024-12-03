'use strict'

import { hex2rgb, deg2rad, loadExternalFile } from '../utils/utils.js'
import Box from './box3d.js'
import Input from '../input/input.js'
import * as mat4 from '../lib/glmatrix/mat4.js'
import * as vec3 from '../lib/glmatrix/vec3.js'
import * as quat from '../lib/glmatrix/quat.js'

import { OBJLoader } from '../../assignment3.objloader.js'
import { Scene, SceneNode } from './scene.js'

class Particle {
    constructor(position, velocity, lifetime, color) {
        this.position = vec3.clone(position);
        this.velocity = vec3.clone(velocity);
        this.lifetime = lifetime;
        this.initialLifetime = lifetime;
        this.alpha = 1.0;
        this.color = color; 
    }

    update(deltaTime) {
        vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.velocity, deltaTime));
        this.lifetime -= deltaTime;
        this.alpha = this.lifetime / this.initialLifetime;
    }
}



class ParticleSystem {
    constructor(gl, shader) {
        this.gl = gl;
        this.shader = shader;
        this.particles = [];
    }

    emit(position, baseVelocity, lifetime) {
        let randomOffset = vec3.fromValues(
            (Math.random() - 0.5) * 0.5, 
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        let initialPosition = vec3.add(vec3.create(), position, randomOffset);
    
        let randomVelocity = vec3.fromValues(
            baseVelocity[0] + (Math.random() - 0.25),
            baseVelocity[1] + (Math.random() - 0.25),
            baseVelocity[2] + (Math.random() - 0.25)
        );
    

        let color = [1.0, 0.5, 0.0];
    
        this.particles.push(new Particle(initialPosition, randomVelocity, lifetime, color));
    }
    
    
    

    update(deltaTime) {
        for (let particle of this.particles) {
            particle.update(deltaTime);
        }

        this.particles = this.particles.filter(p => p.lifetime > 0);
    }

    render() {
        this.shader.use();
        for (let particle of this.particles) {
            this.shader.setUniform3f('u_position', particle.position);
            this.shader.setUniform1f('u_alpha', particle.alpha);
            this.shader.setUniform3f('u_color', particle.color); 
            this.gl.drawArrays(this.gl.POINTS, 0, 1);
        }
        this.shader.unuse();
    }
    
    
}




/**
 * @Class
 * WebGlApp that will call basic GL functions, manage a list of shapes, and take care of rendering them
 * 
 * This class will use the Shapes that you have implemented to store and render them
 */
class WebGlApp 
{
    /**
     * Initializes the app with a box, and the model, view, and projection matrices
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Map<String,Shader>} shader The shaders to be used to draw the object
     * @param {AppState} app_state The state of the UI
     */
    constructor( gl, shaders, app_state )
    {
        // Set GL flags
        this.setGlFlags( gl )

        // Store the shader(s)
        this.shaders = shaders // Collection of all shaders
        this.box_shader = this.shaders[0]
        this.light_shader = this.shaders[this.shaders.length - 2]
        this.particle_shader =  this.shaders[this.shaders.length - 1]
        this.active_shader = 1
        
        // Create a box instance and create a variable to track its rotation
        this.box = new Box( gl, this.box_shader )
        this.animation_step = 0

        // Declare a variable to hold a Scene
        // Scene files can be loaded through the UI (see below)
        this.scene = null

        // Bind a callback to the file dialog in the UI that loads a scene file
        app_state.onOpen3DScene((filename) => {
            let scene_config = JSON.parse(loadExternalFile(`./scenes/${filename}`))
            this.scene = new Scene(scene_config, gl, this.shaders[this.active_shader], this.light_shader)
            return this.scene
        })

        // Create the view matrix
        this.eye     =   [2.0, 0.5, -2.0]
        this.center  =   [0, 0, 0]
       
        this.forward =   null
        this.right   =   null
        this.up      =   null
        // Forward, Right, and Up are initialized based on Eye and Center
        this.updateViewSpaceVectors()
        this.view = mat4.lookAt(mat4.create(), this.eye, this.center, this.up)

        // Create the projection matrix
        this.fovy = 60
        this.aspect = 16/9
        this.near = 0.001
        this.far = 1000.0
        this.projection = mat4.perspective(mat4.create(), deg2rad(this.fovy), this.aspect, this.near, this.far)

        // Use the shader's setUniform4x4f function to pass the matrices
        for (let shader of this.shaders) {
            shader.use()
            shader.setUniform3f('u_eye', this.eye);
            shader.setUniform4x4f('u_v', this.view)
            shader.setUniform4x4f('u_p', this.projection)
            shader.unuse()
        }
        this.particleSystem = new ParticleSystem(gl, this.particle_shader);


    }  

    /**
     * Sets up GL flags
     * In this assignment we are drawing 3D data, so we need to enable the flag 
     * for depth testing. This will prevent from geometry that is occluded by other 
     * geometry from 'shining through' (i.e. being wrongly drawn on top of closer geomentry)
     * 
     * Look into gl.enable() and gl.DEPTH_TEST to learn about this topic
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    setGlFlags( gl ) {

        // Enable depth test
        gl.enable(gl.DEPTH_TEST)

    }

    /**
     * Sets the viewport of the canvas to fill the whole available space so we draw to the whole canvas
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} width 
     * @param {Number} height 
     */
    setViewport( gl, width, height )
    {
        gl.viewport( 0, 0, width, height )
    }

    /**
     * Clears the canvas color
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    clearCanvas( gl )
    {
        gl.clearColor(...hex2rgb('#000000'), 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }
    
    /**
     * Updates components of this app
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {AppState} app_state The state of the UI
     * @param {Number} delta_time The time in fractional seconds since the last frame
     */
    update(gl, app_state, delta_time) {
        // Shader
        if (this.scene != null) {
            let old_active_shader = this.active_shader;
            switch(app_state.getState('Shading')) {
                case 'Phong':
                    this.active_shader = 1;
                    break;
                case 'Textured':
                    this.active_shader = 2;
                    break;
            }
            if (old_active_shader != this.active_shader) {
                this.scene.resetLights(this.shaders[this.active_shader]);
                for (let node of this.scene.getNodes()) {
                    if (node.type == 'model')
                        node.setShader(gl, this.shaders[this.active_shader]);
                    if (node.type == 'light')
                        node.setTargetShader(this.shaders[this.active_shader]);
                }
            }
        }
    
        // Shader Debug
        switch(app_state.getState('Shading Debug')) {
            case 'Normals':
                this.shaders[this.active_shader].use();
                this.shaders[this.active_shader].setUniform1i('u_show_normals', 1);
                this.shaders[this.active_shader].unuse();
                break;
            default:
                this.shaders[this.active_shader].use();
                this.shaders[this.active_shader].setUniform1i('u_show_normals', 0);
                this.shaders[this.active_shader].unuse();
                break;
        }
    
        // Control
        switch(app_state.getState('Control')) {
            case 'Camera':
                this.updateCamera(delta_time);
                break;
            case 'Scene Node':
                // Only do this if a scene is loaded
                if (this.scene == null)
                    break;
                

                let scene_node = this.scene.getNode(app_state.getState('Select Scene Node'));
                this.updateSceneNode(scene_node, delta_time);
                let moonNode = this.scene.getNode("asteroid_node");
                let position = moonNode.getPosition();

                if (scene_node) {
                    let baseVelocity = [0, 1, 0];
                    this.particleSystem.emit(position, baseVelocity, 1.0); 
                  
                }
                break;
        }
    
        this.particleSystem.update(delta_time);
    }
    

    /**
     * Update the Forward, Right, and Up vector according to changes in the 
     * camera position (Eye) or the center of focus (Center)
     */
     updateViewSpaceVectors( ) {
        this.forward = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.eye, this.center))
        this.right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), [0,1,0], this.forward))
        this.up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), this.forward, this.right))
    }

    /**
     * Update the camera view based on user input and the arcball viewing model
     * 
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the view's center
     * 2) Middle Mouse Button or Space+Left Mouse Button - Pan the view relative view-space
     * 3) Right Mouse Button - Zoom towards or away from the view's center
     * 
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateCamera( delta_time ) {
        let view_dirty = false

        // Control - Zoom
        if (Input.isMouseDown(2)) {
            // Scale camera position
            let translation = vec3.scale(vec3.create(), this.forward, -Input.getMouseDy() * delta_time)
            this.eye = vec3.add(vec3.create(), this.eye, translation)

            // Set dirty flag to trigger view matrix updates
            view_dirty = true
        }

        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {
            // Rotate around xz plane around y
            this.eye = vec3.rotateY(vec3.create(), this.eye, this.center, deg2rad(-10 * Input.getMouseDx() * delta_time ))
            
            // Rotate around view-aligned rotation axis
            let rotation = mat4.fromRotation(mat4.create(), deg2rad(-10 * Input.getMouseDy() * delta_time ), this.right)
            this.eye = vec3.transformMat4(vec3.create(), this.eye, rotation)

            // Set dirty flag to trigger view matrix updates
            view_dirty = true
        }

        // Control - Pan
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {
            // Create translation on two view-aligned axes
            let translation = vec3.add(vec3.create(), 
                vec3.scale(vec3.create(), this.right, -0.75 * Input.getMouseDx() * delta_time),
                vec3.scale(vec3.create(), this.up, 0.75 * Input.getMouseDy() * delta_time)
            )

            // Translate both eye and center in parallel
            this.eye = vec3.add(vec3.create(), this.eye, translation)
            this.center = vec3.add(vec3.create(), this.center, translation)

            view_dirty = true
        }

        // Update view matrix if needed
        if (view_dirty) {
            // Update Forward, Right, and Up vectors
            this.updateViewSpaceVectors()

            this.view = mat4.lookAt(mat4.create(), this.eye, this.center, this.up)

            for (let shader of this.shaders) {
                shader.use()
                shader.setUniform3f('u_eye', this.eye)
                shader.setUniform4x4f('u_v', this.view)
                shader.unuse()
            }
        }
    }

    /**
     * Update a SceneNode's local transformation
     * 
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the node relative to the view along the Up and Right axes
     * 2) Middle Mouse Button or Space+Left Mouse Button - Translate the node relative to the view along the Up and Right axes
     * 3) Right Mouse Button - Scales the node around it's local center
     * 
     * @param {SceneNode} node The SceneNode to manipulate
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateSceneNode(node, delta_time) {
        if (!node) return;
    
        let kid = node.children[1];
        let asteroidNode = node.children[2];
        

        let translation = vec3.fromValues(0, 0, 10.0 * delta_time); 
        let currentTransform = asteroidNode.getTransformation(); 
        let translationMatrix = mat4.fromTranslation(mat4.create(), translation); 
        let newTransform = mat4.multiply(mat4.create(), currentTransform, translationMatrix);
        asteroidNode.setTransformation(newTransform); 
    
        
        let rotation_speed = deg2rad(30) * delta_time;
        let rotation = mat4.fromRotation(mat4.create(), rotation_speed, [0, 1, 0]);
    
        let transformation = kid.getTransformation();
        
        transformation = mat4.multiply(mat4.create(), transformation, rotation);
        
        kid.setTransformation(transformation);
        let particlePosition = vec3.transformMat4(vec3.create(), [0, 0, 0], newTransform);
        for (let i = 0; i < 4; i++) {
        this.particleSystem.emit(particlePosition, [-1.0, 0, 0], 1.0);
        }
        
    }
    

    /**
     * Main render loop which sets up the active viewport (i.e. the area of the canvas we draw to)
     * clears the canvas with a background color and draws the scene
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} canvas_width The canvas width. Needed to set the viewport
     * @param {Number} canvas_height The canvas height. Needed to set the viewport
     */
    render( gl, canvas_width, canvas_height )
    {
        // Set viewport and clear canvas
        this.setViewport( gl, canvas_width, canvas_height )
        this.clearCanvas( gl )

        // Render the box
        // This will use the MVP that was passed to the shader
        this.box.render( gl )

        // Render the scene
        if (this.scene) this.scene.render( gl )
        this.particleSystem.render(gl);


    }

}

export default WebGlApp
