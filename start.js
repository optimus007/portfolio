import * as THREE from './build/three.module.js';
import { OrbitControls } from './examples/jsm/controls/OrbitControls.js';
import { Reflector } from './examples/jsm/objects/Reflector.js';
import { assetManager, cameraNoise, NoiseGenerator } from './custom/AssetManager.js';
import Stats from './examples/jsm/libs/stats.module.js';
import { guiManager } from './custom/GuiManager.js';
import { TransformControls } from './examples/jsm/controls/TransformControls.js'
import { getTextMesh } from './custom/MeshHandler.js';
import * as  TWEEN from './examples/jsm/libs/tween.esm.js';
import { webXRController } from './custom/xr.js';
import { USDZExporter } from './examples/jsm/exporters/USDZExporter.js';
import { materialHandler } from './custom/MaterialHandler.js';


let gui = guiManager.gui
const rendererSize = new THREE.Vector2(0, 0)
let xr
let transformControls
let camNoise
const assetList = assetManager.getAssetList()

let stats, scene, camera, controls, renderer, mixer, updateArray = [], delta, skeleton
let sceneGroup
const clock = new THREE.Clock()
const container = document.getElementById('content3d')
const renderResolution = new THREE.Vector2()

const params = {
    noiseIntensity: 0.5,
    assetsPrint: () => { assetManager.printAssets() },
    pixelDensity: window.devicePixelRatio,


}

const tweens = {
    intro: null,
    introVal: 0,

    hdri: {
        delay: 1000,
        tw: null,
        duration: 5000,
        val: 0,
        easing: TWEEN.Easing.Quadratic.Out,

        hexA: '#000000',
        hexB: '#808080',

        intA: 0,
        intB: 1,
    }
}


const colA = new THREE.Color()
const colB = new THREE.Color()
const colC = new THREE.Color()


const colorLerp = (hexA, hexB, lerpValue) => {
    return colC.lerpColors(colA.set(hexA), colB.set(hexB), lerpValue)
}

const initTweens = () => {
    const hdriDat = tweens.hdri
    hdriDat.tw = new TWEEN.Tween(hdriDat).to({ val: 1 }, hdriDat.duration)
    hdriDat.tw.delay(hdriDat.delay)
    hdriDat.tw.easing(hdriDat.easing)
    hdriDat.tw.onUpdate(() => {
        scene.background.copy(colorLerp(hdriDat.hexA, hdriDat.hexB, hdriDat.val))

        const int = THREE.MathUtils.lerp(hdriDat.intA, hdriDat.intB, hdriDat.val)
        scene.traverseVisible((node) => {
            if (node.material && node.material.isMeshStandardMaterial) {
                node.material.envMapIntensity = int
            }
        })
    })
}

const addGui = () => {

    gui.add(params, 'pixelDensity', 0.2, window.devicePixelRatio).listen().name('Pixel density').onChange((v) => {
        renderer.setPixelRatio(v)
        renderer.getSize(renderResolution)

    })

    gui.add(params, 'noiseIntensity', 0, 2).name('Noise intensity').onChange((v) => {
        camNoise.intensity = v
    })

}

const init = () => {

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    // renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = THREE.VSMShadowMap;
    assetManager.setupPmrem(renderer)
    stats = new Stats();
    document.body.appendChild(stats.dom);

    document.body.appendChild(container);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    sceneGroup = new THREE.Group()
    scene.add(sceneGroup)
    scene.background = new THREE.Color(0, 0, 0)
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 5.5)
    if (camera.aspect < 1) {
        camera.position.z += 1
    }

    controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 2, 0)
    controls.update()
    controls.minDistance = 0.5
    controls.maxDistance = 10
    transformControls = new TransformControls(camera, renderer.domElement)

    transformControls.addEventListener('dragging-changed', (event) => {

        controls.enabled = !event.value;

    });

    scene.add(transformControls)

    animate();

    // window.addEventListener('resize', updateSize);
    updateSize(true)
    initTweens()
    afterInit()



}

const afterInit = () => {
    xr = new webXRController(renderer, render, sceneGroup)
    addGui()
    // fillScene()
    addEnvironment()
    // addLights()
    addModel()
    addText()
    addGrid()
    addAR()

    camNoise = new cameraNoise(camera)
    camNoise.start()
    controls.addEventListener('start', () => {

        camNoise.stop()
    })

    controls.addEventListener('end', () => {
        controls.update()

        camNoise.start()

    })


}


const addEnvironment = async () => {
    const texture = await assetManager.getHDRI(assetList.hdri)
    console.log('hdri', { texture })
    // scene.background = texture;
    scene.environment = texture;

    tweens.hdri.tw.start()

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

const addModel = async () => {
    const sphereGeo = new THREE.SphereBufferGeometry(0.5)

    const materialPlastic = new THREE.MeshStandardMaterial({ roughness: 0, envMapIntensity: 0, name: 'spherePlastic' })
    const materialMetal = new THREE.MeshStandardMaterial({ roughness: 0, metalness: 1, envMapIntensity: 0, name: 'sphereMetal' })

    const mesh1 = new THREE.Mesh(sphereGeo, materialPlastic)
    const mesh2 = new THREE.Mesh(sphereGeo, materialMetal)
    mesh1.position.set(-1.5, 0.5, 0)
    mesh2.position.set(1.5, 0.5, 0)
    sceneGroup.add(mesh1)
    sceneGroup.add(mesh2)


    const gltf = await assetManager.loadGLTF(assetList.model)
    const model = gltf.scene


    console.log({ gltf })

    if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model)

        updateArray.push(
            mixerUpdate
        )

        const animations = gltf.animations;


        let idleAction = mixer.clipAction(animations[0]);

        idleAction.play()
        // skeleton = new THREE.SkeletonHelper(model);

        // scene.add(skeleton);

        xr.connectMixer(clock, mixer)
    }
    model.traverse((node) => {
        if (node.isMesh) {
            // console.log(node.material)
            // node.castShadow = true
            // node.receiveShadow = true

        }
    })

    materialHandler.refresh(model)

    for (const mat of Object.values(materialHandler.ALL_MATERIALS)) {
        mat.envMapIntensity = 0
    }

    sceneGroup.add(model);

    
    const gltfChair = await assetManager.loadGLTF(assetList.chair)
    const chairModel=gltfChair.scene
    sceneGroup.add(chairModel);
    chairModel.scale.setScalar(0.01)
    console.log({chairModel})
}

const addAR = () => {



    // ANDROID
    const isAndroid = /android/i.test(navigator.userAgent);

    let aTag = document.createElement("a");
    const isIOS = aTag.relList.supports("ar") ? true : false

    if (isAndroid) {
        const url = "https://github.com/optimus007/portfolio/blob/main/asset3d/model.glb?raw=true"
        const mode = '3d_preferred'
        const link = 'www.google.com'
        const title = 'vishal_prime'
        const vertical = false

        aTag.href = `intent://arvr.google.com/scene-viewer/1.1?file=${url}&mode=${mode}&link=${link}&title=${title}&enable_vertical_placement=${vertical}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=https://www.google.com/ar;end;`
    }

    const arActions = {
        sceneViewer: () => {
            // Check whether this is an Android device.
            const isAndroid = /android/i.test(navigator.userAgent);

            if (isAndroid) {
                window.open(aTag)
            } else {
                alert('Sorry, Google AR only available on android devices with arcore')

            }

        },
        usdzViewer: async () => {
            if (isIOS) {
                // AR is available.
                const exporter = new USDZExporter();
                const arraybuffer = await exporter.parse(sceneGroup);
                const blob = new Blob([arraybuffer], { type: 'application/octet-stream' });
                aTag.rel = "ar"
                aTag.href = URL.createObjectURL(blob);
                aTag.download = "robot.usdz";
                aTag.click()
                // window.open(aTag)
            } else {
                alert('Sorry, Apple AR only available on iOS devices with arKit')

            }
        }


    }

    guiManager.arFolder.add(arActions, 'sceneViewer').name("Google AR")


    guiManager.arFolder.add(arActions, 'usdzViewer').name("Apple AR")



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
    renderer.setAnimationLoop(render)
}

const render = () => {
    updateSize()
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
    // controls.update()
    renderer.render(scene, camera);
}

function updateSize(force = false) {
    renderer.getSize(rendererSize)

    if (!force) {
        if (rendererSize.x === window.innerWidth && rendererSize.y === window.innerHeight) { return }

    }

    camera.aspect = window.innerWidth / window.innerHeight;
    // const fov = 80;
    // const planeAspectRatio = 16 / 9;

    // if (camera.aspect > planeAspectRatio) {
    //     // window too large
    //     camera.fov = fov;
    // } else {
    //     // window too narrow
    //     const cameraHeight = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    //     const ratio = camera.aspect / planeAspectRatio;
    //     const newCameraHeight = cameraHeight / ratio;
    //     camera.fov = THREE.MathUtils.radToDeg(Math.atan(newCameraHeight)) * 2;
    // }
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);


}

async function addText() {
    const mesh = await getTextMesh('OPTIMUS', '#000000', 0.5)
    const mesh1 = await getTextMesh('PRIME', '#000000', 0.5)
    mesh1.rotateY(Math.PI)
    mesh.translateZ(1)
    mesh1.translateZ(1)
    sceneGroup.add(mesh)
    sceneGroup.add(mesh1)
    const obj = { val: 0 }
    const tw = new TWEEN.Tween(obj)
    tw.to({ val: 1 }, 10000)
    tw.onUpdate(() => {
        mesh.material.color.setHSL(obj.val, 1, 0.5)
        mesh1.material.color.setHSL(obj.val, 1, 0.5)
    })
    tw.yoyo(true)
    tw.repeat(Infinity)
    tw.start()
}

function addGrid(params) {
    const grid = new THREE.GridHelper(4, 4)
    scene.add(grid)
}



init()
