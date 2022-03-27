import { GUI } from "three-addons/libs/lil-gui.module.min.js"


class GuiManager {
    constructor() {
        this.gui = new GUI({ title: 'v6.02 dev' })
        this.gui.close()

        this.xrFolder = this.gui.addFolder(" X R ")
        this.xrFolder.close()
        this.materialsFolder = this.gui.addFolder("Materials")
        this.materialsFolder.close()

        this.meshFolder = this.gui.addFolder("Meshes")
        this.meshFolder.close()

        this.captureFolder = this.gui.addFolder("Photo Mode")
        this.captureFolder.close()

        this.curveFolder = this.gui.addFolder("Track Curves")
        this.curveFolder.close()


    }

    mesh(mesh, name) {
        const folder = this.meshFolder
        folder.add(mesh, 'visible').name(name)

    }

    add(obj, key, settings = {}) {
        const folder = settings.folder ? options.folder : this.gui
        folder.add(obj, key)

    }

}

const guiManager = new GuiManager()
export { guiManager }