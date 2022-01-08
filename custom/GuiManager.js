import { GUI } from "../examples/jsm/libs/lil-gui.module.min.js"


class GuiManager {
    constructor() {
        this.gui = new GUI({ title: 'v4' })
        this.gui.close()

        this.arFolder = this.gui.addFolder("AR")
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