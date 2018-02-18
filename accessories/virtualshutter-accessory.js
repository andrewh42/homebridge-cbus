'use strict';

const DEFAULT_TRAVEL_TIME = 60000;	// (ms)
const MOTION_UPDATE_INTERVAL = 500;	// (ms) how often to update HomeKit during shutter motion

let Service;
let Characteristic;
let CBusAccessory;
let uuid;

const ms = require('ms');

const cbusUtils = require('../lib/cbus-utils');
const CBusNetId = require('../lib/cbus-netid.js');
const MotionSimulator = require('../lib/shutter-motion').Motion;

const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _accessory, _uuid) {
	Service = _service;
	Characteristic = _characteristic;
	CBusAccessory = _accessory;
	uuid = _uuid;

	return CBusVirtualShutterAccessory;
};

// { upId: <number>, travelTime: <number> }
function CBusVirtualShutterAccessory(platform, accessoryData) {
	//--------------------------------------------------
	// initialize the parent
	CBusAccessory.call(this, platform, accessoryData);

	this.downRelayNetId = this.netId;
	{
		let upGroupAddress;
		try {
			upGroupAddress = cbusUtils.integerise(accessoryData.upId);
		} catch (err) {
			throw new Error(`upId '${accessoryData.upId}' for accessory '${this.name} is not an integer`);
		}

		this.upRelayNetId = new CBusNetId(
			platform.project,
			accessoryData.network || platform.client.network,
			accessoryData.application || platform.client.application,
			upGroupAddress
		);
	}

	//--------------------------------------------------
	// state variables

	this.simulatedShutter = new MotionSimulator(this.ms(travelTime) || DEFAULT_TRAVEL_TIME);

	//
	// TODO - listen for starts and stops on simulatedShutter and forward to c-bus
	//

	//--------------------------------------------------
	// register the Window Covering service
	this.service = this.addService(new Service.WindowCovering(this.name));

	// the current position (0-100%)
	// https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L3211
	this.service.getCharacteristic(Characteristic.CurrentPosition)
		.on('get', this.getCurrentPosition.bind(this));

	// the target position (0-100%)
	// https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L3212
	this.service.getCharacteristic(Characteristic.TargetPosition)
		.on('get', this.getTargetPosition.bind(this))
		.on('set', this.setTargetPosition.bind(this));

	// the position state
	// 0 = DECREASING; 1 = INCREASING; 2 = STOPPED;
	// https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js#L3213
	this.service.getCharacteristic(Characteristic.PositionState)
		.on('get', this.getPositionState.bind(this));
}

// Override the default single-netId implementation in Accessory
CBusAccessory.prototype.getNetIds = function () {
	return [this.downRelayNetId, this.upRelayNetId];
};

CBusShutterAccessory.prototype.getCurrentPosition = function (callback) {
	const currentPosition = Math.round(this.simulatedShutter.getCurrentPosition());
	this._log(FILE_ID, `getCurrentPosition`, currentPosition);
	callback(false, /* value */ currentPosition);
};

function stringToPositionStateCharacteristic(state) {
	switch (this.simulatedShutter.getCurrentPosition()) {
		case 'INCREASING':
			return Characteristic.PositionState.INCREASING;
		case 'DECREASING':
			return Characteristic.PositionState.DECREASING;
		case 'STOPPED':
		default:
			return Characteristic.PositionState.STOPPED;
	}
}

CBusShutterAccessory.prototype.getPositionState = function (callback) {
	const positionState = stringToPositionStateCharacteristic(this.simulatedShutter.getCurrentPosition());
	this._log(FILE_ID, `getPositionState`, positionState);
	callback(false, positionState);
};

CBusShutterAccessory.prototype.getTargetPosition = function (callback) {
	const targetPosition = this.simulatedShutter.getTargetPosition();
	this._log(FILE_ID, `getTargetPosition`, targetPosition);
	callback(false, targetPosition);
};

CBusShutterAccessory.prototype.setTargetPosition = function (newPosition, callback, context) {
	// context helps us avoid a never-ending loop
	if (context === `event`) {
		// this._log(FILE_ID, 'suppressing remote setTargetPosition');
		callback();
		return;
	}

	this._log(FILE_ID, `setTargetPosition`, `${newPosition} (was ${this.simulatedShutter.getTargetPosition()})`);

	this.simulatedShutter.setTargetPosition(newPosition);

	const interval = setInterval(() => {
		const positionState = stringToPositionStateCharacteristic(this.simulatedShutter.getCurrentPosition());
		this.service.setCharacteristic(Characteristic.PositionState, positionState);
		this.service.setCharacteristic(Characteristic.CurrentPosition, this.simulatedShutter.getTargetPosition());

		if (positionState == Characteristic.PositionState.STOPPED) {
			// finished
			clearInterval(interval);
		}
	}, MOTION_UPDATE_INTERVAL);
};

// CBusShutterAccessory.prototype.processClientData = function (err, message) {
// 	if (!err) {
// 		const level = message.level;
// 		const translated = this.translateShutterToProportional(level);

// 		if (typeof translated === `undefined`) {
// 			this._log(FILE_ID, `processClientData`, `indeterminate`);

// 			// could be a bit smarter here
// 			this.cachedTargetPosition = 0;
// 		} else {
// 			this._log(FILE_ID, `processClientData`, `received ${translated}%`);

// 			if (this.cachedTargetPosition !== translated) {
// 				this.service.getCharacteristic(Characteristic.TargetPosition).setValue(translated, undefined, `event`);

// 				//  move over 2 seconds
// 				setTimeout(() => {
// 					this.cachedTargetPosition = translated;

// 					// in many cases the shutter will still be travelling for a while, but unless/until we
// 					// simulate the shutter relay, we won't know when it has stopped.
// 					// so just assume it gets there immediately.
// 					this.service.getCharacteristic(Characteristic.CurrentPosition)
// 						.setValue(this.cachedTargetPosition, undefined, `event`);
// 					this.service.getCharacteristic(Characteristic.PositionState)
// 						.setValue(Characteristic.PositionState.STOPPED, undefined, `event`);
// 				}, SPIN_TIME);
// 			}
// 		}
// 	}
// };
