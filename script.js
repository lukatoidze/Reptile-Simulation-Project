import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
// import GUI from "lil-gui";

const modelUrls = {
  gecko: new URL("./public/assets/gecko.glb", import.meta.url).href,
  geckoNoLimbs: new URL("./public/assets/gecko-no-limbs.glb", import.meta.url)
    .href,
  snake: new URL("./public/assets/snake.glb", import.meta.url).href,
};

const displayNames = {
  gecko: "ხვლიკი",
  snake: "გველი",
};

const modelBaseTemps = {
  // gecko: 32,
  // snake: 28,
};

let currentModel;
let mixer, action;
let bodyTemperature = 25;
let targetBodyTemp = 20;
let hasLimbs = true;

/**
 * Debug & GUI Settings
 */
const debug = {
  isWalking: true,
  speedKmH: 4,
  selectedModel: "gecko",
  environmentTemp: 20,
};

let lastSpeed = debug.speedKmH; // Tracking last speed

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xfefefe);

renderer.shadowMap.enabled = true; // Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soften

/**
 * Scene
 */
const scene = new THREE.Scene();

/**
 * Cameras
 */
const cameraS = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
cameraS.position.set(0, 1, 3);
cameraS.lookAt(0, 0, 0);

const cameraT = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
cameraT.position.set(0, 2, 0);
cameraT.lookAt(0, 0, 0);

const cameraF = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
cameraF.position.set(1, 0.2, 0);
cameraF.lookAt(0, 0, 0);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(5, 10, 5);
sunLight.castShadow = true;

sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;

sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 50;
sunLight.shadow.camera.left = -10;
sunLight.shadow.camera.right = 10;
sunLight.shadow.camera.top = 10;
sunLight.shadow.camera.bottom = -10;

scene.add(sunLight);

// Ground plane to catch shadows
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.4 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

/**
 * Helpers
 */
scene.add(new THREE.GridHelper(12, 12));
// scene.add(new THREE.CameraHelper(sunLight.shadow.camera));
// scene.add(new THREE.AxesHelper(4));

/**
 * Model Loading
 */
const assetLoader = new GLTFLoader();

function loadModel(modelName) {
  let url = modelUrls[modelName];
  if (modelName === "gecko" && !hasLimbs) {
    url = modelUrls["geckoNoLimbs"];
  }

  assetLoader.load(
    url,
    (gltf) => {
      if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse((child) => {
          if (child.isMesh) child.geometry.dispose();
        });
      }
      currentModel = gltf.scene;
      scene.add(currentModel);

      currentModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      mixer = new THREE.AnimationMixer(currentModel);

      let clip = THREE.AnimationClip.findByName(gltf.animations, "WALK");
      if (!clip && gltf.animations.length > 0) {
        console.warn(`No "WALK" animation found. Using: "${clip.name}"`);
      }

      if (clip) {
        action = mixer.clipAction(clip);
        if (debug.isWalking) action.play();
        action.setEffectiveTimeScale(debug.speedKmH / 4);
      } else {
        action = null;
        console.warn("No animation clips available for this model.");
      }

      bodyTemperature = modelBaseTemps[modelName] || 25;
      targetBodyTemp = debug.environmentTemp;

      if (modelName === "gecko" && !hasLimbs) {
        debug.isWalking = false;
        debug.speedKmH = 0;
        if (action) action.stop();
        speedDisplay.innerText = `სიჩქარე: 0.0 კმ/სთ`;
        speedSlider.disabled = true;
        walkToggleCheckbox.checked = false;
        walkToggleCheckbox.disabled = true;
      } else {
        speedSlider.disabled = false;
        walkToggleCheckbox.disabled = false;
      }
    },
    undefined,
    (error) => console.error("Error loading model:", error)
  );
}

/**
 * Student-friendly UI
 */
const kidUI = document.createElement("div");
// kidUI.style.boxSizing = "border-box";
kidUI.style.position = "absolute";
kidUI.style.top = "20px";
kidUI.style.left = "20px";
kidUI.style.width = "350px";
kidUI.style.padding = "10px 20px";
kidUI.style.background = "rgb(10, 10, 10, 0.8)";
kidUI.style.borderRadius = "8px";
kidUI.style.fontFamily = "'Comic Sans MS', cursive, sans-serif";
kidUI.style.color = "#fff";
kidUI.style.userSelect = "none";
kidUI.style.zIndex = "1000";
document.body.appendChild(kidUI);

// Logo
const logo = document.createElement("img");
logo.src = new URL("./public/assets/GSI_Logo.png", import.meta.url).href;
logo.style.width = "30%";
logo.style.display = "block";
logo.style.margin = "0 auto";
// logo.style.marginBottom = "0px";
kidUI.appendChild(logo);

// Title
const title = document.createElement("h2");
title.innerText = "საკონტროლო პანელი";
title.style.textAlign = "center";
title.style.marginBottom = "15px";
title.style.marginTop = "5px";
kidUI.appendChild(title);

// Model selector
const modelLabel = document.createElement("label");
modelLabel.innerText = "აირჩიეთ ქვეწარმავალი:";
modelLabel.style.display = "block";
modelLabel.style.marginBottom = "8px";
modelLabel.style.fontWeight = "bold";
kidUI.appendChild(modelLabel);

const modelSelect = document.createElement("select");
modelSelect.style.width = "100%";
modelSelect.style.fontSize = "18px";
modelSelect.style.padding = "6px 8px";
modelSelect.style.borderRadius = "8px";
modelSelect.style.marginBottom = "20px";

Object.keys(modelUrls).forEach((model) => {
  if (model === "geckoNoLimbs") return; // Not including limbless gecko in the dropdown

  const option = document.createElement("option");
  option.value = model;
  option.textContent = displayNames[model] || model; // fallback to model if no mapping
  if (model === debug.selectedModel) option.selected = true;
  modelSelect.appendChild(option);
});
kidUI.appendChild(modelSelect);

modelSelect.addEventListener("change", (e) => {
  debug.selectedModel = e.target.value;

  limbsContainer.style.display =
    debug.selectedModel === "gecko" ? "block" : "none";

  if (debug.selectedModel !== "gecko") {
    hasLimbs = true;
    limbsCheckbox.checked = true;
  }

  loadModel(debug.selectedModel);
});

const limbsContainer = document.createElement("div");
limbsContainer.style.marginBottom = "20px";
limbsContainer.style.display = "none";
kidUI.appendChild(limbsContainer);

const limbsLabel = document.createElement("label");
limbsLabel.style.display = "flex";
limbsLabel.style.alignItems = "center";
limbsLabel.style.justifyContent = "space-between";
limbsLabel.style.fontWeight = "bold";
limbsLabel.style.fontSize = "16px";
limbsLabel.innerText = "🦎 აქვს კიდურები?";

const limbsCheckbox = document.createElement("input");
limbsCheckbox.type = "checkbox";
limbsCheckbox.checked = true;
limbsCheckbox.style.transform = "scale(1.5)";
limbsCheckbox.style.marginLeft = "10px";

limbsLabel.appendChild(limbsCheckbox);
limbsContainer.appendChild(limbsLabel);

limbsCheckbox.addEventListener("change", (e) => {
  hasLimbs = e.target.checked;
  loadModel("gecko");
});

hasLimbs = true;
limbsCheckbox.checked = true;
limbsContainer.style.display =
  debug.selectedModel === "gecko" ? "block" : "none";
loadModel(debug.selectedModel);

const walkLabel = document.createElement("label");
walkLabel.style.display = "flex";
walkLabel.style.alignItems = "center";
walkLabel.style.justifyContent = "space-between";
walkLabel.style.marginBottom = "20px";
walkLabel.style.fontWeight = "bold";
walkLabel.style.fontSize = "16px";

const walkToggleCheckbox = document.createElement("input");
walkToggleCheckbox.type = "checkbox";
walkToggleCheckbox.id = "walkToggle";
walkToggleCheckbox.checked = debug.isWalking;
walkToggleCheckbox.style.transform = "scale(1.5)";
walkToggleCheckbox.style.marginLeft = "10px";

walkLabel.textContent = "🚶 მოძრაობის გააქტიურება";
walkLabel.appendChild(walkToggleCheckbox);
kidUI.appendChild(walkLabel);

walkToggleCheckbox.addEventListener("change", (e) => {
  debug.isWalking = e.target.checked;

  if (debug.isWalking) {
    // Use lastSpeed if speed is 0 to avoid animation stuck
    if (debug.speedKmH === 0) {
      debug.speedKmH = lastSpeed > 0 ? lastSpeed : 4;
      speedSlider.value = debug.speedKmH;
      speedValueSpan.innerText = debug.speedKmH.toFixed(1);
    }

    lastSpeed = debug.speedKmH;

    speedDisplay.innerText = `სიჩქარე: ${debug.speedKmH.toFixed(1)} კმ/სთ`;

    if (action) {
      action.setEffectiveTimeScale(debug.speedKmH / 4);
      action.play();
    }
  } else {
    lastSpeed = debug.speedKmH;
    debug.speedKmH = 0;
    speedDisplay.innerText = `სიჩქარე: 0.0 კმ/სთ`;
    if (action) action.stop();
  }
});

// Speed Control: label & slider
const speedLabel = document.createElement("label");
speedLabel.style.display = "block";
speedLabel.style.marginBottom = "8px";
speedLabel.style.fontWeight = "bold";
speedLabel.style.fontSize = "16px";

const speedText = document.createTextNode("⚡ სიჩქარე: ");
speedLabel.appendChild(speedText);

const speedValueSpan = document.createElement("span");
speedValueSpan.innerText = debug.speedKmH.toFixed(1);
speedLabel.appendChild(speedValueSpan);

const speedValueSign = document.createTextNode(" კმ/სთ");
speedLabel.appendChild(speedValueSign);

kidUI.appendChild(speedLabel);

const speedSlider = document.createElement("input");
speedSlider.type = "range";
speedSlider.min = 0;
speedSlider.max = 12;
speedSlider.step = 0.1;
speedSlider.value = debug.speedKmH;
speedSlider.style.width = "100%";
speedSlider.style.marginBottom = "20px";
kidUI.appendChild(speedSlider);

speedSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  debug.speedKmH = val;

  // Update numeric display next to slider label
  speedValueSpan.innerText = val.toFixed(1);

  if (debug.isWalking) {
    if (action) action.setEffectiveTimeScale(val / 4);
    speedDisplay.innerText = `სიჩქარე: ${val.toFixed(1)} კმ/სთ`;
    lastSpeed = val > 0 ? val : lastSpeed;
  } else {
    speedDisplay.innerText = `სიჩქარე: 0.0 კმ/სთ`;
  }
});

// Environment Temperature Control: label & slider
const envTempLabel = document.createElement("label");
envTempLabel.style.display = "block";
envTempLabel.style.marginBottom = "8px";
envTempLabel.style.fontWeight = "bold";

const envTempText = document.createTextNode("🌡️ გარემოს ტემპერატურა: ");
envTempLabel.appendChild(envTempText);

const envTempValueSpan = document.createElement("span");
envTempValueSpan.innerText = debug.environmentTemp;
envTempLabel.appendChild(envTempValueSpan);

const envTempSign = document.createTextNode("°C");
envTempLabel.appendChild(envTempSign);

kidUI.appendChild(envTempLabel);

const envTempSlider = document.createElement("input");
envTempSlider.type = "range";
envTempSlider.min = 0;
envTempSlider.max = 45;
envTempSlider.step = 1;
envTempSlider.value = debug.environmentTemp;
envTempSlider.style.width = "100%";
envTempSlider.style.marginBottom = "20px";
kidUI.appendChild(envTempSlider);

envTempSlider.addEventListener("input", (e) => {
  const val = parseInt(e.target.value);
  debug.environmentTemp = val;
  targetBodyTemp = val;

  envTempValueSpan.innerText = val;

  envTempDisplay.innerText = `გარემოს ტემპერატურა: ${val}.0°C`;
});

/**
 * Information Displays
 */
// Speed display
const speedDisplay = document.createElement("div");
Object.assign(speedDisplay.style, {
  padding: "10px 15px",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  color: "rgb(10, 10, 10)",
  fontSize: "16px",
  fontFamily: "Arial, sans-serif",
  borderRadius: "2px",
  zIndex: 100,
});
speedDisplay.innerText = `სიჩქარე: ${debug.speedKmH} კმ/სთ`;
kidUI.appendChild(speedDisplay);

// Environment temperature display
const envTempDisplay = document.createElement("div");
envTempDisplay.id = "env-temperature-display";
Object.assign(envTempDisplay.style, {
  padding: "10px 15px",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  color: "rgb(10, 10, 10)",
  fontSize: "16px",
  fontFamily: "Arial, sans-serif",
  borderRadius: "2px",
  zIndex: 100,
  marginTop: "15px",
});
envTempDisplay.innerText = `გარემოს ტემპერატურა: ${debug.environmentTemp}.0°C`;
kidUI.appendChild(envTempDisplay);

// Reptile temperature display
const reptileTempDisplay = document.createElement("div");
reptileTempDisplay.id = "lizard-temperature-display";
Object.assign(reptileTempDisplay.style, {
  padding: "10px 15px",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  color: "rgb(10, 10, 10)",
  fontSize: "16px",
  fontFamily: "Arial, sans-serif",
  borderRadius: "2px",
  zIndex: 100,
  marginTop: "15px",
  marginBottom: "15px",
});
reptileTempDisplay.innerText = `სხეულის ტემპერატურა: ${bodyTemperature.toFixed(
  1
)}°C`;
kidUI.appendChild(reptileTempDisplay);

/**
 * Animate & Handle multiple viewports
 */
const clock = new THREE.Clock();

function animate() {
  let delta = clock.getDelta();
  const MAX_DELTA = 0.1;
  const deltaClamped = Math.min(delta, MAX_DELTA);

  if (mixer) mixer.update(deltaClamped);

  // Clamped delta for gradual temp change
  const changeRate = 1 / 5;
  bodyTemperature +=
    (targetBodyTemp - bodyTemperature) * changeRate * deltaClamped;

  reptileTempDisplay.innerText = `სხეულის ტემპერატურა: ${bodyTemperature.toFixed(
    1
  )}°C`;

  document.body.style.overflowX = "hidden";

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isMobile = width < 1024;

  renderer.setScissorTest(true);
  renderer.clear();

  if (isMobile) {
    const viewHeight = height / 3;

    renderer.setViewport(0, height - viewHeight, width, viewHeight);
    renderer.setScissor(0, height - viewHeight, width, viewHeight);
    cameraS.aspect = width / viewHeight;
    cameraS.updateProjectionMatrix();
    renderer.render(scene, cameraS);

    renderer.setViewport(0, height - viewHeight * 2, width, viewHeight);
    renderer.setScissor(0, height - viewHeight * 2, width, viewHeight);
    cameraT.aspect = width / viewHeight;
    cameraT.updateProjectionMatrix();
    renderer.render(scene, cameraT);

    renderer.setViewport(0, 0, width, viewHeight);
    renderer.setScissor(0, 0, width, viewHeight);
    cameraF.aspect = width / viewHeight;
    cameraF.updateProjectionMatrix();
    renderer.render(scene, cameraF);
  } else {
    const mainWidth = (width * 2) / 3;
    const sideWidth = width / 3;
    const halfHeight = height / 2;

    renderer.setViewport(0, 0, mainWidth, height);
    renderer.setScissor(0, 0, mainWidth, height);
    cameraS.aspect = mainWidth / height;
    cameraS.updateProjectionMatrix();
    renderer.render(scene, cameraS);

    renderer.setViewport(mainWidth, halfHeight, sideWidth, halfHeight);
    renderer.setScissor(mainWidth, halfHeight, sideWidth, halfHeight);
    cameraT.aspect = 1;
    cameraT.updateProjectionMatrix();
    renderer.render(scene, cameraT);

    renderer.setViewport(mainWidth, 0, sideWidth, halfHeight);
    renderer.setScissor(mainWidth, 0, sideWidth, halfHeight);
    cameraF.aspect = 1;
    cameraF.updateProjectionMatrix();
    renderer.render(scene, cameraF);
  }

  renderer.setScissorTest(false);
}

function applyMobilePadding() {
  const isMobile = window.innerWidth < 650;

  if (isMobile) {
    const panelHeight = kidUI.getBoundingClientRect().height;

    document.body.style.paddingTop = `${panelHeight}px`;
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = `${panelHeight}px`;
    renderer.domElement.style.left = "0";

    kidUI.style.width = "100vw";
    kidUI.style.left = "0";
    kidUI.style.right = "0";
    kidUI.style.top = "0";
    kidUI.style.borderRadius = "0";
    kidUI.style.padding = "20px 30px 10px 15px";
    kidUI.style.boxSizing = "border-box";

    title.style.textAlign = "center";
    logo.style.margin = "0 auto 10px auto";
  } else {
    document.body.style.paddingTop = "0px";
    renderer.domElement.style.position = "static";

    kidUI.style.width = "350px";
    kidUI.style.left = "20px";
    kidUI.style.top = "20px";
    kidUI.style.borderRadius = "8px";
    kidUI.style.padding = "10px 20px";
    kidUI.style.boxSizing = "border-box";
  }
}

applyMobilePadding();

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyMobilePadding();
});

renderer.setAnimationLoop(animate);
