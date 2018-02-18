'use strict';

const MINIMUM_POSITION = 0;
const MAXIMUM_POSITION = 100;
const POSITION_RANGE = MAXIMUM_POSITION - MINIMUM_POSITION;

// Shutter motion model: a simple model of a shutter or blind's physical position based on up, down and stop inputs.
function MotionModel(travelTimeMs) {
	this.travelTime = travelTimeMs;

	this._currentPosition = MINIMUM_POSITION;
	this._currentState = 'STOPPED';
}

// Returns `true` if _updated was changed.
MotionModel.prototype.updateCurrentStateAndPosition = function () {
	if (this._currentState == 'STOPPED') return false;

	const now = Date.now();
	const duration = now - this._updated;
	const positionDelta = duration / this.travelTime * POSITION_RANGE;
	this._updated = now;

	switch (this._currentState) {
		case 'INCREASING': {
			const position = this._currentPosition + positionDelta;
			if (position < MAXIMUM_POSITION) {
				this._currentPosition = position;
			} else {
				this._currentState = 'STOPPED';
				this._currentPosition = MAXIMUM_POSITION;
			}
			break;
		}
		case 'DECREASING': {
			const position = this._currentPosition - positionDelta;
			if (position > MINIMUM_POSITION) {
				this._currentPosition = position;
			} else {
				this._currentState = 'STOPPED';
				this._currentPosition = MINIMUM_POSITION;
			}
			break;
		}
		default:
			console.log('Invalid state ', this._currentState);
	}

	return true;
};

MotionModel.prototype.getCurrentPosition = function () {
	this.updateCurrentStateAndPosition();
	return this._currentPosition;
};

MotionModel.prototype.setCurrentPosition = function (newPosition) {
	this._currentPosition = newPosition;
	this._updated = Date.now();
};

MotionModel.prototype.getCurrentState = function () {
	this.updateCurrentStateAndPosition();
	return this._currentState;
};

MotionModel.prototype.setCurrentState = function (newState) {
	if (this._currentState == newState) return;

	if (this._currentState != 'STOPPED') {
		this.updateCurrentStateAndPosition();
	}

	this._updated = Date.now();

	switch (newState) {
		case 'INCREASING':
			if (this._currentPosition >= MAXIMUM_POSITION) return;
			break;
		case 'DECREASING':
			if (this._currentPosition <= MINIMUM_POSITION) return;
			break;
		case 'STOPPED':
			break;
		default:
			console.log('Invalid state ', newState);
			return;
	}

	this._currentState = newState;
};

module.exports = MotionModel;
