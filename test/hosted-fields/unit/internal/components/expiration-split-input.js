'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;
var ExpirationSplitInput = require('../../../../../src/hosted-fields/internal/components/expiration-split-input').ExpirationSplitInput;

describe('Expiration Split Input', function () {
  beforeEach(function () {
    var self = this;
    var fakeFirstOption = document.createElement('option');

    this.element = document.createElement('select');
    fakeFirstOption.innerHTML = '01 - January';
    fakeFirstOption.value = '1';
    this.element.appendChild(fakeFirstOption);

    this.configuration = {
      select: true
    };

    this.context = {
      type: 'fakeType',
      element: this.element,
      getConfiguration: function () {
        return self.configuration;
      },
      createPlaceholderOption: ExpirationSplitInput.prototype.createPlaceholderOption
    };
  });

  describe('setPlaceholder', function () {
    it("calls BaseInput's setPlaceholder if there is no `select` configuration", function () {
      delete this.configuration.select;

      this.sandbox.stub(BaseInput.prototype, 'setPlaceholder');

      ExpirationSplitInput.prototype.setPlaceholder.call(this.context, 'fakeType', 'foo & <boo>');

      expect(BaseInput.prototype.setPlaceholder).to.have.been.calledOnce;
      expect(BaseInput.prototype.setPlaceholder).to.have.been.calledOn(this.context);
    });

    describe('when no placeholder existed', function () {
      it('adds the placeholder if the type matches', function () {
        var placeholderEl;

        ExpirationSplitInput.prototype.setPlaceholder.call(this.context, 'fakeType', 'foo & <boo>');

        placeholderEl = this.element.firstChild;
        expect(placeholderEl.value).to.equal('');
        expect(placeholderEl.getAttribute('selected')).to.equal('selected');
        expect(placeholderEl.getAttribute('disabled')).to.equal('disabled');
        expect(placeholderEl.innerHTML).to.equal('foo &amp; &lt;boo&gt;');

        expect(this.element.querySelectorAll('option')).to.have.lengthOf(2);
      });

      it("does nothing if the type doesn't match", function () {
        ExpirationSplitInput.prototype.setPlaceholder.call(this.context, 'ugh', 'foo & <boo>');

        expect(this.element.querySelectorAll('option')).to.have.lengthOf(1);
      });
    });

    describe('when a placeholder existed', function () {
      beforeEach(function () {
        this.placeholderEl = document.createElement('option');
        this.placeholderEl.value = '';
        this.placeholderEl.innerHTML = 'foo';

        this.element.insertBefore(this.placeholderEl, this.element.firstChild);
      });

      it('updates the placeholder if the type matches', function () {
        ExpirationSplitInput.prototype.setPlaceholder.call(this.context, 'fakeType', 'foo & <boo>');

        expect(this.placeholderEl.innerHTML).to.equal('foo &amp; &lt;boo&gt;');

        expect(this.element.querySelectorAll('option')).to.have.lengthOf(2);
      });

      it("does nothing if the type doesn't match", function () {
        ExpirationSplitInput.prototype.setPlaceholder.call(this.context, 'ugh', 'foo to the boo');

        expect(this.placeholderEl.innerHTML).to.equal('foo');
      });
    });
  });
});
