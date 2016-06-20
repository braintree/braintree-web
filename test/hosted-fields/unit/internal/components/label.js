'use strict';

var LabelComponent = require('../../../../../src/hosted-fields/internal/components/label').LabelComponent;

describe('LabelComponent', function () {
  it('creates a label element', function () {
    var label = new LabelComponent({
      name: 'foo',
      label: 'Foo'
    });

    expect(label.element).to.be.an.instanceof(HTMLLabelElement);
  });

  it('populates `for` and innerHTML from arguments', function () {
    var label = new LabelComponent({
      name: 'foo',
      label: 'Foo'
    });

    expect(label.element.getAttribute('for')).to.equal('foo');
    expect(label.element.innerHTML).to.equal('Foo');
  });
});
