import * as THREE from '../build/three.module.js';
import { TTFLoader } from "../examples/jsm/loaders/TTFLoader.js"
import { Font } from '../examples/jsm/loaders/FontLoader.js';
import { EXRLoader } from '../examples/jsm/loaders/EXRLoader.js';
import { ImprovedNoise } from '../examples/jsm/math/ImprovedNoise.js'
import * as  TWEEN from '../examples/jsm/libs/tween.esm.js';
import { GLTFLoader } from '../examples/jsm/loaders/GLTFLoader.js';

const manager = new THREE.LoadingManager();



manager.onLoad = function (v) {

    // console.log('Loading complete!');

};


manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    assetManager.progress = itemsLoaded / itemsTotal
    console.log('Loading file: ', { url }, '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');

};

manager.onError = function (url) {

    console.log('There was an error loading ' + url);

};

let textureLoader = new THREE.TextureLoader(manager)
let fileLoader = new THREE.FileLoader(manager)
let ttfLoader = new TTFLoader(manager)
let exrLoader = new EXRLoader(manager)
let gltfLoader = new GLTFLoader(manager)
let pmrem

const assets = {}

const textureHavenPath = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/'
function getTextureHavenURL(suffix) {
    return `${textureHavenPath}${suffix}`
}

const assetList = {
    Tiled_Floor_001: 'tile_floor',
    ubuntu_font: 'ubuntu',
    kenpixel: 'keen',
    hdri: 'hdri',
    model: 'model',
    robot: 'robot',
    chair: 'chair',
    mug: 'mug'
}

const urlLibrary = {

    [assetList.chair]: 'https://threejs.org/examples/models/gltf/DamagedHelmet.gltf',
    [assetList.model]: './asset3d/model.glb',
    [assetList.robot]: './asset3d/robot.glb',
    [assetList.Tiled_Floor_001]: {
        arm: getTextureHavenURL('tiled_floor_001/tiled_floor_001_diffuse_1k.jpg'),
        diffuse: getTextureHavenURL('tiled_floor_001/tiled_floor_001_diffuse_1k.jpg'),
        normal: getTextureHavenURL('tiled_floor_001/tiled_floor_001_nor_gl_1k.jpg'),
    },
    [assetList.ubuntu_font]: './fonts/Ubuntu-Regular.ttf',
    [assetList.kenpixel]: './fonts/kenpixel.ttf',
    [assetList.hdri]: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/1k/comfy_cafe_1k.exr',
    [assetList.mug]: './asset3d/mug.glb',

}



class AssetManager {
    constructor() {
        this.progress = 0
        this.assetList = assetList
    }
    setupPmrem(renderer) {
        if (pmrem) { return }
        pmrem = new THREE.PMREMGenerator(renderer)
    }

    getAssetList() {
        return assetList
    }

    printAssets() {
        console.log({ assets })
    }


    async getTextureSet(name) {
        if (this.checkIfDownloaded(name)) {
            return assets[name]
        }
        await this.loadTextureSet(name)
        return assets[name]
    }

    async loadTextureSet(name) {
        assets[name] = {}
        const urls = urlLibrary[name]

        for (const [texName, url] of Object.entries(urls)) {

            assets[name][texName] = await textureLoader.loadAsync(url)
            if (texName === 'diffuse') {
                assets[name][texName].encoding = THREE.sRGBEncoding
            }
            assets[name][texName].name = name + texName
        }

        assets[name].loaded = true
    }

    checkIfDownloaded(name) {
        if (assets[name]) {
            if (assets[name].loaded) {
                return true
            }
        }
        return false
    }

    async getFont(name) {
        if (this.checkIfDownloaded(name)) {
            return assets[name]
        }
        await this.loadFont(name)
        return assets[name]
    }

    async loadFont(name) {
        const json = await ttfLoader.loadAsync(urlLibrary[name])

        const font = new Font(json)
        console.log({ json, font, assets })
        assets[name] = font

    }

    async getHDRI(name) {
        if (this.checkIfDownloaded(name)) {
            return assets[name]
        }
        await this.loadHDRI(name)
        return assets[name]
    }

    async loadHDRI(name) {
        if (!pmrem) {
            console.warn('NO PMREM')
            return null
        }
        const exr = await exrLoader.loadAsync(urlLibrary[name])
        const hdri = pmrem.fromEquirectangular(exr).texture
        hdri.name = name
        assets[name] = hdri

        exr.dispose()

    }

    async loadGLTF(name) {
        return await gltfLoader.loadAsync(urlLibrary[name])
    }
}



export class NoiseGenerator {
    constructor(object, keyName, seed = Math.random()) {
        this.perlin = new ImprovedNoise()
        this.obj = { val: 0 }
        this.v = 0
        this.setup()
        this.frequency = 0.0005
        this.strength = 0.02
        this.seed = seed
        this.noiseValue = 0

        this.targetObject = object
        this.targetKey = keyName
    }
    setup() {
        this.tween = new TWEEN.Tween(this.obj)
        this.tween.to({ val: 1 }, 10000)
        this.tween.repeat(Infinity)
        this.tween.easing(TWEEN.Easing.Linear.None)
        this.tween.onUpdate(() => {
            this.time = performance.now()
            this.noiseValue = this.perlin.noise(this.time * this.frequency, this.seed, this.seed) * this.strength

            const shake = Math.pow(intensityRef.current, 2)



            this.targetObject[this.targetKey] = this.noiseValue
        })
    }

    start() {
        this.tween.start()
    }
    stop() {
        this.tween.stop()
    }
    setFrequency(v) {
        this.frequency = v
    }


}

export class cameraNoise {
    constructor(camera) {
        this.camera = camera
        this.intensity = 0.5
        this.decay
        this.decayRate = 0.65
        this.maxYaw = 0.1
        this.maxPitch = 0.1
        this.maxRoll = 0.1
        this.yawFrequency = 0.001
        this.pitchFrequency = 0.001
        this.rollFrequency = 0.001
        this.controls

        this.obj = { val: 0 }
        this.yawNoise = new ImprovedNoise()
        this.pitchNoise = new ImprovedNoise()
        this.rollNoise = new ImprovedNoise()
        this.initialRotation = new THREE.Euler()
        this.setup()
    }
    copyRotation() {
        this.initialRotation.copy(this.camera.rotation)
    }


    setup() {

        this.tween = new TWEEN.Tween(this.obj)
        this.tween.to({ val: 1 }, 10000)
        this.tween.repeat(Infinity)
        this.tween.easing(TWEEN.Easing.Linear.None)
        this.tween.onStart(() => { this.copyRotation() })
        this.tween.onUpdate(() => {
            this.time = performance.now()
            const shake = Math.pow(this.intensity, 2)
            const yaw = this.maxYaw * shake * this.yawNoise.noise(this.time * this.yawFrequency, 1, 100)
            const pitch = this.maxPitch * shake * this.pitchNoise.noise(this.time * this.pitchFrequency, 1, 200)
            const roll = this.maxRoll * shake * this.rollNoise.noise(this.time * this.rollFrequency, 1, 300)

            this.camera.rotation.set(
                this.initialRotation.x + pitch,
                this.initialRotation.y + yaw,
                this.initialRotation.z + roll
            )
        })

    }
    start() {
        this.tween.start()
    }
    stop() {
        this.tween.stop()
    }


}

const assetManager = new AssetManager()

export { assetManager }