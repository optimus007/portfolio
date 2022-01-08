import * as THREE from '../build/three.module.js';
import { guiManager } from './GuiManager.js';

const CHANNELS = {
    diffuse: { map: 'map' },
    ao: { map: 'aoMap', factor: 'aoMapIntensity' },
    rough: { map: 'roughnessMap', factor: 'roughness' },
    metal: { map: 'metalnessMap', factor: 'metalness' },
}
const ALL_MATERIALS = {

}

class MaterialHandler {
    constructor() {
        this.sceneGroup
        this.ALL_MATERIALS = ALL_MATERIALS

        this.selectedMaterialName = 'NONE'
        this.selectedMaterial = null
        this.selectedChannel = null

        this.materialEditFolder = null

        this.materialMainFolder = guiManager.materialsFolder
    }

    /**
     * 
     * @param {THREE.Group} sceneGroup 
     */
    refresh(sceneGroup) {
        sceneGroup.traverse((node) => {
            if (node.material && node.material.isMeshStandardMaterial) {
                if (!node.material.name) {
                    if (node.name) {
                        node.material.name = node.name + '_material'
                    } else {
                        node.material.name = 'NO_NAME_MATERIAL'
                    }

                }

                if (this.ALL_MATERIALS[node.material.name] && this.ALL_MATERIALS[node.material.name].uuid !== node.material.uuid) {
                    node.material.name += '_X'
                }

                if (!node.material.backup) {
                    node.material.backup = node.material.clone()
                }

                this.ALL_MATERIALS[node.material.name] = node.material
            }
        })

        this.updateGui()
    }

    updateGui() {
        // map and factor

        const folder = this.materialMainFolder


        const materialNames = Object.keys(ALL_MATERIALS)
        materialNames.unshift('MASTER')
        materialNames.unshift('NONE')

        folder.add(this, 'selectedMaterialName', materialNames).onChange((name) => {
            console.log(name)
            this.selectMaterial(name)
        })

    }
    createEditFolder() {
        const folder = this.materialMainFolder
        if (this.materialEditFolder) {
            this.materialEditFolder.destroy()
            this.materialEditFolder = null
        }
        if (!this.selectedMaterial) {
            return
        }

        this.materialEditFolder = folder.addFolder(this.selectedMaterialName)

        if (this.selectedMaterial === 'MASTER') {
            this.createMasterControl()
            return
        }


    }

    createMasterControl() {
        console.log('MASTER CONTROLS')
        const channelNames = Object.keys(CHANNELS)


        for (const channel of channelNames) {
            const channelMaster = {}

            const chFolder = this.materialEditFolder.addFolder(channel)
            chFolder.close()

            if (CHANNELS[channel].map) {

                channelMaster.mapEnabled = true
                const keyName = CHANNELS[channel].map
                chFolder.add(channelMaster, 'mapEnabled').onChange(() => {

                    for (const material of Object.values(ALL_MATERIALS)) {
                        if (channelMaster.mapEnabled) {
                            material[keyName] = material.backup[keyName]
                        } else {
                            material[keyName] = null
                        }
                        material.needsUpdate = true
                    }

                })

            }

        }
    }

    selectMaterial(name) {
        if (name === 'NONE') {
            this.selectedMaterial = null
        } else if (name === 'MASTER') {
            this.selectedMaterial = 'MASTER'
        } else {
            this.selectedMaterial = this.ALL_MATERIALS[name]
        }

        this.createEditFolder()
    }




}

const materialHandler = new MaterialHandler()
export { materialHandler }