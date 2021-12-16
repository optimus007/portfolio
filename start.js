import * as THREE from './build/three.module.js';
import { OrbitControls } from './examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './examples/jsm/loaders/GLTFLoader.js';
import { Reflector } from './examples/jsm/objects/Reflector.js';
import { assetManager } from './custom/AssetManager.js';
import Stats from './examples/jsm/libs/stats.module.js';
import { GuiManager } from './GuiManager.js';
import { TransformControls } from './examples/jsm/controls/TransformControls.js'
import { getTextMesh } from './custom/MeshHandler.js';
import * as  TWEEN from './examples/jsm/libs/tween.esm.js';


let guiManager = new GuiManager()
let gui = guiManager.gui
let transformControls

const assetList = assetManager.getAssetList()

let stats, scene, camera, controls, renderer, mixer, updateArray = [], delta, skeleton
const clock = new THREE.Clock()
const container = document.getElementById('content3d')

const params = {
    assetsPrint: () => { assetManager.printAssets() },
    progress: 0,
    renderData: ''
}



const addGui = () => {
    gui.add(params, 'renderData').listen().name('Resolution & pixel density')
    // gui.add(params, 'assetsPrint')
    // gui.add(params, 'progress', 0, 1).listen()

}

const init = () => {

    renderer = new THREE.WebGLRenderer({ antialias: true });
    // renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    // renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = THREE.VSMShadowMap;

    stats = new Stats();
    document.body.appendChild(stats.dom);

    document.body.appendChild(container);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0.1, 1)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 0.5
    controls.maxDistance = 5
    transformControls = new TransformControls(camera, renderer.domElement)

    transformControls.addEventListener('dragging-changed', (event) => {

        controls.enabled = !event.value;

    });

    scene.add(transformControls)
    animate();

    window.addEventListener('resize', onWindowResize);
    onWindowResize()
    afterInit()
}

const afterInit = () => {
    addGui()
    // fillScene()
    // addEnvironment()
    // addLights()
    // addModel()
    addText()
}


const addEnvironment = async () => {
    const texture = await assetManager.getHDRI(assetList.hdri)

    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.type = THREE.HalfFloatType
    scene.background = texture;
    scene.environment = texture;




}

const fillScene = async () => {
    const floorTextures = await assetManager.getTextureSet(assetList.Tiled_Floor_001, (v) => { console.log(v) })
    let geometry = new THREE.PlaneGeometry(10, 10);
    geometry.rotateX(- Math.PI / 2);
    let verticalMirror = new Reflector(geometry, {
        clipBias: 0.003,
        textureWidth: 500,
        textureHeight: 500,
        color: 0x889999
    });
    let material = new THREE.MeshPhysicalMaterial()
    material.map = floorTextures.diffuse
    material.aoMap = floorTextures.arm
    material.roughnessMap = floorTextures.arm
    material.roughness = 1
    material.metalnessMap = floorTextures.arm
    material.metalness = 1
    material.normalMap = floorTextures.normal
    // material.blending = THREE.AdditiveBlending
    // material.transparent = true
    material.opacity = 0.5
    const texturedFloor = new THREE.Mesh(geometry, material)
    texturedFloor.position.y = 0
    // scene.add(verticalMirror);
    scene.add(texturedFloor);
    // texturedFloor.castShadow = true
    texturedFloor.receiveShadow = true
    guiManager.mesh(texturedFloor, { positions: true })

}

const addModel = () => {

    const loader = new GLTFLoader(manager)
    loader.load('./asset3d/model.glb', function (gltf) {

        const model = gltf.scene
        scene.add(model);
        mixer = new THREE.AnimationMixer(model)

        updateArray.push(
            mixerUpdate
        )

        const animations = gltf.animations;


        let idleAction = mixer.clipAction(animations[0]);

        idleAction.play()
        skeleton = new THREE.SkeletonHelper(model);

        scene.add(skeleton);
        model.traverse((node) => {
            if (node.isMesh) {
                // console.log(node.material)
                node.castShadow = true
                node.receiveShadow = true
            }
        })



    });
}

const addLights = () => {
    const light = new THREE.SpotLight()
    light.position.set(0, 5, -1)
    light.target.position.set(0, 0, 0);

    const lightLper = new THREE.SpotLightHelper(light)
    const camH = new THREE.CameraHelper(light.shadow.camera)
    light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 10;
    light.shadow.bias = -0.01;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.radius = 4
    light.shadow.blurSamples = 8

    light.shadow.camera.right = 2;
    light.shadow.camera.left = - 2;
    light.shadow.camera.top = 2;
    light.shadow.camera.bottom = - 2;
    light.shadow.camera.updateProjectionMatrix()
    scene.add(light)
    scene.add(lightLper)
    scene.add(camH)
    transformControls.attach(light)

    gui.add(light.shadow, 'bias', -0.05, 0.05)
    gui.add(light.shadow, 'radius', 0, 15)
    gui.add(light.shadow, 'blurSamples', 1, 16, 1)
    gui.add(light.shadow.camera, 'near', 0, 16, 1)
    gui.add(light.shadow.camera, 'far', 1, 16, 1)

}

const mixerUpdate = () => {
    mixer.update(delta)
}

const animate = () => {
    requestAnimationFrame(animate);
    stats.update()

    delta = clock.getDelta()

    // if (mixer) {
    //     mixer.update(delta)
    // }

    for (const f of updateArray) {
        f()
    }
    // if (cubeCamera1) {
    //     cubeCamera1.update(renderer, scene);
    //     // material.envMap = cubeRenderTarget1.texture;

    // }
    TWEEN.update()
    renderer.render(scene, camera);
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    const fov = 50;
    const planeAspectRatio = 16 / 9;
    params.renderData = `${window.innerWidth}x${window.innerHeight}, ${window.devicePixelRatio}`

    camera.aspect = window.innerWidth / window.innerHeight;


    if (camera.aspect > planeAspectRatio) {
        // window too large
        camera.fov = fov;
    } else {
        // window too narrow
        const cameraHeight = Math.tan(THREE.MathUtils.degToRad(fov / 2));
        const ratio = camera.aspect / planeAspectRatio;
        const newCameraHeight = cameraHeight / ratio;
        camera.fov = THREE.MathUtils.radToDeg(Math.atan(newCameraHeight)) * 2;
    }
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);


}

async function addText() {
    const mesh = await getTextMesh('vishal')
    const mesh1 = await getTextMesh('prime')
    mesh1.rotateY(Math.PI)
    scene.add(mesh)
    scene.add(mesh1)
    const obj = { val: 0 }
    const tw = new TWEEN.Tween(obj)
    tw.to({ val: 1 }, 10000)
    tw.onUpdate(() => {
        mesh.material.color.setHSL(obj.val, 0.5, 0.5)
        mesh.position.y = obj.val - 0.5

        mesh1.material.color.setHSL(obj.val, 0.5, 0.5)
        mesh1.position.y = 1 - obj.val - 0.5

    })
    tw.yoyo(true)
    tw.repeat(Infinity)
    tw.start()
}

init()
