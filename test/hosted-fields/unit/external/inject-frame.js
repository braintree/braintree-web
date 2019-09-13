'use strict';

var injectFrame = require('../../../../src/hosted-fields/external/inject-frame');
var directions = require('../../../../src/hosted-fields/shared/constants').navigationDirections;
var focusIntercept = require('../../../../src/hosted-fields/shared/focus-intercept');

describe('injectFrame', function () {
  it('adds frame to container and returns it as result', function () {
    var frame = document.createElement('iframe');
    var container = document.createElement('div');
    var result = injectFrame(frame, container);

    expect(container.children[0]).to.equal(frame);
    expect(result[0]).to.equal(frame);
  });

  it('adds clear: both element to the container and returns it in the result', function () {
    var frame = document.createElement('iframe');
    var container = document.createElement('div');
    var result = injectFrame(frame, container);

    expect(container.children[1]).to.be.an.instanceof(HTMLDivElement);
    expect(result[1].style.clear).to.equal('both');
    expect(container.children[1]).to.equal(result[1]);
  });

  it('adds focus interceptor nodes to merchant form', function () {
    var div1 = document.createElement('div');
    var div2 = document.createElement('div');
    var fragment = document.createDocumentFragment();
    var frame = document.createElement('iframe');
    var container = document.createElement('div');
    var spy = this.sandbox.stub();

    frame.setAttribute('type', 'cvv');

    this.sandbox.stub(focusIntercept, 'generate');
    this.sandbox.stub(document, 'createDocumentFragment').returns(fragment);
    this.sandbox.spy(fragment, 'appendChild');

    focusIntercept.generate.onCall(0).returns(div1);
    focusIntercept.generate.onCall(1).returns(div2);

    injectFrame(frame, container, spy);

    expect(focusIntercept.generate).to.be.calledWith('cvv', directions.BACK, spy);
    expect(focusIntercept.generate).to.be.calledWith('cvv', directions.FORWARD, spy);

    expect(fragment.appendChild.callCount).to.equal(4);
    expect(fragment.appendChild.args[0][0]).to.equal(div1);
    expect(fragment.appendChild.args[1][0]).to.equal(frame);
    expect(fragment.appendChild.args[2][0]).to.equal(div2);
  });

  it('does not add focus interceptor nodes to the result', function () {
    var frame = document.createElement('iframe');
    var container = document.createElement('div');
    var result = injectFrame(frame, container);

    expect(result).to.have.length(2);
  });
});
