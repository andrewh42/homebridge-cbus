'use strict';

const DEFAULT_TRAVEL_TIME = 60000;	// (ms)
const MINIMUM_MOTION_UPDATE_INTERVAL = 250;	// (ms) the minimum HomeKit update interval during shutter motion

let Service;
let Characteristic;
let CBusAccessory;
let uuid;

const ms = require('ms');

const cbusUtils = require('../lib/cbus-utils');
const CBusNetId = require('../lib/cbus-netid.js');
const { MotionModel, MotionControl } = require('../lib/motion');

const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);
const log = require('debug')('cbus:accessory');

module.exports = function (_service, _characteristic, _accessory, _uuid) {
	Service = _service;
	Characteristic = _characteristic;
	CBusAccessory = _accessory;
	uuid = _uuid;

	return CBusVirtualShutterAccessory;
};

// { id: <close relay group address>, openId: <open relay group address>, travelTime: <travel time string> }
function CBusVirtualShutterAccessory(platform, accessoryData) {
	//--------------------------------------------------
	// initialize the parent
	CBusAccessory.call(this, platform, accessoryData);

	this.closeRelayNetId = this.netId;
	{
		let openGroupAddress;
		try {
			openGroupAddress = cbusUtils.integerise(accessoryData.openId);
		} catch (err) {
			throw new Error(`upId '${accessoryData.upId}' for accessory '${this.name} is not an integer`);
		}

		this.openRelayNetId = new CBusNetId(
			platform.project,
			accessoryData.network || platform.client.network,
			accessoryData.application || platform.client.application,
			openGroupAddress
		);
	}

	//--------------------------------------------------
	// state variables

	this.isOpenRelayOn = false;
	this.isCloseRelayOn = false;

	const travelTime = accessoryData.travelTime ? ms(accessoryData.travelTime) : DEFAULT_TRAVEL_TIME;
	const model = new MotionModel(travelTime);
	this.shutterModel = model;
	this.shutterControl = new MotionControl({
		model,
		increaseCommand: this.increasePositionCommand.bind(this),
		decreaseCommand: this.decreasePositionCommand.bind(this),
		stopCommand: this.stopCommand.bind(this),
	});

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
CBusVirtualShutterAccessory.prototype.getNetIds = function () {
	return [this.closeRelayNetId, this.openRelayNetId];
};

CBusVirtualShutterAccessory.prototype.getCurrentPosition = function (callback) {
	const currentPosition = Math.round(this.shutterModel.getCurrentPosition());
	this._log(FILE_ID, 'getCurrentPosition', currentPosition);
	callback(false, /* value */ currentPosition);
};

function stringToPositionStateCharacteristic(state) {
	switch (state) {
		case 'INCREASING':
			return Characteristic.PositionState.INCREASING;
		case 'DECREASING':
			return Characteristic.PositionState.DECREASING;
		case 'STOPPED':
		default:
			return Characteristic.PositionState.STOPPED;
	}
}

CBusVirtualShutterAccessory.prototype.getPositionState = function (callback) {
	const positionState = stringToPositionStateCharacteristic(this.shutterModel.getCurrentPosition());
	this._log(FILE_ID, 'getPositionState', positionState);
	callback(false, positionState);
};

CBusVirtualShutterAccessory.prototype.getTargetPosition = function (callback) {
	const targetPosition = this.shutterControl.getTargetPosition();
	this._log(FILE_ID, 'getTargetPosition', targetPosition);
	callback(false, targetPosition);
};

CBusVirtualShutterAccessory.prototype.setTargetPosition = function (newPosition, callback, context) {
	// context helps us avoid a never-ending loop
	if (context === 'event') {
		// this._log(FILE_ID, 'suppressing remote setTargetPosition');
		callback();
		return;
	}

	this._log(FILE_ID, 'setTargetPosition', `${newPosition} (was ${this.shutterControl.getTargetPosition()})`);

	this.shutterControl.setTargetPosition(newPosition);

	callback();
};

CBusVirtualShutterAccessory.prototype.increasePositionCommand = function (callback) {
	if (this.isOpenRelayOn) return;
	this.isOpenRelayOn = true;

	if (this.isCloseRelayOn) {
		this.client.turnOff(this.closeRelayNetId, () => {});
	}
	this.client.turnOn(this.openRelayNetId, callback);
};

CBusVirtualShutterAccessory.prototype.decreasePositionCommand = function (callback) {
	if (this.isCloseRelayOn) return;
	this.isCloseRelayOn = true;

	if (this.isOpenRelayOn) {
		this.client.turnOff(this.openRelayNetId, () => {});
	}
	this.client.turnOn(this.closeRelayNetId, callback);
};

CBusVirtualShutterAccessory.prototype.stopCommand = function () {
	if (this.isOpenRelayOn) {
		this.client.turnOff(this.openRelayNetId, () => {});
		this.isOpenRelayOn = false;
	}
	if (this.isCloseRelayOn) {
		this.client.turnOff(this.closeRelayNetId, () => {});
		this.isCloseRelayOn = false;
	}
};

CBusVirtualShutterAccessory.prototype.updateCurrentPositionCharacteristic = function () {
	const currentPosition = Math.round(this.shutterModel.getCurrentPosition());
	log(`${FILE_ID} updateCurrentPositionCharacteristic ${currentPosition}%`);
	this.service.setCharacteristic(Characteristic.CurrentPosition, currentPosition);
};

CBusVirtualShutterAccessory.prototype.updatePositionStateCharacteristic = function () {
	const currentState = this.shutterModel.getCurrentState();
	const positionState = stringToPositionStateCharacteristic(currentState);
	log(`${FILE_ID} updatePositionStateCharacteristic ${positionState} (${currentState})`);
	this.service.setCharacteristic(Characteristic.PositionState, positionState);
};

CBusVirtualShutterAccessory.prototype.processClientData = function (err, message) {
	if (err) return;

	console.assert(typeof message.level !== 'undefined', 'message.level must be defined');
	const isOn = message.level > 0;

	let newState;
	if (message.netId.isEquals(this.openRelayNetId)) {
		newState = isOn ? 'INCREASING' : 'STOPPED';
		this.isOpenRelayOn = isOn;
	} else if (message.netId.isEquals(this.closeRelayNetId)) {
		newState = isOn ? 'DECREASING' : 'STOPPED';
		this.isCloseRelayOn = isOn;
	} else {
		log(FILE_ID, 'processClientData', `misdirected message for netId ${message.netId} (open = ${this.openRelayNetId}, close = ${this.closeRelayNetId})`);
		return;
	}

	const oldState = this.shutterModel.getCurrentState();
	this.shutterModel.setCurrentState(newState);

	log(`${FILE_ID} processClientData state change: ${oldState} -> ${newState}`);

	if (oldState != newState) {
		if (oldState == 'STOPPED') {
			log(`${FILE_ID} processClientData starting state updates`);
			this.updatePositionStateCharacteristic();

			// regularly give HomeKit the updated current position - ideally percentage by percentage
			const updateInterval = Math.max(MINIMUM_MOTION_UPDATE_INTERVAL, this.shutterModel.travelTime / 100);
			this.updateStateCharacteristicsInterval = setInterval(() => { this.updateCurrentPositionCharacteristic() }, updateInterval);
		}
	}
	if (newState == 'STOPPED' && this.updateStateCharacteristicsInterval) {
		this.updateCurrentPositionCharacteristic();
		this.updatePositionStateCharacteristic();

		log(`${FILE_ID} processClientData stopping state updates`);
		clearInterval(this.updateStateCharacteristicsInterval);
		this.updateStateCharacteristicsInterval = undefined;
	}

	// TODO: resolve simultaneous isCloseRelayOn and isOpenRelayOn
};
