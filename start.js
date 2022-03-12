import * as THREE from 'three';
import { OrbitControls } from 'three-addons/controls/OrbitControls.js';
import { Reflector } from 'three-addons/objects/Reflector.js';
import { assetManager, cameraNoise, NoiseGenerator } from './custom/AssetManager.js';
import { guiManager } from './custom/GuiManager.js';
import { TransformControls } from 'three-addons/controls/TransformControls.js'
import { getTextMesh } from './custom/MeshHandler.js';
import * as  TWEEN from 'three-addons/libs/tween.esm.js';
import { webXRController } from './custom/xr.js';
import { USDZExporter } from 'three-addons/exporters/USDZExporter.js';
import { materialHandler } from './custom/MaterialHandler.js';
import { CurveManager } from './custom/CurveManager.js';
import { Recorder } from './custom/Recorder.js';
import { DeviceOrientationControls } from 'three-addons/deprecated/DeviceOrientationControls.js';


let url_string = window.location.href
let url = new URL(url_string);
const urlParams = {
    model: url.searchParams.get("model"),
    scene: url.searchParams.get("scene")
}

const fpsDiv = document.createElement('div')
fpsDiv.style.position = 'absolute'
fpsDiv.style.top = "1%"
fpsDiv.style.left = "1%"
// fpsDiv.style.width = "50px"
// fpsDiv.style.height = "50px"
fpsDiv.style.backgroundColor = "#000000"
document.body.appendChild(fpsDiv)


let gui = guiManager.gui
const rendererSize = new THREE.Vector2(0, 0)
let xr
let recorder
let transformControls
let camNoise
const assetList = assetManager.getAssetList()
let currentTime = 0, PreviousTime = 0, frameCounter = 0

let scene, camera, controls, gyroControls, gyroTextDiv, gyroPivot, renderer, currentMixer, updateArray = [], delta, skeleton
let sceneGroup
const clock = new THREE.Clock()
const container = document.getElementById('content3d')
const buttonDiv = document.getElementById('buttons')
const renderResolution = new THREE.Vector2()

const loadedModels = []
const buttonArray = []

const params = {
    noiseIntensity: 0.5,
    assetsPrint: () => { assetManager.printAssets() },
    pixelRatio: window.devicePixelRatio,
    fps: 0,

}


let masterHdriIntensity = 0
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
    },

    model: {
        tw: null,
        val: 0,
        duration: 1000,
        easing: TWEEN.Easing.Quadratic.Out,

        toVisible: null,
        toHidden: null,
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
    hdriDat.tw.onStart(() => { if (!scene.background) { scene.background = scene.backgroundColor } })
    hdriDat.tw.onUpdate(() => {

        scene.background.copy(colorLerp(hdriDat.hexA, hdriDat.hexB, hdriDat.val))

        const int = THREE.MathUtils.lerp(hdriDat.intA, hdriDat.intB, hdriDat.val)
        scene.traverseVisible((node) => {
            if (node.material && node.material.isMeshStandardMaterial) {
                node.material.envMapIntensity = int
            }
        })

        masterHdriIntensity = int
    })

    const modelDat = tweens.model
    modelDat.tw = new TWEEN.Tween(modelDat).to({ val: 1 }, modelDat.duration).easing(modelDat.easing)
    modelDat.tw.onStart(() => {
        if (modelDat.toVisible) {
            currentMixer = null
            modelDat.toVisible.active = true
            sceneGroup.add(modelDat.toVisible.root)

            materialHandler.refresh(sceneGroup)

            if (xr) {
                if (modelDat.toVisible.mixer) {
                    xr.connectMixer(modelDat.toVisible.mixer)
                } else {
                    xr.connectMixer(null)
                }
            }
        }
        if (modelDat.toHidden) {
            modelDat.toHidden.active = false
        }
    })
    modelDat.tw.onUpdate(() => {
        const toVisibleScale = THREE.MathUtils.mapLinear(modelDat.val, 0, 1, 0, 1)
        const toHiddenScale = THREE.MathUtils.mapLinear(modelDat.val, 0, 1, 1, 0)
        const toVisiblRotation = THREE.MathUtils.mapLinear(modelDat.val, 0, 1, Math.PI * 4, 0)
        const toHiddenRotation = THREE.MathUtils.mapLinear(modelDat.val, 0, 1, 0, Math.PI * 4)

        if (modelDat.toVisible) {
            modelDat.toVisible.root.scale.setScalar(toVisibleScale)
            modelDat.toVisible.root.rotation.y = toVisiblRotation
        }
        if (modelDat.toHidden) {
            modelDat.toHidden.root.scale.setScalar(toHiddenScale)
            modelDat.toHidden.root.rotation.y = toHiddenRotation
        }

    })
    modelDat.tw.onComplete(() => {
        if (modelDat.toVisible.mixer) {

            if (modelDat.toVisible.mixer) {
                currentMixer = modelDat.toVisible.mixer
                modelDat.toVisible.actions[0].play()
            }
        }

        if (modelDat.toHidden) {

            modelDat.toHidden.root.removeFromParent()
            modelDat.toHidden.root.scale.setScalar(1)

        }
    })


}

const addGui = () => {
    gui.add(params, 'fps', 0, 120).name('Fps').listen()

    gui.add(params, 'pixelRatio', 0.2, window.devicePixelRatio).listen().name('Pixel density').onChange((v) => {
        renderer.setPixelRatio(v)
        renderer.getSize(renderResolution)

    })


    gui.add(params, 'noiseIntensity', 0, 2).name('Noise intensity').onChange((v) => {
        camNoise.intensity = v
    })

}

const init = () => {

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    // renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = THREE.VSMShadowMap;
    assetManager.setupPmrem(renderer)


    document.body.appendChild(container);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    sceneGroup = new THREE.Group()
    scene.add(sceneGroup)
    scene.background = new THREE.Color(0, 0, 0)
    scene.backgroundColor = scene.background
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

    if (urlParams.scene === 'gyro') {
        console.warn('GOING TO GYRO SCENE')
        gyroScene()
        return
    }
    modelScene()



}

const modelScene = () => {
    xr = new webXRController(renderer, render, sceneGroup, clock)
    recorder = new Recorder(renderer, scene, camera)
    // let curveManager = new CurveManager(scene, camera, controls)
    addGui()
    // fillScene()
    addEnvironment()
    // addLights()
    // addModel()
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


    createButton(assetList.Robot)
    createButton(assetList.Mug)
    createButton(assetList.BubiVT)

    if (urlParams.model) {
        if (Object.values(assetList).includes(urlParams.model)) {
            console.log('FOUND FROM URL', urlParams.model)
            setActiveModel(urlParams.model)
        }
    } else {
        buttonArray[0].click()
    }

    const sphereGeo = new THREE.SphereBufferGeometry(0.5)

    const materialPlastic = new THREE.MeshStandardMaterial({ roughness: 0, envMapIntensity: 0, name: 'spherePlastic' })
    const materialMetal = new THREE.MeshStandardMaterial({ roughness: 0, metalness: 1, envMapIntensity: 0, name: 'sphereMetal' })

    const mesh1 = new THREE.Mesh(sphereGeo, materialPlastic)
    const mesh2 = new THREE.Mesh(sphereGeo, materialMetal)
    mesh1.position.set(-1.5, 0.5, 0)
    mesh2.position.set(1.5, 0.5, 0)
    sceneGroup.add(mesh1)
    sceneGroup.add(mesh2)

}

const gyroScene = () => {
    addEnvironment()
    addGrid()
    setActiveModel(assetList.Gyro_model)

    controls.target.set(0, 0, 0)
    controls.enableZoom = false
    controls.enablePan = false
    camera.position.set(0, 0, 2)
    controls.update()



    const pivot = new THREE.Group()
    scene.add(pivot)
    pivot.add(camera)
    gyroPivot = pivot
    const button = document.createElement('button')
    button.innerHTML = 'GYRO'
    button.style.position = 'fixed'
    button.style.zIndex = 10
    button.style.left = '50%'
    button.style.top = '50%'
    document.body.appendChild(button)
    button.onclick = () => {
        controls.enabled = false
        controls.target.set(0, 0, 0)
        camera.position.set(0, 0, 2)
        controls.update()
        console.log('gyro')
        gyroControls = new DeviceOrientationControls(pivot)
        document.body.removeChild(button)

        const div = document.createElement('div')
        div.style.position = 'fixed'
        div.style.zIndex = 10
        div.style.left = '1%'
        div.style.top = '50%'

        gyroTextDiv = div
        document.body.appendChild(div)
    }




}

const createButton = (assetName) => {
    const button = document.createElement('button')
    button.classList.add('button')
    for (const [name, value] of Object.entries(assetList)) {
        if (value === assetName) {
            button.innerText = name
            break
        }
    }
    button.id = assetName


    buttonDiv.appendChild(button)

    button.onclick = (ev) => {
        setActiveModel(button.id)
    }
    buttonArray.push(button)
}


const addEnvironment = async () => {
    const texture = await assetManager.getHDRI(assetList.hdri)

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



const loadModel = async (assetName) => {
    if (loadedModels[assetName]) {
        return
    }
    console.log(assetName)
    const gltf = await assetManager.loadGLTF(assetName)
    const model = gltf.scene
    loadedModels[assetName] = { name: assetName, root: model, active: false }

    model.traverse((node) => {
        if (node.material && node.material.envMapIntensity) {
            node.material.envMapIntensity = masterHdriIntensity
        }
    })

    if (gltf.animations.length) {
        loadedModels[assetName].mixer = new THREE.AnimationMixer(model)
        loadedModels[assetName].actions = []
        const animations = gltf.animations;
        const mixer = loadedModels[assetName].mixer
        for (const clip of animations) {
            loadedModels[assetName].actions.push(mixer.clipAction(clip))
        }

    }


}

const setActiveModel = async (nameActive) => {
    if (tweens.model.tw._isPlaying) {
        return
    }
    await loadModel(nameActive)

    for (const [name, data] of Object.entries(loadedModels)) {
        if (name === nameActive) {
            if (data.active) {
                console.log(name, data)
                return
            } else {

                tweens.model.toVisible = data
                const paramsU = new URLSearchParams(location.search);
                paramsU.set('model', data.name);
                window.history.replaceState({}, '', `${location.pathname}?${paramsU}`);
                document.title = data.name
            }
        } else {
            if (data.active) {

                tweens.model.toHidden = data

            }
        }

    }


    tweens.model.tw.start()


}

const addAR = () => {



    // ANDROID
    let aTag = document.createElement("a");
    const isIOS = aTag.relList.supports("ar") ? true : false

    const androidData = {
        url: '',
        assetName: 'model',
        mode: '3d_preferred',
        link: 'www.google.com',
        title: 'vishal_prime',
        vertical: false,
    }

    const arActions = {
        sceneViewer: () => {
            // Check whether this is an Android device.
            const isAndroid = /android/i.test(navigator.userAgent);

            if (isAndroid) {

                for (const val of Object.values(loadedModels)) {
                    console.log(val)
                    if (val.active) {
                        androidData.assetName = val.name
                        androidData.url = assetManager.getGithubUrl(androidData.assetName)
                    }
                }
                if (!androidData.assetName) {
                    alert('No Active Model')
                    return
                }

                aTag.href = `intent://arvr.google.com/scene-viewer/1.1?file=${androidData.url}&mode=${androidData.mode}&link=${androidData.link}&title=${androidData.title}&enable_vertical_placement=${androidData.vertical}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=https://www.google.com/ar;end;`

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

    guiManager.xrFolder.add(arActions, 'sceneViewer').name("Google AR")


    guiManager.xrFolder.add(arActions, 'usdzViewer').name("Apple AR")



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


const animate = () => {

    renderer.setAnimationLoop(render)

}

const render = () => {

    const startTime = clock.getElapsedTime()

    updateSize()


    delta = clock.getDelta()


    if (currentMixer) {

        currentMixer.update(delta)
    }

    for (const f of updateArray) {
        f()
    }
    // if (cubeCamera1) {
    //     cubeCamera1.update(renderer, scene);
    //     // material.envMap = cubeRenderTarget1.texture;

    // }

    if (gyroControls) {
        gyroControls.update()
        const phoneValues = `device  alpha:${(gyroControls.alpha).toFixed(3)},beta:${(gyroControls.beta).toFixed(3)},gamma:${(gyroControls.gamma).toFixed(3)}`
        const euler = `euler rad x:${(gyroPivot.rotation.x).toFixed(3)},y:${(gyroPivot.rotation.y).toFixed(3)},z:${(gyroPivot.rotation.z).toFixed(3)}`
        const quaternion = `quaternion x:${(gyroPivot.quaternion.x).toFixed(3)},y:${(gyroPivot.quaternion.y).toFixed(3)},z:${(gyroPivot.quaternion.z).toFixed(3)},w:${(gyroPivot.quaternion.w).toFixed(3)}`
        gyroTextDiv.innerText = phoneValues + '\n' + euler + '\n' + quaternion
    }

    TWEEN.update()
    // controls.update()
    renderer.render(scene, camera);


    frameCounter++
    currentTime = clock.getElapsedTime()
    // console.log(1 / (currentTime - startTime))

    if (currentTime >= (PreviousTime + 1)) {

        params.fps = frameCounter
        frameCounter = 0
        PreviousTime = currentTime

        fpsDiv.innerText = String(params.fps) + 'fps Px:' + String(params.pixelRatio)

        lastFewFrames.unshift(params.fps)
        if (lastFewFrames.length === 5) {
            lastFewFrames.pop()
            // console.log(lastFewFrames)

            adjustPixelRatio(lastFewFrames.reduce((p, c, i) => { return p + (c - p) / (i + 1) }, 0))
        }
    }


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

const lastFewFrames = []
function adjustPixelRatio(fps) {
    if (fps > 60) {
        if (renderer.getPixelRatio() !== window.devicePixelRatio) {
            renderer.setPixelRatio(window.devicePixelRatio)
            params.pixelRatio = window.devicePixelRatio
        }

    } else if (fps < 30 && fps > 50) {
        if (renderer.getPixelRatio() !== window.devicePixelRatio / 2) {
            renderer.setPixelRatio(window.devicePixelRatio / 2)
            params.pixelRatio = window.devicePixelRatio / 2
        }

    } else if (fps < 30) {
        if (renderer.getPixelRatio() !== 0.8) {
            renderer.setPixelRatio(0.8)
            params.pixelRatio = 0.8
        }

    }
}

init()
