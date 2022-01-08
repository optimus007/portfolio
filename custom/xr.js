import * as THREE from '../build/three.module.js';
import * as  TWEEN from '../examples/jsm/libs/tween.esm.js';
import { assetManager } from './AssetManager.js';

import { guiManager } from "./GuiManager.js";

import { XREstimatedLight } from '../examples/jsm/webxr/XREstimatedLight.js';

const assets = assetManager.assetList
let renderer,
    xrScene = new THREE.Scene,
    xrGroup = new THREE.Group(),
    xrCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100),
    mainRenderFunction = () => { },

    modelGroup = null,
    modelGroupParent = null,
    defaultHDRI,

    currentSession = null,
    sessionInit = {},

    //AR
    initialScale = 0.2,
    reticle,
    arSupported = false,
    arStatus = '',
    hitTestSourceRequested = false,
    hitTestSource = null,
    selectFlag = false,
    xrLight,

    //VR
    vrSupported = false,
    vrStatus = ''

sessionInit.requiredFeatures = ['hit-test']
sessionInit.optionalFeatures = ['light-estimation'];
xrScene.add(xrGroup)



/**
 * web xr
 */
export class webXRController {
    constructor(webglRenderer, renderFunction, displayModelGroup) {
        renderer = webglRenderer
        modelGroup = displayModelGroup
        mainRenderFunction = renderFunction
        this.init()
    }

    init = async () => {
        await this.checkCompatibility()

        if (arSupported) {
            this.setupARScene()
            renderer.ph
            renderer.xr.enabled = true

            renderer.physicallyCorrectLights = true;
            defaultHDRI = await assetManager.getHDRI(assets.hdri)
        }
        this.addGuiButtons()

    }



    checkCompatibility = async () => {
        if ('xr' in navigator) {

            await navigator.xr.isSessionSupported('immersive-ar').then((supported) => {

                if (supported) {
                    arSupported = true
                    arStatus = 'AR SUPPORTED'
                } else {
                    arStatus = 'AR NOT SUPPORTED'
                }

            }).catch(() => {
                arStatus = 'AR NOT SUPPORTED'
            });

        } else {

            if (window.isSecureContext === false) {


                arStatus = 'WEBXR NEEDS HTTPS'; // TODO Improve message

            } else {


                arStatus = 'WEBXR NOT AVAILABLE';

            }

        }
    }

    addGuiButtons() {
        const folder = guiManager.arFolder

        folder.close()
        const params = {
            status: arStatus
        }


        folder.add(this, 'ARButtonClick').name('webxr AR')



    }

    ARButtonClick() {
        if (arSupported) {
            this.startAR()
        } else {
            alert('Sorry ' + arStatus)
        }

    }

    adoptModel() {
        modelGroupParent = modelGroup.parent

        xrGroup.position.setScalar(0)
        xrGroup.rotation.set(0, 0, 0)
        xrGroup.scale.setScalar(initialScale)

        xrGroup.add(modelGroup)
        xrGroup.visible = false
        console.log({ xrScene, xrGroup, })
    }

    revertModel() {
        xrGroup.position.setScalar(0)
        xrGroup.rotation.set(0, 0, 0)
        xrGroup.scale.setScalar(1)

        modelGroupParent.add(modelGroup)
    }


    // WEB AR
    setupARScene() {

        this.setupARUI()
        // scene
        // const light = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1)
        // xrScene.add(light);
        const controller = renderer.xr.getController(0);
        controller.addEventListener('selectstart', () => { selectFlag = true });
        controller.addEventListener('selectend', () => { selectFlag = false });

        xrScene.add(controller);
        xrScene.add(xrCamera);
        xrCamera.position.set(0, 1.5, 5)

        reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(- Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        xrScene.add(reticle);

        // Group
        const grid = new THREE.GridHelper(1, 10, 0xffffff, 0x000000)
        xrGroup.add(grid)

        xrLight = new XREstimatedLight(renderer);
        xrLight.addEventListener('estimationstart', () => {

            // Swap the default light out for the estimated one one we start getting some estimated values.
            xrScene.add(xrLight);

        });

        xrLight.addEventListener('estimationend', () => {

            // Swap the lights back when we stop receiving estimated values.
            xrScene.remove(xrLight);


        });

    }

    setupARUI() {
        var overlay = document.createElement('div');
        overlay.style.display = 'none';
        // overlay.style.zIndex = 100
        document.body.appendChild(overlay);

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', 38);
        svg.setAttribute('height', 38);
        svg.style.position = 'absolute';
        svg.style.right = '20px';
        svg.style.top = '20px';
        svg.addEventListener('click', () => {

            currentSession.end();

        });
        overlay.appendChild(svg);

        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 12,12 L 28,28 M 28,12 12,28');
        path.setAttribute('stroke', '#fff');
        path.setAttribute('stroke-width', 2);
        svg.appendChild(path);


        sessionInit.optionalFeatures.push('dom-overlay');
        sessionInit.domOverlay = { root: overlay };



    }

    onARStart = async (session) => {
        this.xrAnimate(true)
        session.addEventListener('end', this.onAREnd)
        renderer.xr.setReferenceSpaceType('local')
        await renderer.xr.setSession(session)
        sessionInit.domOverlay.root.style.display = ''
        currentSession = session
        this.adoptModel()

        xrScene.environment = defaultHDRI
    }

    onAREnd = (event) => {
        this.revertModel()
        this.xrAnimate(false)

        currentSession.removeEventListener('end', this.onAREnd);
        currentSession = null;
        sessionInit.domOverlay.root.style.display = 'none';

        hitTestSourceRequested = false
        hitTestSource = null
    }

    onARSelect = () => {
        if (reticle.visible) {
            console.log('SELECT')
            xrGroup.position.setFromMatrixPosition(reticle.matrix);
            xrGroup.visible = true
        }

        xrLight.directionalLight.intensity = 0
        xrLight.lightProbe.intensity = 0
    }

    startAR() {
        if (currentSession === null) {
            navigator.xr.requestSession('immersive-ar', sessionInit).then(this.onARStart);
        } else {
            currentSession.end();
        }



    }


    xrAnimate = (status) => {
        if (status) {
            renderer.setAnimationLoop(this.xrRender)
        } else {
            renderer.setAnimationLoop(mainRenderFunction)
        }


    }



    xrRender = (timeStamp, frame) => {
        TWEEN.update()
        if (frame) {
            this.onFrame(frame)
        }
        renderer.render(xrScene, xrCamera)
    }

    onFrame = (frame) => {
        const referenceSpace = renderer.xr.getReferenceSpace();

        if (hitTestSourceRequested === false) {

            currentSession.requestReferenceSpace('viewer').then((referenceSpace) => {

                currentSession.requestHitTestSource({ space: referenceSpace }).then((source) => {

                    hitTestSource = source;

                });

            });

            hitTestSourceRequested = true;

        }


        if (hitTestSource) {

            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length) {

                const hit = hitTestResults[0];

                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                if (selectFlag) {
                    this.onARSelect()
                }

            } else {

                reticle.visible = false;

            }

        }

    }
}