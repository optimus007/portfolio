import {
	Euler,
	EventDispatcher,
	MathUtils,
	Quaternion,
	Vector3
} from '../../../build/three.module.js';

const _zee = new Vector3(0, 0, 1);
const _euler = new Euler();
const _q0 = new Quaternion();
const _q1 = new Quaternion(- Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

const _changeEvent = { type: 'change' };

class DeviceOrientationControls extends EventDispatcher {

	constructor(object) {

		super();

		if (window.isSecureContext === false) {

			console.error('THREE.DeviceOrientationControls: DeviceOrientationEvent is only available in secure contexts (https)');

		}

		const scope = this;

		const EPS = 0.000001;
		const lastQuaternion = new Quaternion();

		this.object = object;
		this.object.rotation.reorder('YXZ');

		this.enabled = true;

		this.deviceOrientation = {};
		this.screenOrientation = 0;

		this.alphaOffset = 0; // radians
		this.betaOffset = 0; // radians
		this.gammaOffset = 0; // radians

		this.AlphaEnabled = true
		this.BetaEnabled = true
		this.GammaEnabled = true

		this.alpha = 0
		this.beta = 0
		this.gamma = 0

		const onDeviceOrientationChangeEvent = function (event) {

			scope.deviceOrientation = event;

		};

		const onScreenOrientationChangeEvent = function () {

			scope.screenOrientation = window.orientation || 0;

		};

		// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

		const setObjectQuaternion = function (quaternion, alpha, beta, gamma, orient) {

			_euler.set(beta, alpha, - gamma, 'YXZ'); // 'ZXY' for the device, but 'YXZ' for us

			quaternion.setFromEuler(_euler); // orient the device

			quaternion.multiply(_q1); // camera looks out the back of the device, not the top

			quaternion.multiply(_q0.setFromAxisAngle(_zee, - orient)); // adjust for screen orientation

		};

		this.connect = function () {

			onScreenOrientationChangeEvent(); // run once on load

			// iOS 13+

			if (window.DeviceOrientationEvent !== undefined && typeof window.DeviceOrientationEvent.requestPermission === 'function') {

				window.DeviceOrientationEvent.requestPermission().then(function (response) {

					if (response == 'granted') {

						window.addEventListener('orientationchange', onScreenOrientationChangeEvent);
						window.addEventListener('deviceorientation', onDeviceOrientationChangeEvent);

					}

				}).catch(function (error) {

					console.error('THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:', error);

				});

			} else {

				window.addEventListener('orientationchange', onScreenOrientationChangeEvent);
				window.addEventListener('deviceorientation', onDeviceOrientationChangeEvent);

			}

			scope.enabled = true;

		};

		this.disconnect = function () {

			window.removeEventListener('orientationchange', onScreenOrientationChangeEvent);
			window.removeEventListener('deviceorientation', onDeviceOrientationChangeEvent);

			scope.enabled = false;

		};

		this.update = function () {

			if (scope.enabled === false) return;

			const device = scope.deviceOrientation;

			if (device) {

				let alpha = device.alpha ? MathUtils.degToRad(device.alpha) + scope.alphaOffset : 0; // Z
				alpha = MathUtils.mapLinear(alpha, 0, 360, -180, 180)

				let beta = device.beta ? MathUtils.degToRad(device.beta) + scope.betaOffset : 0; // X'

				let gamma = device.gamma ? MathUtils.degToRad(device.gamma) + scope.gammaOffset : 0; // Y''

				if (!this.AlphaEnabled) {
					alpha = 0
				}
				if (!this.BetaEnabled) {
					beta = 0
				}
				if (!this.GammaEnabled) {
					gamma = 0
				}

				const orient = scope.screenOrientation ? MathUtils.degToRad(scope.screenOrientation) : 0; // O
				this.alpha = device.alpha ? device.alpha : 0
				this.beta = device.beta ? device.beta : 0
				this.gamma = device.gamma ? device.gamma : 0
				setObjectQuaternion(scope.object.quaternion, alpha, beta, gamma, orient);

				if (8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {

					lastQuaternion.copy(scope.object.quaternion);
					scope.dispatchEvent(_changeEvent);

				}

			}

		};

		this.dispose = function () {

			scope.disconnect();

		};

		this.connect();

	}

}

export { DeviceOrientationControls };
