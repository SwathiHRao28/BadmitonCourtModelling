import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// ---------------------------------------------------
// SCENE + CAMERA
// ---------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0.8, 0); // 1st person height (0.8m)

// ---------------------------------------------------
// RENDERER
// ---------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------
// CONTROLS (FIRST PERSON)
// ---------------------------------------------------
const controls = new PointerLockControls(camera, renderer.domElement);
document.body.addEventListener('click', () => controls.lock());

// ---------------------------------------------------
// LIGHTS
// ---------------------------------------------------
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
hemi.position.set(0, 20, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(10, 20, 10);
dir.castShadow = true;
scene.add(dir);

// ---------------------------------------------------
// COLLISION SETUP
// ---------------------------------------------------
let floorMesh;
// FIX 1: Corrected floor level based on Blender data (-0.18m Z-location)
const floorY = -0.18; 
const collidableObjects = []; 

const raycaster = new THREE.Raycaster();
const cameraRaycaster = new THREE.Raycaster();

const collisionDistance = 0.5; 

// Directions for raycasting: 0:Forward, 1:Backward, 2:Left (Strafing), 3:Right (Strafing)
const rayDirections = [
    new THREE.Vector3(0, 0, -1), // Forward (Z-)
    new THREE.Vector3(0, 0, 1),  // Backward (Z+)
    new THREE.Vector3(-1, 0, 0), // Left (X-)
    new THREE.Vector3(1, 0, 0),  // Right (X+)
];

// Heights for multi-ray collision to catch chairs and low objects
const rayHeights = [
    0.2, // Low ray 
    0.8, // Mid ray 
    1.6  // High ray 
];

// ---------------------------------------------------
// COLLISION FUNCTIONS
// ---------------------------------------------------

// Function to prevent object/camera from falling through the floor
function checkFloorCollision(object, heightOffset) {
  // Uses the corrected floorY value
  if (object.position.y < floorY + heightOffset) {
    object.position.y = floorY + heightOffset;
  }
}

// Function to check for wall/object collision using MULTIPLE rays
function checkObjectCollision(object, directionIndex) {
    if (collidableObjects.length === 0) return false;

    // 1. Get and rotate the direction vector
    const direction = rayDirections[directionIndex].clone();
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), object.rotation.y);
    
    // 2. Check collisions at multiple heights
    for (const heightOffset of rayHeights) {
        const origin = object.position.clone();
        
        // Firing rays from correct height relative to the floorY
        if (object === camera) {
             // For FPV, fire from floorY + ray height
             origin.y = floorY + heightOffset; 
        } else {
             // For the player object
             origin.y = object.position.y + heightOffset; 
        }

        // 3. Set up the raycaster
        raycaster.set(origin, direction);
        raycaster.near = 0.05; 
        raycaster.far = collisionDistance; 

        // 4. Check for intersections
        const intersections = raycaster.intersectObjects(collidableObjects, true);

        // If we hit anything, stop and return true
        if (intersections.length > 0 && intersections[0].distance < collisionDistance) {
            return true;
        }
    }
    
    return false;
}

// ---------------------------------------------------
// LOAD COURT MODEL
// ---------------------------------------------------
const loader = new GLTFLoader();
loader.load('/models/court.glb', (gltf) => {
  gltf.scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;

      if (obj.name === 'floor') {
          floorMesh = obj;
      } else {
          collidableObjects.push(obj);
      }
    }
  });
  scene.add(gltf.scene);
});

// ---------------------------------------------------
// LOAD PLAYER MODEL (THIRD PERSON)
// ---------------------------------------------------
let player;
const playerLoader = new GLTFLoader();

playerLoader.load('/models/RobotExpressive.glb', (gltf) => {
  player = gltf.scene;
  player.scale.set(0.5, 0.5, 0.5); 
  player.position.set(0, 0, 3);
  player.visible = false; 

  scene.add(player);
});

// ---------------------------------------------------
// KEYBOARD INPUT
// ---------------------------------------------------
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyV') toggleViewMode();

  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = true;
      break;

    case 'KeyS':
    case 'ArrowDown':
      keys.backward = true;
      break;

    case 'KeyA':
    case 'ArrowLeft':
      keys.left = true;
      break;

    case 'KeyD':
    case 'ArrowRight':
      keys.right = true;
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = false;
      break;

    case 'KeyS':
    case 'ArrowDown':
      keys.backward = false;
      break;

    case 'KeyA':
    case 'ArrowLeft':
      keys.left = false;
      break;

    case 'KeyD':
    case 'ArrowRight':
      keys.right = false;
     break;
  }
});

// ---------------------------------------------------
// VIEW MODE TOGGLE
// ---------------------------------------------------
let isThirdPerson = false;

function toggleViewMode() {
  isThirdPerson = !isThirdPerson;

  if (isThirdPerson) {
    controls.unlock(); // disable FPV look
    if (player) player.visible = true; // Show model
    console.log('Switched to Third Person View');
  } else {
    controls.lock(); // enable FPV again
    if (player) player.visible = false; // Hide model
    console.log('Switched to First Person View');
  }
}

// ---------------------------------------------------
// MOVEMENT + CAMERA FOLLOW (3RD PERSON)
// ---------------------------------------------------
const clock = new THREE.Clock();
const moveSpeed = 4;
const turnSpeed = Math.PI * 1.2;

const thirdPersonOffset = new THREE.Vector3(0, 3, -5);

// ---------------------------------------------------
// ANIMATION LOOP
// ---------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (!isThirdPerson) {
    // -----------------------------
    // FIRST PERSON MODE
    // -----------------------------
    if (controls.isLocked) {
      const moveDist = moveSpeed * delta;

      // Check for collision before moving FPV camera
      if (keys.forward) {
          if (!checkObjectCollision(camera, 0)) {
              controls.moveForward(moveDist);
          }
      }
      if (keys.backward) {
          if (!checkObjectCollision(camera, 1)) {
              controls.moveForward(-moveDist);
          }
      }
      
      // A/D controls rotation/turning in your original FPV logic
      if (keys.left) camera.rotation.y += turnSpeed * delta;
      if (keys.right) camera.rotation.y -= turnSpeed * delta;
    }

    // --- Floor Collision: Camera ---
    // Camera is 0.8m high (from 0 to 0.8), so the offset is 0.8
    checkFloorCollision(camera, 0.8); 
  }

  if (isThirdPerson && player) {
    // -----------------------------
    // THIRD PERSON MOVEMENT
    // -----------------------------
    const moveDist = moveSpeed * delta;
    const turnAngle = turnSpeed * delta;

    // Check for wall/chair collision before moving player
    if (keys.forward) {
        if (!checkObjectCollision(player, 0)) {
            player.translateZ(-moveDist);
        }
    }
    if (keys.backward) {
        if (!checkObjectCollision(player, 1)) {
            player.translateZ(moveDist);
        }
    }
    
    // Rotation is not blocked
    if (keys.left) player.rotation.y += turnAngle;
    if (keys.right) player.rotation.y -= turnAngle;

    // --- Floor Collision: Player (FIXED) ---
    // Refined half-height (0.85) plants the robot's feet on the floorY=-0.18 plane
    const playerHalfHeight = 0.85; 
    checkFloorCollision(player, playerHalfHeight);
    // ---------------------------------------

    // -----------------------------
    // CAMERA FOLLOW (Anti-Clipping Fix)
    // -----------------------------
    const offset = thirdPersonOffset.clone();
    
    // 1. Calculate the desired camera position (Target Pos)
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    const desiredCameraPos = player.position.clone().add(offset);
    
    // 2. Set up Raycaster: From player's head (origin) back to the desired position
    const origin = player.position.clone();
    origin.y += 1.0; // Fire ray from the center of the robot's body height
    
    const direction = desiredCameraPos.clone().sub(origin).normalize();
    const distance = desiredCameraPos.distanceTo(origin);
    
    cameraRaycaster.set(origin, direction);
    cameraRaycaster.far = distance;
    
    const intersects = cameraRaycaster.intersectObjects(collidableObjects, true);
    
    let targetPos;

    if (intersects.length > 0) {
        // Collision detected: Place the camera slightly in front of the wall
        const safeDistance = intersects[0].distance - 0.5; // 0.5 is a buffer
        
        // Calculate the safe camera position
        targetPos = origin.clone().add(direction.multiplyScalar(safeDistance));

    } else {
        // No collision: Use the original desired position
        targetPos = desiredCameraPos;
    }
    
    // 3. Smoothly move the camera
    camera.position.lerp(targetPos, 0.1);
    
    // 4. Look at the player 
    const lookAtTarget = player.position.clone();
    lookAtTarget.y += 0.5; // Look slightly higher than the robot's origin (center)
    camera.lookAt(lookAtTarget);
  }

  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------
// WINDOW RESIZE
// ---------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});