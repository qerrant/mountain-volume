import './style.css'
import { PCFSoftShadowMap, BufferGeometry, BufferAttribute, AmbientLight, Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, MeshStandardMaterial, MeshBasicMaterial, Mesh, DirectionalLight, Vector3 } from "three";
import { OrbitControls } from "three-stdlib";

// parameters
const PLANE_WIDTH = 10;
const PLANE_HEIGHT = 5;
const WIDTH_SEGMENTS = 20;
const HEIGHT_SEGMENTS = 10;
const MAX_HEIGHT = 2;

// visual part
const scene: Scene = new Scene();

const camera: PerspectiveCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 9;
camera.position.y = 5;
camera.position.x = -2;

const renderer: WebGLRenderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.shadowMap.enabled = true;
renderer.shadowMap.cullFrontFaces = false;
renderer.shadowMap.type = PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const geometry = new PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, WIDTH_SEGMENTS, HEIGHT_SEGMENTS);
const material = new MeshStandardMaterial({ color: 0x049ef4 });
const wireframeMaterial = new MeshBasicMaterial({ color: 0xffffff, wireframe: true });
const plane = new Mesh(geometry, material);
const wireplane = new Mesh(geometry, wireframeMaterial);
plane.add(wireplane);
plane.castShadow = true;
plane.receiveShadow = true;
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

const floorGeometry = new PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);
const floorMaterial = new MeshStandardMaterial({ color: 0x354761 });
const floor = new Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / 2;
scene.add(floor);

const vertices = plane.geometry.attributes.position.array;

// place points at different heights
for (let i = 0; i < vertices.length; i += 3) {
  vertices[i + 2] = Math.random() * MAX_HEIGHT;
}

// take points along the perimeter
const getPerimeterPoints = (numVertices: number, width: number, height: number) => {
  const cols = width + 1;
  const rows = height + 1;
  const a = [];
  const b = [];

  for (let i = 0; i < numVertices; i += 3) {
    const numPoint = Math.floor(i / 3);  
    
    if (numPoint < cols) {
      a.push(i);
    } else {
      if (numPoint == (Math.floor(numPoint /cols ) + 1) * cols - 1) {
        a.push(i);
      } else if (numPoint % cols === 0 || Math.floor(numPoint / cols) === rows - 1) {
        b.push(i);
      }
    }    
  }

  return [...a, ...b.reverse()];
};

const perimeterPoints = getPerimeterPoints(vertices.length, WIDTH_SEGMENTS, HEIGHT_SEGMENTS);
const perimeterVertices = new Float32Array(perimeterPoints.flatMap(i => [vertices[i], vertices[i + 1], vertices[i + 2], vertices[i], vertices[i + 1], 0]));
const sideGeometry = new BufferGeometry();
const positionAttribute = new BufferAttribute(perimeterVertices, 3);
sideGeometry.setAttribute('position', positionAttribute);

// add triangle indices for side mesh
const indices = new Uint16Array([...Array.from({ length: 2 * perimeterPoints.length - 2 }, (_, o) => o % 2 === 0 ? [o, o + 2, o + 3, o, o + 3, o + 1] : [])
  .flat(), 2 * perimeterPoints.length - 2, 0, 2 * perimeterPoints.length - 1, 1, 2 * perimeterPoints.length - 1, 0]);

const indexAttribute = new BufferAttribute(indices, 1);
sideGeometry.setIndex(indexAttribute);
const sideMaterial = new MeshStandardMaterial({ color: 0x04f49e });
const sideMesh = new Mesh(sideGeometry, sideMaterial);
sideMesh.rotation.x = -Math.PI / 2;
sideMesh.castShadow = true;
sideMesh.receiveShadow = true;
scene.add(sideMesh);

const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(15, 15, 15);
directionalLight.castShadow = true;
scene.add(directionalLight);

directionalLight.shadowMapWidth = 512;
directionalLight.shadowMapHeight = 512;

const ambientLight = new AmbientLight(0xa7a7a7);
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

const resize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", resize);

// calculations
const calcAreaOfTriangle = (A: Vector3, B: Vector3, C: Vector3): number => {
  const AB = new Vector3();
  AB.subVectors(B, A);

  const AC = new Vector3();
  AC.subVectors(C, A);

  const N = new Vector3();
  N.crossVectors(AB, AC);

  return 0.5 * N.length();
}

const calcVolumeOfPrism = (A: Vector3, B: Vector3, C: Vector3): number => {
  const zeroA = new Vector3(A.x, A.y, 0);
  const zeroB = new Vector3(B.x, B.y, 0);
  const zeroC = new Vector3(C.x, C.y, 0);
  const area = calcAreaOfTriangle(zeroA, zeroB, zeroC);
  return (A.z + B.z + C.z) / 3 * area;
}

const planeIdxs = plane.geometry.index.array;
let areaOfSurface = 0;
let volume = 0;

for (let i = 0; i < planeIdxs.length; i+=3) {
  const A = new Vector3(vertices[planeIdxs[i] * 3], vertices[planeIdxs[i] * 3 + 1], vertices[planeIdxs[i] * 3 + 2]);
  const B = new Vector3(vertices[planeIdxs[i + 1] * 3], vertices[planeIdxs[i + 1] * 3 + 1], vertices[planeIdxs[i + 1] * 3 + 2]);
  const C = new Vector3(vertices[planeIdxs[i + 2] * 3], vertices[planeIdxs[i + 2] * 3 + 1], vertices[planeIdxs[i + 2] * 3 + 2]);
  
  areaOfSurface += calcAreaOfTriangle(A, B, C);
  volume += calcVolumeOfPrism(A, B, C);  
}

const sideIdxs = sideMesh.geometry.index.array;
let areaOfSide = 0;

for (let i = 0; i < sideIdxs.length; i+=3) {
  const A = new Vector3(vertices[sideIdxs[i] * 3], vertices[sideIdxs[i] * 3 + 1], vertices[sideIdxs[i] * 3 + 2]);
  const B = new Vector3(vertices[sideIdxs[i + 1] * 3], vertices[sideIdxs[i + 1] * 3 + 1], vertices[sideIdxs[i + 1] * 3 + 2]);
  const C = new Vector3(vertices[sideIdxs[i + 2] * 3], vertices[sideIdxs[i + 2] * 3 + 1], vertices[sideIdxs[i + 2] * 3 + 2]);
  
  areaOfSide += calcAreaOfTriangle(A, B, C);
}

const infoPanel = document.getElementById('infoPanel');
infoPanel.innerText = `Name: Mountain
  Volume: ${volume.toFixed(2)} m³
  Area (surface): ${areaOfSurface.toFixed(2)} m²
  Area (side): ${areaOfSide.toFixed(2)} m²
  Area (full): ${(areaOfSurface + areaOfSide).toFixed(2)} m²`;