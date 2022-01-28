import * as THREE from 'three';

import { guiManager } from "./GuiManager.js"
import * as  TWEEN from '../examples/jsm/libs/tween.esm.js'


let guiFolder = guiManager.curveFolder
let scene
let CurveTracks = {
    intro: {
        camera: {
            points: []
        },
        lookAt: {
            points: []
        },
    }
}
export class CurveManager {
    constructor(mainScene) {
        scene = mainScene
        this.selectedTrack = null
        this.addGui()
        this.tween
    }

    addGui() {
        guiFolder.add(this, 'selectedTrack', CurveTracks).onChange(() => { })

    }

    play() {

    }


}