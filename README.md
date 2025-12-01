
# Badminton Court 3D Environment – Blender + Three.js

### First-Person and Third-Person Navigation with Collision and Camera Control

This project is an interactive 3D badminton court built using Blender for modeling and Three.js for rendering.
It includes two navigation modes—first-person and third-person—along with obstacle detection, floor collision handling, and smooth camera following.
The environment runs on a modern Vite development server using `npm run dev`.

## Features

### 3D Badminton Court

The badminton court model is created in Blender and exported as a GLTF file.
It includes the floor, walls, net, seating, and additional environment objects.
All objects other than the floor are considered obstacles and contribute to collision detection.

### First-Person View

The project supports immersive first-person movement using pointer-lock controls.
The camera follows natural head-level height.
The system ensures the camera does not pass through walls and stays above the court surface.

### Third-Person View

A robot character model is loaded into the scene and becomes visible in third-person mode.
Movement is controlled through keyboard input.
The camera follows the character from behind, adjusting smoothly and avoiding clipping through objects.

### Collision Detection

The system uses raycasting to detect nearby objects and prevent movement into them.
Rays are cast from several vertical positions to detect both low and high obstacles.
Floor collision is also handled to prevent sinking below the court model.

### Camera Anti-Clipping

In third-person mode, the camera automatically adjusts its distance based on nearby obstacles using raycasting.
If the camera's desired position is blocked, it moves closer to maintain a clear line of sight.
Smooth interpolation stabilizes camera motion.

### View Mode Toggle

Press the V key to switch between first-person and third-person views at any time.


## Technology Stack

* Three.js
* GLTFLoader for models
* PointerLockControls for first-person movement
* Vite for local development
* Blender for modeling


## Controls

Movement
W – Forward
S – Backward
A – Turn left
D – Turn right

View
V – Switch between First-Person and Third-Person

Mouse
Click – Enable pointer lock for First-Person mode


## Running the Project

Install dependencies:

```
npm install
```

Start the development server:

```
npm run dev
```

A local URL will be displayed.
Open it in your browser to explore the 3D environment.
Click inside the window to activate pointer-lock controls.



## Blender to Three.js Notes

The court model is exported as a GLTF file.
Its floor object is identified separately, while all other meshes are added to the collision system.
Scale and orientation remain consistent with the Blender file.
No special transformations or adjustments are required after export.



## Credits

* Three.js for rendering
* Blender for modeling
* RobotExpressive model from the official Three.js sample assets


