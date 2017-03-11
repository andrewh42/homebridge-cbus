'use strict';

let Service;
let Characteristic;
let CBusAccessory;
let uuid;

const chalk = require('chalk');

const cbusUtils = require('../lib/cbus-utils.js');

const FILE_ID = cbusUtils.extractIdentifierFromFileName(__filename);

module.exports = function (_service, _characteristic, _accessory, _uuid) {
	Service = _service;
	Characteristic = _characteristic;
	CBusAccessory = _accessory;
	uuid = _uuid;

	return CBusLightAccessory;
};

function CBusLightAccessory(platform, accessoryData) {
	//--------------------------------------------------
	//  Initialize the parent
	//--------------------------------------------------
	CBusAccessory.call(this, platform, accessoryData);

	//--------------------------------------------------
	//  State variable
	//--------------------------------------------------
	this.currentState = 0;	// TODO how do we prime this?

	//--------------------------------------------------
	//  Register the on-off service
	//--------------------------------------------------
	this.service = this.addService(new Service.Lightbulb(this.name));
	this.service.getCharacteristic(Characteristic.On)
		.on('get', this.getOn.bind(this))
		.on('set', this.setOn.bind(this));
}

CBusLightAccessory.prototype.getOn = function (callback /* , context */) {
	setTimeout(function () {
		this.client.receiveLevel(this.netId, function (message) {
			this.currentState = message.level;
			this._log(FILE_ID, `receiveLevel returned ${message.level}`);
			callback(false, this.currentState > 0);
		}.bind(this));
	}.bind(this), 50);
};

CBusLightAccessory.prototype.setOn = function (turnOn, callback, context) {
	// context helps us avoid a never-ending loop
	if (context === `event`) {
		// this._log(SCRIPT_NAME, `ignoring setOn 'event'`);
		callback();
	} else {
		const isOn = this.currentState > 0;

		if (isOn === turnOn) {
			this._log(FILE_ID, `setOn: no state change from ${this.currentState}%`);
			callback();
		} else {
			const oldLevel = this.currentState;
			const newLevel = turnOn ? 100 : 0;
			this.currentState = newLevel;
			this._log(FILE_ID, `setOn changing level to ${newLevel}% ` + chalk.dim(`from ${oldLevel}%`));
			this.client.setBrightness(this.netId, newLevel, function () {
				callback();
			});
		}
	}
};

CBusLightAccessory.prototype.processClientData = function (message) {
	console.assert(typeof message.level !== `undefined`, `message.level must not be undefined`);
	const level = message.level;

	this.service.getCharacteristic(Characteristic.On)
	.setValue(level > 0, undefined, `event`);
};
