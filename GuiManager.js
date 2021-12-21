import { GUI } from "./examples/jsm/libs/lil-gui.module.min.js"


export class GuiManager {
    constructor() {
        this.gui = new GUI({ title: 'v3' })

    }

    mesh(mesh, options = {}) {
        const folder = options.folder ? options.folder : this.gui
        if (options.positions) {
            folder.add(mesh.position, 'x', -1, 1, 0.01)

            folder.add(mesh.position, 'y', - 1, 1, 0.01)
            folder.add(mesh.position, 'z', - 1, 1, 0.01)
        }
    }

}