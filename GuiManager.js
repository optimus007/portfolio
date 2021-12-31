import { GUI } from "./examples/jsm/libs/lil-gui.module.min.js"


export class GuiManager {
    constructor() {
        this.gui = new GUI({ title: 'v3' })

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