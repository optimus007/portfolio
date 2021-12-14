import * as THREE from './build/three.module.js';

let textureLoader

const assets = {}

const textureHavenPath = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/'
function getTextureHavenURL(suffix) {
    return `${textureHavenPath}${suffix}`
}

const assetList = {
    Tiled_Floor_001: 'tiled_floor_001'
}

const urlLibrary = {
    tiled_floor_001: {
        arm: getTextureHavenURL('tiled_floor_001/tiled_floor_001_diffuse_1k.jpg'),
        diffuse: getTextureHavenURL('tiled_floor_001/tiled_floor_001_diffuse_1k.jpg'),
        normal: getTextureHavenURL('tiled_floor_001/tiled_floor_001_nor_gl_1k.jpg'),
    }
}

class AssetManager {
    constructor(manager) {

        textureLoader = new THREE.TextureLoader(manager)
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

        if (!assets[name]) {
            await this.loadTextureSet(name)
        }
        return assets[name]
    }

    async loadTextureSet(name) {
        assets[name] = {}
        const urls = urlLibrary[name]

        for (const [texName, url] of Object.entries(urls)) {
            console.log('loading', texName)
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
}


export { AssetManager }