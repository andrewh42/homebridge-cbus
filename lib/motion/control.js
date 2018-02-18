'use strict';

const MINIMUM_POSITION = 0;
const MAXIMUM_POSITION = 100;
const POSITION_RANGE = MAXIMUM_POSITION - MINIMUM_POSITION;

// Shutter motion control: emits up, down and stop outputs to achieve a target position.
function MotionControl({ model, increaseCommand, decreaseCommand, stopCommand }) {
	this.model = model;
	this.increaseCommand = increaseCommand;
	this.decreaseCommand = decreaseCommand;
	this.stopCommand = stopCommand;
	this._targetPosition = MINIMUM_POSITION;
}

MotionControl.prototype.getTargetPosition = function () {
	return this._targetPosition;
};

MotionControl.prototype.setTargetPosition = function (targetPosition) {
	if (this._targetPosition == targetPosition) return;

	this._targetPosition = targetPosition;
	clearInterval(this._interval);

	const delta = this._targetPosition - this.model.getCurrentPosition();
	const absDelta = Math.abs(delta);
	if (absDelta < 1) {
		if (this.model.getCurrentState != 'STOPPED') {
			this.stopCommand();
		}
		return;
	}

	// determine how to get to target position
	if (delta > 0) {
		this.increaseCommand();
	} else {
		this.decreaseCommand();
	}

	const duration = absDelta / POSITION_RANGE * this.model.travelTime;
	this._interval = setInterval(() => {
		this._interval = undefined;
		this.stopCommand();
	}, duration);
};

module.exports = MotionControl;
