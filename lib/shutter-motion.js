'use strict';

const MINIMUM_POSITION = 0;
const MAXIMUM_POSITION = 100;
const POSITION_RANGE = MAXIMUM_POSITION - MINIMUM_POSITION;

// Constructor
function Motion(travelTimeMs) {
	this.travelTime = travelTimeMs;

	this._currentPosition = 0;
	this._currentState = 'STOPPED';
	this._targetPosition = 0;
}


// Returns `true` if _updated was changed.
Motion.prototype.updateCurrentStateAndPosition = function () {
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

Motion.prototype.getCurrentPosition = function () {
	this.updateCurrentStateAndPosition();
	return this._currentPosition;
};

Motion.prototype.getCurrentState = function () {
	this.updateCurrentStateAndPosition();
	return this._currentState;
};

Motion.prototype.setCurrentState = function (newState) {
	if (this._currentState == newState) return;

	if (!this.updateCurrentStateAndPosition()) {
		this._updated = Date.now();
	}

	switch (newState) {
		case 'STOPPED':
		case 'INCREASING':
		case 'DECREASING':
			this._currentState = newState;
			break;
		default:
			console.log('Invalid state ', newState);
	}

	this.cancelTimeout();	// prevent conflicts between targetPosition and state-based control
};

Motion.prototype.getTargetPosition = function () {
	return this._targetPosition;
};

Motion.prototype.setTargetPosition = function (targetPosition) {
	this._targetPosition = targetPosition;

	this.updateCurrentStateAndPosition();

	const delta = Math.abs(this._targetPosition - this._currentPosition);
	const absDelta = Math.abs(delta);
	if (absDelta < 1) return;

	// determine how to get to target position

	const duration = absDelta / POSITION_RANGE * this.travelTime;
	this.setCurrentState(delta > 0 ? 'INCREASING' : 'DECREASING');

	this.cancelTimeout();

	this.timeout = setTimeout(() => {
		this.setCurrentState('STOPPED');
	}, duration);
};

Motion.prototype.cancelTimeout = function () {
	if (this.timeout) {
		clearTimeout(this.timeout);
		this.timeout = null;
	}
};

module.exports = { Motion };
