import {
    ACESFilmicToneMapping,
    NoToneMapping,
    Box3,
    LoadingManager,
    EquirectangularReflectionMapping,
    PMREMGenerator,
    Sphere,
    Color,
    DoubleSide,
    Mesh,
    MeshStandardMaterial,
    PlaneBufferGeometry,
    Group,
    MeshPhysicalMaterial,
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    MeshBasicMaterial,
    sRGBEncoding,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js';
import { LDrawUtils } from 'three/examples/jsm/utils/LDrawUtils.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
// import { generateRadialFloorTexture } from './utils/generateRadialFloorTexture.js';
import { generateRadialFloorTexture } from 'three-gpu-pathtracer';
// import { PathTracingSceneWorker } from '../src/workers/PathTracingSceneWorker.js';
import { PathTracingSceneWorker } from 'three-gpu-pathtracer';

// import { PhysicalPathTracingMaterial, PathTracingRenderer, MaterialReducer } from '../src/index.js';
import { PhysicalPathTracingMaterial, PathTracingRenderer, MaterialReducer } from 'three-gpu-pathtracer';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const envMaps = {
    'Royal Esplanade': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/royal_esplanade_1k.hdr',
    'Moonless Golf': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/moonless_golf_1k.hdr',
    'Overpass': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/pedestrian_overpass_1k.hdr',
    'Venice Sunset': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/venice_sunset_1k.hdr',
};

const models = window.MODEL_LIST || {
    'M2020 Rover': {
        url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/nasa-m2020/Perseverance.glb',
        credit: 'Model credit NASA / JPL-Caltech',
    },
    'M2020 Helicopter': {
        url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/nasa-m2020/Ingenuity.glb',
        credit: 'Model credit NASA / JPL-Caltech',
    },
    'Gelatinous Cube': {
        url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/gelatinous-cube/scene.gltf',
        credit: 'Model by "glenatron" on Sketchfab.',
        rotation: [0, - Math.PI / 8, 0.0],
        opacityToTransmission: true,
        bounces: 8,
        postProcess(model) {

            const toRemove = [];
            model.traverse(c => {

                if (c.material) {

                    if (c.material instanceof MeshPhysicalMaterial) {

                        const material = c.material;
                        material.roughness *= 0.1;
                        material.metalness = 0.0;
                        material.ior = 1.2;
                        material.map = null;

                        c.geometry.computeVertexNormals();

                    } else if (c.material.opacity < 1.0) {

                        toRemove.push(c);

                    }

                }

            });

            toRemove.forEach(c => {

                c.parent.remove(c);

            });

        }
    },
    'Octopus Tea': {
        url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/octopus-tea/scene.gltf',
        credit: 'Model by "AzTiZ" on Sketchfab.',
        opacityToTransmission: true,
        bounces: 8,
        postProcess(model) {

            const toRemove = [];
            model.traverse(c => {

                if (c.material) {

                    if (c.material instanceof MeshPhysicalMaterial) {

                        const material = c.material;
                        material.metalness = 0.0;
                        if (material.transmission === 1.0) {

                            material.roughness = 0.0;
                            material.metalness = 0.0;

                            // 29 === glass
                            // 27 === liquid top
                            // 23 === liquid
                            if (c.name.includes('29')) {

                                c.geometry.index.array.reverse();
                                material.ior = 1.52;
                                material.color.set(0xffffff);

                            } else {

                                material.ior = 1.2;

                            }

                        }

                    } else if (c.material.opacity < 1.0) {

                        toRemove.push(c);

                    }

                }

            });

            toRemove.forEach(c => {

                c.parent.remove(c);

            });

        }
    },
    'Scifi Toad': {
        url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/scifi-toad/scene.gltf',
        credit: 'Model by "YuryTheCreator" on Sketchfab.',
        opacityToTransmission: true,
        bounces: 8,
        postProcess(model) {

            model.traverse(c => {

                if (c.material && c.material instanceof MeshPhysicalMaterial) {

                    const material = c.material;
                    material.metalness = 0.0;
                    material.roughness = 0.005;
                    material.ior = 1.645;
                    material.color.lerp(new Color(0xffffff), 0.65);

                }

            });

        }
    },
    'Halo Twist Ring': {
        url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/ring-twist-halo/scene.glb',
        credit: 'Model credit NASA / JPL-Caltech',
        opacityToTransmission: true,
        bounces: 15,
        postProcess(model) {

            model.traverse(c => {

                if (c.material) {

                    if (c.material instanceof MeshPhysicalMaterial) {

                        if (c.material.transmission === 1.0) {

                            const material = c.material;
                            material.roughness *= 0.1;
                            material.metalness = 0.0;
                            material.ior = 1.8;
                            material.color.set(0xffffff);

                        } else {

                            c.material.roughness *= 0.1;

                        }

                    }

                }

            });

        }
    },
    'Damaged Helmet': {
        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF/DamagedHelmet.gltf',
        credit: 'glTF Sample Model.',
    },
    'Flight Helmet': {
        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/FlightHelmet/glTF/FlightHelmet.gltf',
        credit: 'glTF Sample Model.',
    },
    'Statue': {
        url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Le_Transi_De_Rene_De_Chalon.glb',
        credit: 'Model courtesy of threedscans.com.',
    },
    'Crab Sculpture': {
        url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Elbow_Crab.glb',
        rotation: [3.1 * Math.PI / 4, Math.PI, 0],
        credit: 'Model courtesy of threedscans.com.',
    },
    // 'Astraia': {
    // 	url: 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/astraia/scene.gltf',
    // 	credit: 'Model by "Quentin Otani" on Sketchfab',
    // 	removeEmission: true,
    // 	postProcess( model ) {

    // 		const toRemove = [];
    // 		model.traverse( c => {

    // 			if ( c.name.includes( 'ROND' ) ) {

    // 				toRemove.push( c );

    // 			}

    // 		} );

    // 		toRemove.forEach( c => {

    // 			c.parent.remove( c );

    // 		} );

    // 	}
    // },

};

let initialModel = Object.keys(models)[1];
// if (window.location.hash) {

//     const modelName = window.location.hash.substring(1).replaceAll('%20', ' ');
//     if (modelName in models) {

//         initialModel = modelName;

//     }

// }

const params = {

    acesToneMapping: true,
    resolutionScale: 1 / window.devicePixelRatio,
    tilesX: 2,
    tilesY: 2,
    samplesPerFrame: 1,

    model: initialModel,

    environment: 'ENVMAP',
    envMap: envMaps['Royal Esplanade'],

    gradientTop: '#bfd8ff',
    gradientBottom: '#ffffff',

    environmentIntensity: 3.0,
    environmentBlur: 0.35,

    backgroundType: 'Gradient',
    bgGradientTop: '#111111',
    bgGradientBottom: '#000000',

    enable: true,
    bounces: 3,

    floorColor: '#080808',
    floorEnabled: true,
    floorRoughness: 0.1,
    floorMetalness: 0.0

};

let creditEl, loadingEl, samplesEl;
let floorPlane, gui, stats, sceneInfo;
let renderer, camera, ptRenderer, fsQuad, controls, scene;
let loadingModel = false;
let delaySamples = 0;



async function init() {

    creditEl = document.getElementById('credits');
    loadingEl = document.getElementById('loading');
    samplesEl = document.getElementById('samples');

    renderer = new WebGLRenderer({ antialias: true });
    renderer.outputEncoding = sRGBEncoding;
    renderer.toneMapping = ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    scene = new Scene();

    camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.025, 500);
    camera.position.set(- 1, 0.25, 1);

    ptRenderer = new PathTracingRenderer(renderer);
    ptRenderer.camera = camera;
    ptRenderer.material = new PhysicalPathTracingMaterial();
    ptRenderer.tiles.set(params.tiles, params.tiles);
    ptRenderer.material.setDefine('GRADIENT_BG', 1);
    ptRenderer.material.bgGradientTop.set(params.bgGradientTop);
    ptRenderer.material.bgGradientBottom.set(params.bgGradientBottom);

    fsQuad = new FullScreenQuad(new MeshBasicMaterial({
        map: ptRenderer.target.texture,
        transparent: true,
    }));

    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    controls.addEventListener('change', () => {

        if (params.tilesX * params.tilesY !== 1.0) {

            delaySamples = 1;

        }

        ptRenderer.reset();

    });

    const floorTex = generateRadialFloorTexture(2048);
    floorPlane = new Mesh(
        new PlaneBufferGeometry(),
        new MeshStandardMaterial({
            map: floorTex,
            transparent: true,
            color: 0x080808,
            roughness: 0.1,
            metalness: 0.0
        })
    );
    floorPlane.scale.setScalar(3);
    floorPlane.rotation.x = - Math.PI / 2;

    stats = new Stats();
    document.body.appendChild(stats.dom);
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = ACESFilmicToneMapping;
    ptRenderer.material.setDefine('GRADIENT_BG', 1);
    scene.background = new Color(0x060606);
    ptRenderer.tiles.set(params.tilesX, params.tilesY);

    updateModel();
    updateEnvMap();
    onResize();

    animate();

    window.addEventListener('resize', onResize);

}

function animate() {

    requestAnimationFrame(animate);

    stats.update();

    if (loadingModel) {

        return;

    }

    if (ptRenderer.samples < 1.0 || !params.enable) {

        renderer.render(scene, camera);

    }

    if (params.enable && delaySamples === 0) {

        const samples = Math.floor(ptRenderer.samples);
        samplesEl.innerText = `samples: ${samples}`;

        ptRenderer.material.materials.updateFrom(sceneInfo.materials, sceneInfo.textures);
        ptRenderer.material.filterGlossyFactor = params.filterGlossyFactor;
        ptRenderer.material.environmentBlur = params.environmentBlur;
        ptRenderer.material.environmentIntensity = params.environmentIntensity;
        ptRenderer.material.bounces = params.bounces;
        ptRenderer.material.physicalCamera.updateFrom(camera);

        camera.updateMatrixWorld();

        for (let i = 0, l = params.samplesPerFrame; i < l; i++) {

            ptRenderer.update();

        }

        renderer.autoClear = false;
        fsQuad.render(renderer);
        renderer.autoClear = true;

    } else if (delaySamples > 0) {

        delaySamples--;

    }

    samplesEl.innerText = `Samples: ${Math.floor(ptRenderer.samples)}`;

}

function onResize() {

    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = params.resolutionScale;
    const dpr = window.devicePixelRatio;

    ptRenderer.target.setSize(w * scale * dpr, h * scale * dpr);
    ptRenderer.reset();

    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio * scale);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

}

function buildGui() {

    if (gui) {

        gui.destroy();

    }

    gui = new GUI();

    gui.add(params, 'model', Object.keys(models)).onChange(updateModel);

    const resolutionFolder = gui.addFolder('resolution');
    resolutionFolder.add(params, 'resolutionScale', 0.1, 1.0, 0.01).onChange(() => {

        onResize();

    });
    resolutionFolder.add(params, 'samplesPerFrame', 1, 10, 1);
    resolutionFolder.add(params, 'tilesX', 1, 10, 1).onChange(v => {

        ptRenderer.tiles.x = v;

    });
    resolutionFolder.add(params, 'tilesY', 1, 10, 1).onChange(v => {

        ptRenderer.tiles.y = v;

    });
    resolutionFolder.open();

    const environmentFolder = gui.addFolder('environment');
    environmentFolder.add(params, 'envMap', envMaps).name('map').onChange(updateEnvMap);
    environmentFolder.add(params, 'environmentBlur', 0.0, 1.0, 0.01).onChange(v => {

        ptRenderer.material.environmentBlur = parseFloat(v);
        ptRenderer.reset();

    }).name('env map blur');
    environmentFolder.add(params, 'environmentIntensity', 0.0, 10.0, 0.01).onChange(v => {

        ptRenderer.material.environmentIntensity = parseFloat(v);
        ptRenderer.reset();

    }).name('intensity');
    environmentFolder.open();

    const backgroundFolder = gui.addFolder('background');
    backgroundFolder.add(params, 'backgroundType', ['Environment', 'Gradient']).onChange(v => {

        ptRenderer.material.setDefine('GRADIENT_BG', Number(v === 'Gradient'));
        if (v === 'Gradient') {

            scene.background = new Color(0x060606);

        } else {

            scene.background = scene.environment;

        }

        ptRenderer.reset();

    });
    backgroundFolder.addColor(params, 'bgGradientTop').onChange(v => {

        ptRenderer.material.uniforms.bgGradientTop.value.set(v);
        ptRenderer.reset();

    });
    backgroundFolder.addColor(params, 'bgGradientBottom').onChange(v => {

        ptRenderer.material.uniforms.bgGradientBottom.value.set(v);
        ptRenderer.reset();

    });
    backgroundFolder.open();

    const floorFolder = gui.addFolder('floor');
    floorFolder.add(params, 'floorEnabled').onChange(v => {

        floorPlane.material.opacity = v ? 1 : 0;
        ptRenderer.reset();

    });
    floorFolder.addColor(params, 'floorColor').onChange(v => {

        floorPlane.material.color.set(v);
        ptRenderer.reset();

    });
    floorFolder.add(params, 'floorRoughness', 0, 1).onChange(v => {

        floorPlane.material.roughness = v;
        ptRenderer.reset();

    });
    floorFolder.add(params, 'floorMetalness', 0, 1).onChange(v => {

        floorPlane.material.metalness = v;
        ptRenderer.reset();

    });

    const pathTracingFolder = gui.addFolder('path tracing');
    pathTracingFolder.add(params, 'enable');
    pathTracingFolder.add(params, 'acesToneMapping').onChange(v => {

        renderer.toneMapping = v ? ACESFilmicToneMapping : NoToneMapping;
        fsQuad.material.needsUpdate = true;

    });
    pathTracingFolder.add(params, 'bounces', 1, 20, 1).onChange(() => {

        ptRenderer.reset();

    });
    pathTracingFolder.open();

}

function updateEnvMap() {

    new RGBELoader()
        .load(params.envMap, texture => {

            if (ptRenderer.material.environmentMap) {

                ptRenderer.material.environmentMap.dispose();
                scene.environment.dispose();

            }

            const pmremGenerator = new PMREMGenerator(renderer);
            const envMap = pmremGenerator.fromEquirectangular(texture);

            texture.mapping = EquirectangularReflectionMapping;
            ptRenderer.material.environmentIntensity = parseFloat(params.environmentIntensity);
            ptRenderer.material.environmentMap = envMap.texture;
            scene.environment = texture;
            if (params.backgroundType !== 'Gradient') {

                scene.background = texture;

            }

            ptRenderer.reset();

        });

}

function convertOpacityToTransmission(model) {

    model.traverse(c => {

        if (c.material) {

            const material = c.material;
            if (material.opacity < 0.65 && material.opacity > 0.2) {

                const newMaterial = new MeshPhysicalMaterial();
                for (const key in material) {

                    if (key in material) {

                        if (material[key] === null) {

                            continue;

                        }

                        if (material[key].isTexture) {

                            newMaterial[key] = material[key];

                        } else if (material[key].copy && material[key].constructor === newMaterial[key].constructor) {

                            newMaterial[key].copy(material[key]);

                        } else if ((typeof material[key]) === 'number') {

                            newMaterial[key] = material[key];

                        }

                    }

                }

                newMaterial.opacity = 1.0;
                newMaterial.transmission = 1.0;
                c.material = newMaterial;

            }

        }

    });

}

async function updateModel() {

    if (gui) {

        gui.destroy();
        gui = null;

    }

    let model;
    const manager = new LoadingManager();
    const modelInfo = models[params.model];

    loadingModel = true;
    renderer.domElement.style.visibility = 'hidden';
    samplesEl.innerText = '--';
    creditEl.innerText = '--';
    loadingEl.innerText = 'Loading';
    loadingEl.style.visibility = 'visible';
    console.log({ modelInfo })
    scene.traverse(c => {

        if (c.material) {

            const material = c.material;
            for (const key in material) {

                if (material[key] && material[key].isTexture) {

                    material[key].dispose();

                }

            }

        }

    });

    if (sceneInfo) {

        scene.remove(sceneInfo.scene);

    }


    const onFinish = async () => {

        if (modelInfo.removeEmission) {

            model.traverse(c => {

                if (c.material) {

                    c.material.emissiveMap = null;
                    c.material.emissiveIntensity = 0;

                }

            });

        }

        if (modelInfo.opacityToTransmission) {

            convertOpacityToTransmission(model);

        }

        model.traverse(c => {

            if (c.material) {

                c.material.side = DoubleSide;

            }

        });

        if (modelInfo.postProcess) {

            modelInfo.postProcess(model);

        }

        // center the model
        const box = new Box3();
        box.setFromObject(model);
        model.position
            .addScaledVector(box.min, - 0.5)
            .addScaledVector(box.max, - 0.5);

        const sphere = new Sphere();
        box.getBoundingSphere(sphere);

        model.scale.setScalar(1 / sphere.radius);
        model.position.multiplyScalar(1 / sphere.radius);

        box.setFromObject(model);

        // rotate model after so it doesn't affect the bounding sphere scale
        if (modelInfo.rotation) {

            model.rotation.set(...modelInfo.rotation);

        }

        model.updateMatrixWorld();

        const group = new Group();
        floorPlane.position.y = box.min.y;
        group.add(model, floorPlane);

        const reducer = new MaterialReducer();
        reducer.process(group);
        console.log("Reached onFinish , Before bvh genration")
        const generator = new PathTracingSceneWorker();
        console.log(generator)
        const result = await generator.generate(group, {
            onProgress: v => {

                const percent = Math.floor(100 * v);
                loadingEl.innerText = `Building BVH : ${percent}%`;
                console.log('BVH', percent)
            }
        });
        console.log("After bvh")
        sceneInfo = result;
        scene.add(sceneInfo.scene);

        const { bvh, textures, materials } = result;
        const geometry = bvh.geometry;
        const material = ptRenderer.material;

        material.bvh.updateFrom(bvh);
        material.normalAttribute.updateFrom(geometry.attributes.normal);
        material.tangentAttribute.updateFrom(geometry.attributes.tangent);
        material.uvAttribute.updateFrom(geometry.attributes.uv);
        material.materialIndexAttribute.updateFrom(geometry.attributes.materialIndex);
        material.textures.setTextures(renderer, 2048, 2048, textures);
        material.materials.updateFrom(materials, textures);
        material.setDefine('MATERIAL_LENGTH', materials.length);

        generator.dispose();

        loadingEl.style.visibility = 'hidden';

        creditEl.innerHTML = modelInfo.credit || '';
        creditEl.style.visibility = modelInfo.credit ? 'visible' : 'hidden';
        params.bounces = modelInfo.bounces || 3;
        buildGui();

        loadingModel = false;
        renderer.domElement.style.visibility = 'visible';

        ptRenderer.reset();

    };

    const url = modelInfo.url;
    if (/(gltf|glb)$/i.test(url)) {

        manager.onLoad = onFinish;
        new GLTFLoader(manager)
            .setMeshoptDecoder(MeshoptDecoder)
            .load(
                url,
                gltf => {

                    model = gltf.scene;

                },
                progress => {

                    if (progress.total !== 0 && progress.total >= progress.loaded) {

                        const percent = Math.floor(100 * progress.loaded / progress.total);
                        loadingEl.innerText = `Loading : ${percent}%`;

                    }

                },
            );

    } else if (/mpd$/i.test(url)) {

        manager.onProgress = (url, loaded, total) => {

            const percent = Math.floor(100 * loaded / total);
            loadingEl.innerText = `Loading : ${percent}%`;

        };

        const loader = new LDrawLoader(manager);
        await loader.preloadMaterials('https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/colors/ldcfgalt.ldr');
        loader
            .setPartsLibraryPath('https://raw.githubusercontent.com/gkjohnson/ldraw-parts-library/master/complete/ldraw/')
            .load(
                url,
                result => {

                    model = LDrawUtils.mergeObject(result);
                    model.rotation.set(Math.PI, 0, 0);
                    model.traverse(c => {

                        if (c.isLineSegments) {

                            c.visible = false;

                        }

                        if (c.isMesh) {

                            c.material.roughness *= 0.01;

                        }

                    });
                    onFinish();

                },
            );

    }

}

init();