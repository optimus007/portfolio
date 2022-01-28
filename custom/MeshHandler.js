import * as THREE from 'three';

import { TextGeometry } from "../examples/jsm/geometries/TextGeometry.js"
import { assetManager } from "./AssetManager.js"


const assets = assetManager.getAssetList()

let font


export const getTextMesh = async (text, color = '#00ff00', maxY = 1, height,) => {
    if (!font) { font = await assetManager.getFont(assets.ubuntu_font) }

    const matLite = new THREE.MeshStandardMaterial({
        color: color,
        transparent: false,
        opacity: 1,
        roughness: 0.1,
        metalness: 1,

    });

    const message = text

    const shapes = font.generateShapes(message, 100);

    const geometry = new THREE.ShapeGeometry(shapes);

    geometry.computeBoundingBox();

    const xMid = - 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

    geometry.translate(xMid, 0, 0);
    const sizey = geometry.boundingBox.max.y - geometry.boundingBox.min.y
    geometry.scale(maxY / sizey, maxY / sizey, maxY / sizey)
    geometry.computeBoundingBox();

    const mesh = new THREE.Mesh(geometry, matLite);


    return mesh

}