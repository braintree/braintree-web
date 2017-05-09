'use strict';

var issuersFrame = require('../../../../src/ideal/internal/issuers-frame');
var Bus = require('../../../../src/lib/bus');

describe('issuers-frame', function () {
  beforeEach(function () {
    this.oldWindowName = window.name;
    this.fakeConfig = [
      /* eslint-disable camelcase */
      {
        country_code: 'NL',
        localized_country_names: ['Netherlands'],
        issuers: [{
          id: 'INGBNL2A',
          name: 'Issuer Simulation V3 - ING',
          image_file_name: 'INGBNL2A.png'
        }, {
          id: 'RABONL2U',
          name: 'Issuer Simulation V3 - RABO',
          image_file_name: 'INGBNL2A.png'
        }]
      }
    ];
    /* eslint-enable */

    window.name = 'braintree_uuid';

    this.sandbox.stub(Bus.prototype, 'emit').onCall(0).yields({bankData: this.fakeConfig});
  });

  afterEach(function () {
    var container = document.querySelector('.container--ideal');

    window.name = this.oldWindowName;
    document.body.removeChild(container);
  });

  it('adds issuing banks to the dom', function () {
    var bank1, bank2;

    issuersFrame.start();

    bank1 = document.querySelector('#INGBNL2A');
    bank2 = document.querySelector('#RABONL2U');

    expect(bank1).to.exist;
    expect(bank2).to.exist;
  });

  it('sanitizes bank img url', function () {
    var sketchyBank, goodBank;

    this.fakeConfig[0].issuers.push({
      id: 'sketchy',
      name: 'sketchy name',
      image_file_name: '" onload="doSomethingBad()" ignored-property="' // eslint-disable-line camelcase
    });

    issuersFrame.start();

    goodBank = document.querySelector('#INGBNL2A');
    sketchyBank = document.querySelector('#sketchy');

    expect(goodBank.innerHTML).to.contain('src="../../static/images/ideal_issuer-logo_INGBNL2A.png">');
    expect(sketchyBank.innerHTML).to.contain('src="../../static/images/ideal_issuer-logo_onloaddoSomethingBadignored-property">');
  });

  it('sanitizes bank name', function () {
    var sketchyBank;

    this.fakeConfig[0].issuers.push({
      id: 'sketchy',
      name: '<script>alert("foo")</script>',
      image_file_name: 'sketchy.png' // eslint-disable-line camelcase
    });

    issuersFrame.start();

    sketchyBank = document.querySelector('#sketchy');

    expect(sketchyBank.innerHTML).to.contain('<span class="list--name">&lt;script&gt;alert("foo")&lt;/script&gt;</span>');
  });

  it('includes country name if more than one set of issuers is included in the config', function () {
    var nodes;

    /* eslint-disable camelcase */
    this.fakeConfig.push({
      country_code: 'US',
      localized_country_names: ['United States'],
      issuers: [{
        id: 'foo',
        name: 'Foo bank',
        image_file_name: 'foo.png'
      }]
    });
    /* eslint-enable */

    issuersFrame.start();

    nodes = document.querySelectorAll('.list--heading--ideal');

    expect(nodes).to.have.a.lengthOf(2);
    expect(nodes[0].textContent).to.equal('Netherlands:');
    expect(nodes[1].textContent).to.equal('United States:');
  });

  it('sanitizes country name', function () {
    var nodes;

    /* eslint-disable camelcase */
    this.fakeConfig.push({
      country_code: 'US',
      localized_country_names: ['US<script>alert("foo")</script>'],
      issuers: [{
        id: 'foo',
        name: 'foo',
        image_file_name: 'foo.png'
      }]
    });
    /* eslint-enable */

    issuersFrame.start();

    nodes = document.querySelectorAll('.list--heading--ideal');

    expect(nodes).to.have.a.lengthOf(2);
    expect(nodes[1].innerHTML).to.contain('US&lt;script&gt;alert("foo")&lt;/script&gt;:');
  });

  it('does not include country name heading if only one country is available', function () {
    var nodes;

    issuersFrame.start();

    nodes = document.querySelectorAll('.list--heading--ideal');

    expect(nodes).to.have.a.lengthOf(0);
  });

  it('adds click listeners to bank list to message bank id', function () {
    var btn;

    issuersFrame.start();

    btn = document.querySelector('#INGBNL2A');

    btn.click();

    expect(Bus.prototype.emit).to.be.calledWith('ideal:BANK_CHOSEN', {
      issuingBankId: 'INGBNL2A'
    });
  });
});
