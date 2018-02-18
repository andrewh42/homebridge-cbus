'use strict';

const test = require('tape').test;
const timekeeper = require('timekeeper');

const Motion = require('../lib/shutter-motion').Motion;

test('upFully', function (assert) {
	assert.plan(4);

	const shutter = new Motion(30000);

	assert.equal(shutter.getCurrentPosition(), 0);
	shutter.setCurrentState('INCREASING');
	assert.equal(shutter.getCurrentState(), 'INCREASING');

	timekeeper.travel(new Date(Date.now() + 30000));
	assert.equal(shutter.getCurrentState(), 'STOPPED');
	assert.equal(shutter.getCurrentPosition(), 100);

	timekeeper.reset();

	assert.end();
});

test('upPartial', function (assert) {
	assert.plan(4);

	const shutter = new Motion('30 sec');

	assert.equal(shutter.getCurrentPosition(), 0);
	shutter.setCurrentState('INCREASING');
	assert.equal(shutter.getCurrentState(), 'INCREASING');

	timekeeper.travel(new Date(Date.now() + 15000));
	assert.equal(shutter.getCurrentState(), 'INCREASING');
	assert.equal(shutter.getCurrentPosition(), 50);

	timekeeper.reset();

	assert.end();
});
