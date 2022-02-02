import * as THREE from 'three'
import { guiManager } from "./GuiManager.js"

const guiFolder = guiManager.captureFolder
const PhotoResolutionPresets = {
    'Screen': [null, null],
    '400p': [400, 400],
    '512p': [512, 512],
    '1K': [1024, 1024],
    '2K': [2048, 2048],
    '4K': [4096, 4096],


}
let renderer, scene, camera
export class Recorder {
    constructor(mainRenderer, mainScene, mainCamera) {
        renderer = mainRenderer

        this.restoreResolution = new THREE.Vector2(100, 100)
        this.restorePixelDensity = 1
        this.resolution = new THREE.Vector2(512, 512)
        scene = mainScene
        camera = mainCamera

        this.resolutionPreset = '512p'
        this.imageAlpha = false
        this.imageNamePrefix = 'screenshot'
        this.link = document.createElement('a')
        this.addGui()
    }


    addGui() {
        guiFolder.add(this, 'resolutionPreset', PhotoResolutionPresets).onChange((v) => {

            this.resolution.set(v[0], v[1])
            console.log('resolution', this.resolution)


        })

        guiFolder.add(this, 'imageAlpha')
        guiFolder.add(this, 'capturePhoto').name('Capture Image')
    }

    capturePhoto() {
        renderer.getSize(this.restoreResolution)
        this.restorePixelRatio = renderer.getPixelRatio()
        if (this.resolution.x) {
            renderer.setPixelRatio(1)
            renderer.setSize(this.resolution.x, this.resolution.y)
            camera.aspect = this.resolution.x / this.resolution.y
            camera.updateProjectionMatrix()
            console.log(this.resolution)
        }
        if (this.imageAlpha) {
            scene.background = null
        }

        renderer.render(scene, camera)

        let data
        if (this.imageAlpha) {
            data = renderer.domElement.toDataURL('image/png')
            scene.background = scene.backgroundColor
        } else {
            data = renderer.domElement.toDataURL('image/jpeg', 1.0)
        }

        renderer.setPixelRatio(this.restorePixelRatio)
        renderer.setSize(this.restoreResolution.x, this.restoreResolution.y)
        camera.aspect = this.restoreResolution.x / this.restoreResolution.y
        camera.updateProjectionMatrix()
        console.log({ data })
        this.downloadDataAsImage(data)
    }

    downloadDataAsImage(data) {


        this.link.setAttribute('href', data)
        this.link.setAttribute('target', '_blank')
        const filename = `${this.imageNamePrefix}_${this.resolution.x}x${this.resolution.y}_${Date.now()}` + (this.imageAlpha ? '.png' : '.jpeg')
        console.log({ filename })
        this.link.setAttribute('download', filename)

        this.link.click()
    }



}