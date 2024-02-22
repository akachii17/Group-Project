import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/build/three.module.js';
import { OrbitControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

// Erstellen Sie eine Szene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Hintergrund weiß machen

// Erstellen Sie eine Kamera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

// Erstellen Sie eine Umgebungslichtquelle
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Erstellen Sie ein Richtungslicht für Schatten
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Schattenkamera-Parameter
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;

// Erstellen Sie ein WebGL-Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Erstellen Sie OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;

// Erstellen Sie ein Gitter
const gridHelper = new THREE.GridHelper(100, 10);
scene.add(gridHelper);

// GUI-Parameter für die Y-Position des ersten Punktes der Fläche
const guiParams = {
  yOffset: 0, // Standardmäßig keine Verschiebung
  curveCount: 2, // Standardmäßig zwei Kurven
  pointCount: 10, // Standardmäßig 50 Punkte pro Kurve
  curveSeparation: 5 // Standardmäßig 5 Einheiten Abstand zwischen den Kurven
};

// Erstellen Sie eine GUI
const gui = new GUI();
gui.add(guiParams, 'yOffset', 0, 0.25, 0.01).onChange(updatePointsAlongNormals);
gui.add(guiParams, 'curveCount', 1, 10, 1).onChange(updateCurves); // Min, Max und Schrittweite für Kurvenanzahl
gui.add(guiParams, 'pointCount', 1, 20, 1).onChange(updateCurves); // Min, Max und Schrittweite für Punkteanzahl
gui.add(guiParams, 'curveSeparation', 1, 10, 1).onChange(updateCurves); // Min, Max und Schrittweite für Kurvenabstand

// Arrays für Kurven und Meshes
const curves = [];
const meshes = [];
const surfaces = [];
const lineMeshes = [];

function updatePointsAlongNormals() {
  surfaces.forEach(surface => {
      const positions = surface.geometry.attributes.position;
      const normals = surface.geometry.attributes.normal;

      // Index für den ersten Punkt
      const posIndex = 0;
      const normIndex = 0;

      // Aktuelle Position und Normale des ersten Punktes
      const currentPos = new THREE.Vector3(positions.array[posIndex], positions.array[posIndex + 1], positions.array[posIndex + 2]);
      const currentNorm = new THREE.Vector3(normals.array[normIndex], normals.array[normIndex + 1], normals.array[normIndex + 2]);

      // Verschiebe die Position des ersten Punktes entlang der Normalen
      const displacement = currentNorm.clone().multiplyScalar(guiParams.yOffset);
      const newPosition = currentPos.add(displacement);

      // Aktualisiere die Position des ersten Punktes
      positions.array[posIndex] = newPosition.x;
      positions.array[posIndex + 1] = newPosition.y;
      positions.array[posIndex + 2] = newPosition.z;

      // Aktualisiere die Positionen im BufferGeometry
      positions.needsUpdate = true;
  });
}


// Funktion zum Aktualisieren der Kurven und Meshes
function updateCurves() {
  // Entfernen Sie vorhandene Kurven, Meshes, Flächen und Linien
  curves.forEach(curve => scene.remove(curve));
  meshes.forEach(mesh => scene.remove(mesh));
  surfaces.forEach(surface => scene.remove(surface));
  lineMeshes.forEach(lineMesh => scene.remove(lineMesh));
  
  // Leerung der Arrays
  curves.length = 0;
  meshes.length = 0;
  surfaces.length = 0;
  lineMeshes.length = 0;
  
  // Neuerstellungen der Kurven und Meshes
  for (let i = 0; i < guiParams.curveCount; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-10, 0, i * guiParams.curveSeparation),
      new THREE.Vector3(-5, 5, i * guiParams.curveSeparation + 5),
      new THREE.Vector3(0, 0, i * guiParams.curveSeparation + 10),
      new THREE.Vector3(5, -5, i * guiParams.curveSeparation + 15),
      new THREE.Vector3(10, 0, i * guiParams.curveSeparation + 20)
    ]);
    curves.push(curve);
    
    const points = curve.getPoints(guiParams.pointCount);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Rot
    const mesh = new THREE.Line(geometry, material);
    meshes.push(mesh);
    scene.add(mesh);
    
    // Verbinden Sie die Punkte der aktuellen Kurve mit den Punkten der vorherigen Kurve
    if (i > 0) {
      const prevPoints = curves[i - 1].getPoints(guiParams.pointCount);
      for (let j = 0; j < points.length; j++) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([prevPoints[j], points[j]]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blau
        const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
        lineMeshes.push(lineMesh); // Hinzufügen zum Linien-Array
        scene.add(lineMesh);
      }
    }
    
    // Erstellen Sie Flächen zwischen den Kurven
    if (i > 0) {
      const prevPoints = curves[i - 1].getPoints(guiParams.pointCount);
      for (let j = 0; j < points.length - 1; j++) {
        const surfaceGeometry = new THREE.BufferGeometry();
        surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
          prevPoints[j].x, prevPoints[j].y, prevPoints[j].z,
          points[j].x, points[j].y, points[j].z,
          points[j + 1].x, points[j + 1].y, points[j + 1].z,
          prevPoints[j + 1].x, prevPoints[j + 1].y, prevPoints[j + 1].z
        ]), 3));
        surfaceGeometry.setIndex([0, 1, 2, 0, 2, 3]);
        surfaceGeometry.computeVertexNormals();
        const surfaceMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide }); // Grau
        const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
        surfaces.push(surface);
        scene.add(surface);
      }
    }
  }
}
  
  // Initialisierung
  updateCurves();
  
  // Animations-Loop
  function animate() {
    requestAnimationFrame(animate);
  
    // Aktualisieren Sie OrbitControls
    controls.update();
  
    // Rendern Sie die Szene mit der Kamera
    renderer.render(scene, camera);
  }
  
  // Starten Sie die Animations-Loop
  animate();


