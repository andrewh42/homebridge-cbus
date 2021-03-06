'use strict';

const assert = require('assert').strict;

// Shutter motion control: emits up, down and stop outputs to achieve a target position.
function MotionControl({ model, increaseCommand, decreaseCommand, stopCommand }) {
	this.model = model;
	this.increaseCommand = increaseCommand;
	this.decreaseCommand = decreaseCommand;
	this.stopCommand = stopCommand;

	this._targetPosition = model.getCurrentPosition();
}

MotionControl.prototype.getTargetPosition = function () {
	return this._targetPosition;
};

MotionControl.prototype.setTargetPosition = function (targetPosition) {
	this._targetPosition = targetPosition;
	if (this._stopTimeout) {
		clearTimeout(this._stopTimeout);
		this._stopTimeout = undefined;
	}

	const delta = this._targetPosition - this.model.getCurrentPosition();
	const absDelta = Math.abs(delta);
	if (absDelta < 1) {
		if (this.model.getCurrentState != 'STOPPED') {
			this.stopCommand();
		}
		return;
	}

	const scheduleStopCommand = () => {
		const duration = absDelta / this.model.speed;

		this._stopTimeout = setTimeout(() => {
			this.stopCommand();
			this._stopTimeout = undefined;
		}, duration);
	};

	// determine how to get to target position
	const desiredState = delta > 0 ? 'INCREASING' : 'DECREASING';
	if (this.model.getCurrentState() !== desiredState) {
		const correctiveCommand = delta > 0 ? this.increaseCommand : this.decreaseCommand;
		correctiveCommand(scheduleStopCommand);
	} else {
		scheduleStopCommand(); // we're already moving in the appropriate direction
	}
};

MotionControl.prototype.syncTargetPositionWithCurrentPosition = function () {
	assert.ok(this.model.getCurrentState() == 'STOPPED', "sync when in motion not supported");

	this.setTargetPosition(this.model.getCurrentPosition());
}

module.exports = MotionControl;
