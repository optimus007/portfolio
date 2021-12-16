import * as THREE from '../build/three.module.js';

import { TextGeometry } from "../examples/jsm/geometries/TextGeometry.js"
import { assetManager } from "./AssetManager.js"


const assets = assetManager.getAssetList()

let font


export const getTextMesh = async (text, color = '#00ff00', size, height,) => {
    if (!font) { font = await assetManager.getFont(assets.ubuntu_font) }

    const matLite = new THREE.MeshBasicMaterial({
        color: color,
        transparent: false,
        opacity: 1,

    });

    const message = text

    const shapes = font.generateShapes(message, 100);

    const geometry = new THREE.ShapeGeometry(shapes);

    geometry.computeBoundingBox();

    const xMid = - 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

    geometry.translate(xMid, 0, 0);
    const sizex = geometry.boundingBox.max.x - geometry.boundingBox.min.x
    geometry.scale(1 / sizex, 1 / sizex, 1 / sizex)
    geometry.computeBoundingBox();

    const mesh = new THREE.Mesh(geometry, matLite);


    return mesh

}