'use strict';

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
	if (delta > 0) {
		if (this.model.getCurrentState() !== 'INCREASING') {
			this.increaseCommand(scheduleStopCommand);
		} else {
			scheduleStopCommand();
		}
	} else {
		if (this.model.getCurrentState() !== 'DECREASING') {
			this.decreaseCommand(scheduleStopCommand);
		} else {
			scheduleStopCommand();
		}
	}
};

module.exports = MotionControl;
