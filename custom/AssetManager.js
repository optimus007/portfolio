import * as THREE from '../build/three.module.js';
import { TTFLoader } from "../examples/jsm/loaders/TTFLoader.js"
import { Font } from '../examples/jsm/loaders/FontLoader.js';
import { RGBELoader } from '../examples/jsm/loaders/RGBELoader.js';
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
let rgbeLoader = new RGBELoader(manager)

const assets = {}

const textureHavenPath = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/'
function getTextureHavenURL(suffix) {
    return `${textureHavenPath}${suffix}`
}

const assetList = {
    Tiled_Floor_001: 'tile_floor',
    ubuntu_font: 'ubuntu',
    kenpixel: 'keen',
    hdri: 'hdri'
}

const urlLibrary = {

    [assetList.Tiled_Floor_001]: {
        arm: getTextureHavenURL('tiled_floor_001/tiled_floor_001_diffuse_1k.jpg'),
        diffuse: getTextureHavenURL('tiled_floor_001/tiled_floor_001_diffuse_1k.jpg'),
        normal: getTextureHavenURL('tiled_floor_001/tiled_floor_001_nor_gl_1k.jpg'),
    },
    [assetList.ubuntu_font]: './fonts/Ubuntu-Regular.ttf',
    [assetList.kenpixel]: './fonts/kenpixel.ttf',
    [assetList.hdri]: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',

}



class AssetManager {
    constructor() {
        this.progress = 0

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
        const hdri = await rgbeLoader.loadAsync(urlLibrary[name])

        assets[name] = hdri

    }
}

const assetManager = new AssetManager()

export { assetManager }