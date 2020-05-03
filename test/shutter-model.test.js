'use strict';

const test = require('tape').test;
const timekeeper = require('timekeeper');

const { MotionModel } = require('../lib/motion');

test('upFully', function (assert) {
	assert.plan(4);

	const now = 1893448800000;
	timekeeper.freeze(new Date(now));

	const shutter = new MotionModel(30000);

	assert.equal(shutter.getCurrentPosition(), 0);
	shutter.setCurrentState('INCREASING');
	assert.equal(shutter.getCurrentState(), 'INCREASING');

	timekeeper.travel(new Date(now + 30000));
	assert.equal(shutter.getCurrentState(), 'STOPPED');
	assert.equal(shutter.getCurrentPosition(), 100);

	timekeeper.reset();

	assert.end();
});

test('upPartial', function (assert) {
	assert.plan(4);

	const now = 1893448800000;
	timekeeper.freeze(new Date(now));

	const shutter = new MotionModel(30000);

	assert.equal(shutter.getCurrentPosition(), 0);
	shutter.setCurrentState('INCREASING');
	assert.equal(shutter.getCurrentState(), 'INCREASING');

	timekeeper.travel(new Date(now + 15000));
	assert.equal(shutter.getCurrentState(), 'INCREASING');
	assert.equal(shutter.getCurrentPosition(), 50);

	timekeeper.reset();

	assert.end();
});

test('upStop', function (assert) {
	assert.plan(4);

	const now = 1893448800000;
	timekeeper.freeze(new Date(now));

	const shutter = new MotionModel(30000);

	assert.equal(shutter.getCurrentPosition(), 0);
	shutter.setCurrentState('INCREASING');
	assert.equal(shutter.getCurrentState(), 'INCREASING');

	timekeeper.travel(new Date(now + 15000));
	shutter.setCurrentState('STOPPED');

	assert.equal(shutter.getCurrentState(), 'STOPPED');
	assert.equal(shutter.getCurrentPosition(), 50);

	timekeeper.reset();

	assert.end();
});

test('downFully', function (assert) {
	assert.plan(4);

	const now = 1893448800000;
	timekeeper.freeze(new Date(now));

	const shutter = new MotionModel(30000);

	shutter.setCurrentPosition(100);
	assert.equal(shutter.getCurrentPosition(), 100);
	shutter.setCurrentState('DECREASING');
	assert.equal(shutter.getCurrentState(), 'DECREASING');

	timekeeper.travel(new Date(now + 30000));
	assert.equal(shutter.getCurrentState(), 'STOPPED');
	assert.equal(shutter.getCurrentPosition(), 0);

	timekeeper.reset();

	assert.end();
});

test('downStop', function (assert) {
	assert.plan(4);

	const now = 1893448800000;
	timekeeper.freeze(new Date(now));

	const shutter = new MotionModel(30000);

	shutter.setCurrentPosition(100);
	assert.equal(shutter.getCurrentPosition(), 100);
	shutter.setCurrentState('DECREASING');
	assert.equal(shutter.getCurrentState(), 'DECREASING');

	timekeeper.travel(new Date(now + 15000));
	shutter.setCurrentState('STOPPED');

	assert.equal(shutter.getCurrentState(), 'STOPPED');
	assert.equal(shutter.getCurrentPosition(), 50);

	timekeeper.reset();

	assert.end();
});
