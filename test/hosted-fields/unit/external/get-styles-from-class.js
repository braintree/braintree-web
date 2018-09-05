'use strict';

var allowedStyles = require('../../../../src/hosted-fields/shared/constants').allowedStyles;
var getStylesFromClass = require('../../../../src/hosted-fields/external/get-styles-from-class');

describe('getStylesFromClass', function () {
  beforeEach(function () {
    var styleNode = global.document.createElement('style');

    this.bodyContent = global.document.body.innerHTML;

    styleNode.innerText = '.custom-class { \n' +
    '  font-size: 5px;\n' +
    '  color: rgb(0, 0, 255);\n' +
    '}\n\n' +
    '.invalid-class { \n' +
    '  background: red;\n' +
    '  color: rgb(0, 255, 0);\n' +
    '}\n\n' +

    global.document.body.appendChild(styleNode);
  });

  afterEach(function () {
    global.document.body.innerHTML = this.bodyContent;
  });

  it('returns styles from class', function () {
    var styles = getStylesFromClass('custom-class');

    expect(styles.color).to.equal('rgb(0, 0, 255)');
    expect(styles['font-size']).to.equal('5px');
  });

  it('strips leading . from class name', function () {
    var styles = getStylesFromClass('.custom-class');

    expect(styles.color).to.equal('rgb(0, 0, 255)');
    expect(styles['font-size']).to.equal('5px');
  });

  it('ignores styles that are not part of the allowed styles', function () {
    var styles = getStylesFromClass('invalid-class');

    expect(styles.color).to.equal('rgb(0, 255, 0)');
    expect(styles.background).to.not.exist;
  });

  it('creates and then removes a dom node', function () {
    this.sandbox.spy(global.document.body, 'appendChild');
    this.sandbox.spy(global.document.body, 'removeChild');

    getStylesFromClass('custom-class');

    expect(global.document.body.appendChild).to.be.calledOnce;
    expect(global.document.body.removeChild).to.be.calledOnce;
  });

  it('hidden properties in hidden dom node do not interfere with allowed styles', function () {
    expect(allowedStyles).to.not.include('display');
    expect(allowedStyles).to.not.include('position');
    expect(allowedStyles).to.not.include('left');
    expect(allowedStyles).to.not.include('top');
  });
});
