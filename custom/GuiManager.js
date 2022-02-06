import { GUI } from "three-addons/libs/lil-gui.module.min.js"


class GuiManager {
    constructor() {
        this.gui = new GUI({ title: 'v5.825 dev' })
        this.gui.close()

        this.xrFolder = this.gui.addFolder(" X R ")
        this.xrFolder.close()
        this.materialsFolder = this.gui.addFolder("Materials")
        this.materialsFolder.close()

        this.captureFolder = this.gui.addFolder("Photo Mode")
        this.captureFolder.close()

        this.curveFolder = this.gui.addFolder("Track Curves")
        this.curveFolder.close()
    }

    mesh(mesh, settings = {}) {
        const folder = settings.folder ? options.folder : this.gui
        if (settings.positions) {
            folder.add(mesh.position, 'x', -1, 1, 0.01)

            folder.add(mesh.position, 'y', - 1, 1, 0.01)
            folder.add(mesh.position, 'z', - 1, 1, 0.01)
        }
    }

    add(obj, key, settings = {}) {
        const folder = settings.folder ? options.folder : this.gui
        folder.add(obj, key)

    }

}

const guiManager = new GuiManager()
export { guiManager }