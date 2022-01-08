import { GUI } from "../examples/jsm/libs/lil-gui.module.min.js"


class GuiManager {
    constructor() {
        this.gui = new GUI({ title: 'v5' })
        this.gui.close()

        this.arFolder = this.gui.addFolder("AR")
        this.arFolder.close()
        this.materialsFolder = this.gui.addFolder("Materials")
        this.materialsFolder.close()
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