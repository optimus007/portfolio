import * as THREE from 'three'
import * as  TWEEN from 'three-addons/libs/tween.esm.js'
import { assetManager } from './AssetManager.js'

import { guiManager } from "./GuiManager.js"

import { XREstimatedLight } from 'three-addons/webxr/XREstimatedLight.js'

const assets = assetManager.assetList
let renderer,
    xrScene = new THREE.Scene,
    xrGroup = new THREE.Group(),
    xrCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100),
    mainRenderFunction = () => { },

    modelGroup = null,
    modelGroupParent = null,
    clock = null,
    mixer = null,
    delta = 0,
    defaultHDRI,


    currentSession = null,
    sessionInit = {},

    //AR
    arSessionActive = false,
    arSupported = false,
    arStatus = '',
    initialScale = 0.2,
    reticle,
    hitTestSourceRequested = false,
    hitTestSource = null,
    selectFlag = false,
    xrLight,
    arTextDiv,
    arText = "Test 123 123 Test",

    //VR
    vrSessionActive = false,
    vrSupported = false,
    vrStatus = '',
    cameraGroup = new THREE.Group()

sessionInit.requiredFeatures = ['hit-test']
sessionInit.optionalFeatures = ['light-estimation']
// sessionInit.optionalFeatures = []

xrScene.name = 'xrScene'
xrGroup.name = 'xrGroup'
xrScene.add(xrGroup)

const AR_TEXTS = {
    ON_START: 'Move your device around',
    ON_SURFACE_DETECTED: 'Surface Detected',
    ON_SURFACE_LOST: 'Surface Lost',
    ON_SELECT: 'Moving to detected surface',

}

/**
 * web xr
 */
export class webXRController {
    constructor(webglRenderer, renderFunction, displayModelGroup, mainClock) {
        renderer = webglRenderer
        modelGroup = displayModelGroup
        clock = mainClock
        mainRenderFunction = renderFunction
        this.init()

    }

    init = async () => {

        await this.checkCompatibility()
        this.addGuiButtons()
        if (!arSupported && !vrSupported) { return }
        renderer.xr.enabled = true
        renderer.xr.setReferenceSpaceType('local')

        defaultHDRI = await assetManager.getHDRI(assets.hdri)
        xrScene.environment = defaultHDRI

        if (arSupported) {
            this.setupARScene()
            // this.xrRender()
        }
        if (vrSupported) {
            this.setupVRScene()
        }



    }

    connectMixer(mainMixer) {

        mixer = mainMixer
    }

    checkCompatibility = async () => {
        if ('xr' in navigator) {

            // AR
            await navigator.xr.isSessionSupported('immersive-ar').then((supported) => {

                if (supported) {
                    arSupported = true
                    arStatus = 'AR SUPPORTED'
                } else {
                    arStatus = 'AR NOT SUPPORTED'
                }

            }).catch(() => {
                arStatus = 'AR NOT SUPPORTED'
            })


            // VR
            await navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                if (supported) {
                    vrSupported = true
                    vrStatus = 'VR SUPPORTED'
                } else {
                    vrStatus = 'VR NOT SUPPORTED'
                }


            }).catch(() => {
                vrStatus = 'VR NOT SUPPORTED'
            })



        } else {

            if (window.isSecureContext === false) {


                arStatus = 'WEBXR NEEDS HTTPS'
                vrStatus = 'WEBXR NEEDS HTTPS'

            } else {


                arStatus = 'WEBXR NOT AVAILABLE'
                vrStatus = 'WEBXR NOT AVAILABLE'

            }

        }



    }

    addGuiButtons() {
        const folder = guiManager.xrFolder

        folder.close()
        const params = {
            status: arStatus
        }


        folder.add(this, 'ARButtonClick').name('webxr AR')
        folder.add(this, 'VRButtonClick').name('webxr VR')



    }

    ARButtonClick() {
        if (arSupported) {
            this.startAR()
        } else {
            alert('Sorry, ' + arStatus)
        }

    }

    VRButtonClick() {
        if (vrSupported) {
            this.startVR()
        } else {
            alert('Sorry, ' + vrStatus)
        }
    }


    adoptModel() {
        modelGroupParent = modelGroup.parent

        xrGroup.position.setScalar(0)
        xrGroup.rotation.set(0, 0, 0)
        // xrGroup.scale.setScalar(initialScale)

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
        const controller = renderer.xr.getController(0)
        controller.addEventListener('selectstart', () => { selectFlag = true })
        controller.addEventListener('selectend', () => { selectFlag = false })

        xrScene.add(controller)
        xrScene.add(xrCamera)
        xrCamera.position.set(0, 1.5, 5)

        reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(- Math.PI / 2),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 })
        )
        reticle.matrixAutoUpdate = false
        reticle.visible = false
        xrScene.add(reticle)

        // Group
        const grid = new THREE.GridHelper(1, 10, 0xffffff, 0x000000)
        xrGroup.add(grid)

        this.setupLightingEstimation()

    }

    setupLightingEstimation() {

        xrLight = new XREstimatedLight(renderer)
        xrLight.addEventListener('estimationstart', () => {

            // Swap the default light out for the estimated one one we start getting some estimated values.
            xrScene.add(xrLight)

            if (xrLight.environment) {

                xrScene.environment = xrLight.environment

            }

        })

        xrLight.addEventListener('estimationend', () => {

            // Swap the lights back when we stop receiving estimated values.
            xrScene.remove(xrLight)

            xrScene.environment = defaultHDRI
        })
    }

    setupARUI() {
        let overlay = document.createElement('div')
        // new PointerHandler(overlay)
        overlay.style.display = 'none'
        overlay.style.touchAction = 'none'

        // overlay.style.zIndex = 100
        document.body.appendChild(overlay)

        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', 38)
        svg.setAttribute('height', 38)
        svg.style.position = 'absolute'
        svg.style.right = '20px'
        svg.style.top = '20px'
        svg.id = 'xrExit'
        svg.addEventListener('click', () => {

            currentSession.end()

        })
        overlay.appendChild(svg)

        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', 'M 12,12 L 28,28 M 28,12 12,28')
        path.setAttribute('stroke', '#fff')
        path.setAttribute('stroke-width', 2)
        svg.appendChild(path)


        sessionInit.optionalFeatures.push('dom-overlay')
        sessionInit.domOverlay = { root: overlay }
        //gui hide
        const buttonHide = document.createElement('input')
        buttonHide.type = 'checkbox'
        buttonHide.style.position = 'absolute'
        // buttonHide.checked = true
        buttonHide.style.left = '40px'
        buttonHide.style.top = '20px'
        buttonHide.oninput = () => {
            const itemsToHide = ['xrText', 'xrRotation', 'xrScale', 'xrExit']
            for (const id of itemsToHide) {
                const elem = document.getElementById(id)
                if (buttonHide.checked) {
                    elem.style.display = 'none'
                } else {
                    elem.style.display = ''
                }

            }

        }
        overlay.appendChild(buttonHide)

        // text 
        const textDiv = document.createElement('div')
        overlay.appendChild(textDiv)
        textDiv.id = 'xrText'
        textDiv.style.position = 'absolute'
        textDiv.style.top = "10%"
        textDiv.style.left = "10%"
        textDiv.style.width = "80%"
        textDiv.style.height = "10%"
        // textDiv.style.backgroundColor = "#ff00ff"
        textDiv.innerText = arText
        textDiv.style.fontSize = '20px'
        textDiv.style.textAlign = 'center'
        textDiv.style.pointerEvents = 'none'
        textDiv.style.userSelect = 'none'
        arTextDiv = textDiv


        // slider
        const slider = document.createElement('input')
        slider.id = 'xrRotation'
        slider.type = 'range'
        slider.min = 0
        slider.innerText = 'rotation'
        slider.max = Math.PI * 2
        slider.step = 'any'
        slider.value = 0
        slider.style.position = 'absolute'
        slider.style.left = '10%'
        slider.style.right = '10%'
        slider.style.bottom = '5%'
        slider.style.width = '80%'
        overlay.appendChild(slider)

        slider.oninput = (ev) => {
            this.rotateARGroup(slider.value)
        }

        const sliderScale = document.createElement('input')
        sliderScale.id = 'xrScale'
        sliderScale.type = 'range'
        sliderScale.min = 0.1
        sliderScale.innerText = 'Scale'
        sliderScale.max = 2
        sliderScale.step = 'any'
        sliderScale.value = 1
        sliderScale.style.position = 'absolute'
        sliderScale.style.left = '10%'
        sliderScale.style.right = '10%'
        sliderScale.style.bottom = '10%'
        sliderScale.style.width = '80%'
        overlay.appendChild(sliderScale)

        sliderScale.oninput = () => {


            this.scaleARGroup(sliderScale.value)


        }
    }

    onARStart = async (session) => {
        xrScene.background = null
        this.xrAnimate(true)
        session.addEventListener('end', this.onAREnd)

        await renderer.xr.setSession(session)
        sessionInit.domOverlay.root.style.display = ''
        currentSession = session
        arSessionActive = true
        this.adoptModel()

        this.setARText(AR_TEXTS.ON_START)



    }

    onAREnd = (event) => {
        this.revertModel()
        this.xrAnimate(false)

        arSessionActive = false
        currentSession.removeEventListener('end', this.onAREnd)
        currentSession = null
        sessionInit.domOverlay.root.style.display = 'none'

        hitTestSourceRequested = false
        hitTestSource = null
    }

    onARSelect = () => {

        // console.log('SELECT')

        // this.setARText(AR_TEXTS.ON_SELECT)
        xrGroup.position.setFromMatrixPosition(reticle.matrix)
        xrGroup.visible = true


        if (xrLight) {
            // xrLight.directionalLight.intensity = 0
            // xrLight.lightProbe.intensity = 0

            let name = 'no hdri'

            if (xrScene.environment) {
                name = xrScene.environment.name
            }
        }

    }

    startAR() {
        if (currentSession === null) {
            navigator.xr.requestSession('immersive-ar', sessionInit).then(this.onARStart)
        } else {
            currentSession.end()
        }



    }

    setARText(text) {
        if (text === arTextDiv.innerText) return
        arText = text
        arTextDiv.innerText = arText

        // setTimeout(() => {
        //     arTextDiv.innerText = ''
        // }, 2000)
    }

    rotateARGroup = (rad) => {
        xrGroup.rotation.y = rad
    }

    scaleARGroup = (scale) => {
        xrGroup.scale.setScalar(scale)
    }

    xrAnimate = (status) => {
        if (status) {
            renderer.setAnimationLoop(this.xrRender)
        } else {
            renderer.setAnimationLoop(mainRenderFunction)
        }


    }



    /**
     * render func
     * @param {*} timeStamp 
     * @param {*} frame 
     */

    xrRender = (timeStamp, frame) => {
        TWEEN.update()

        if (mixer) {
            delta = clock.getDelta()
            mixer.update(delta)
        }
        if (arSessionActive && frame) {
            this.onARFrame(frame)
        }
        renderer.render(xrScene, xrCamera)
    }

    /**
     * For AR hit test
     * @param {*} frame 
     */
    onARFrame = (frame) => {
        const referenceSpace = renderer.xr.getReferenceSpace()

        if (hitTestSourceRequested === false) {

            currentSession.requestReferenceSpace('viewer').then((referenceSpace) => {

                currentSession.requestHitTestSource({ space: referenceSpace }).then((source) => {

                    hitTestSource = source

                })

            })

            hitTestSourceRequested = true

        }


        if (hitTestSource) {

            const hitTestResults = frame.getHitTestResults(hitTestSource)

            if (hitTestResults.length) {

                const hit = hitTestResults[0]
                if (!reticle.visible) {
                    this.setARText(AR_TEXTS.ON_SURFACE_DETECTED)
                }
                reticle.visible = true
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix)
                if (selectFlag) {
                    this.onARSelect()
                }




            } else {
                if (reticle.visible) {
                    this.setARText(AR_TEXTS.ON_SURFACE_LOST)
                }
                reticle.visible = false

            }

        }

    }





    //VR

    setupVRScene = () => {


        // renderer.vr.userHeight = 1.4
        // xrScene.add(cameraGroup)
        // cameraGroup.position.set(0, 0, -2)
        // Group

        const grid = new THREE.GridHelper(1, 10, 0xffffff, 0x000000)
        xrGroup.add(grid)

    }

    onVRStart = async (session) => {
        // cameraGroup.add(xrCamera)

        xrScene.background = defaultHDRI
        this.adoptModel()
        this.xrAnimate(true)

        console.log({ xrScene })

        session.addEventListener('end', this.onVREnd)

        await renderer.xr.setSession(session)

        // button.textContent = 'EXIT VR'

        currentSession = session
        vrSessionActive = true

    }
    onVRTap = () => {

    }
    onVREnd = () => {
        currentSession.removeEventListener('end', this.onVREnd)
        currentSession = null
        this.revertModel()
        // xrScene.add(xrCamera)
        // button.textContent = 'ENTER VR'
        this.xrAnimate(false)
        vrSessionActive = false
    }


    startVR = () => {


        if (currentSession === null) {
            const vrSessionInit = { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] }
            navigator.xr.requestSession('immersive-vr', vrSessionInit).then(this.onVRStart)

        } else {
            currentSession.end()
        }
    }
}



const ongoingTouches = []
class PointerHandler {
    constructor(div) {
        this.div = div


        this.addPointerEvents()
        this.touch1Div = document.createElement('div')
        this.touch1Div.style.position = 'absolute'
        this.touch1Div.style.top = "20%"
        this.touch1Div.style.left = "60%"
        this.touch1Div.style.width = "50px"
        this.touch1Div.style.height = "50px"
        this.touch1Div.style.backgroundColor = "#00ff00"

        this.touch2Div = document.createElement('div')
        this.touch2Div.style.position = 'absolute'
        this.touch2Div.style.top = "20%"
        this.touch2Div.style.left = "30%"
        this.touch2Div.style.width = "50px"
        this.touch2Div.style.height = "50px"
        this.touch2Div.style.backgroundColor = "#0000ff"

        this.div.appendChild(this.touch1Div)
        this.div.appendChild(this.touch2Div)

    }

    addPointerEvents() {
        const el = this.div


        el.addEventListener("pointerdown", this.down_handler, false);
        el.addEventListener("pointerup", this.up_handler, false);
        el.addEventListener("pointercancel", this.cancel_handler, false);
        el.addEventListener("pointermove", this.move_handler, false);
    }

    down_handler = (event) => {
        event.preventDefault()
        ongoingTouches.push(event)

        if (ongoingTouches.length === 2) {
            this.twoPointers()
        }

    }
    move_handler = (event) => {
        event.preventDefault()
        // console.log(event)

        let idx = this.ongoingTouchIndexById(event.pointerId)
        ongoingTouches.splice(idx, 1, event)

        if (ongoingTouches.length === 2) {
            this.twoPointers()
        }

    }
    up_handler = (event) => {
        event.preventDefault()

        let idx = this.ongoingTouchIndexById(event.pointerId)
        ongoingTouches.splice(idx, 1)
        if (ongoingTouches.length === 2) {
            this.twoPointers()
        }
    }

    cancel_handler = (event) => {
        let idx = this.ongoingTouchIndexById(event.pointerId)
        ongoingTouches.splice(idx, 1)  // remove it; we're done
    }

    ongoingTouchIndexById = (idToFind) => {
        for (let i = 0; i < ongoingTouches.length; i++) {
            let id = ongoingTouches[i].pointerId

            if (id == idToFind) {
                return i;
            }
        }
        return -1;    // not found
    }


    twoPointers() {
        const pointer1 = ongoingTouches[0]
        const pointer2 = ongoingTouches[1]

        this.touch1Div.style.top = String(pointer1.offsetY - 25) + 'px'
        this.touch1Div.style.left = String(pointer1.offsetX - 25) + 'px'

        this.touch2Div.style.top = String(pointer2.offsetY - 25) + 'px'
        this.touch2Div.style.left = String(pointer2.offsetX - 25) + 'px'

        console.log(pointer1.offsetX, pointer2.offsetX)
    }

}