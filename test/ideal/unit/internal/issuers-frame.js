'use strict';

var issuersFrame = require('../../../../src/ideal/internal/issuers-frame');
var Bus = require('../../../../src/lib/bus');

function makeMockConfirmView() {
  var confirmView = document.createElement('div');
  var backButton = document.createElement('div');
  var bankLogo = document.createElement('div');
  var bankName = document.createElement('div');
  var proceed = document.createElement('div');

  confirmView.className = 'confirm-view';
  backButton.className = 'back-btn';
  backButton.appendChild(document.createElement('span'));
  bankLogo.className = 'bank-message--logo';
  bankName.className = 'bank-message--name';
  proceed.className = 'bank-message--proceed';
  confirmView.style.display = 'none';

  confirmView.appendChild(backButton);
  confirmView.appendChild(bankLogo);
  confirmView.appendChild(bankName);
  confirmView.appendChild(proceed);

  return confirmView;
}

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

    this.header = document.createElement('h1');
    this.header.className = 'ideal-header';
    this.header.appendChild(document.createElement('h1'));
    this.confirmView = makeMockConfirmView();
    document.body.appendChild(this.confirmView);
    this.idealList = document.createElement('div');
    this.idealList.className = 'ideal-list-container';
    document.body.appendChild(this.idealList);
    this.overlayNode = document.createElement('div');
    this.overlayNode.className = 'overlay';
    document.body.appendChild(this.overlayNode);
    document.body.appendChild(this.header);

    window.name = 'braintree_uuid';

    this.sandbox.stub(Bus.prototype, 'emit').onCall(0).yields({bankData: this.fakeConfig});
  });

  afterEach(function () {
    window.name = this.oldWindowName;
    document.body.removeChild(this.confirmView);
    document.body.removeChild(this.idealList);
    document.body.removeChild(this.overlayNode);
    document.body.removeChild(this.header);
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

    expect(goodBank.querySelector('img').src).to.contain('static/images/ideal_issuer-logo_INGBNL2A.png');
    expect(sketchyBank.querySelector('img').src).to.contain('static/images/ideal_issuer-logo_onloaddoSomethingBadignored-property');
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

  it('adds click listeners to bank list to open a confirmation view', function (done) {
    var btn, confirmView;

    this.timeout(4000);

    issuersFrame.start();

    btn = document.querySelector('#INGBNL2A');
    confirmView = document.querySelector('.confirm-view');

    expect(confirmView.style.display).to.equal('none');

    btn.click();

    setTimeout(function () {
      expect(confirmView.style.display).to.equal('block');
      expect(confirmView.querySelector('.bank-message--logo').innerHTML).to.contain('INGBNL2A.png');
      expect(confirmView.querySelector('.bank-message--name').innerHTML).to.contain('Issuer Simulation V3 - ING');
      done();
    }, 500);
  });

  it('emits BANK_CHOSEN event 3 seconds after bank button is clicked', function (done) {
    var btn;

    this.timeout(4000);

    issuersFrame.start();

    btn = document.querySelector('#INGBNL2A');

    btn.click();

    setTimeout(function () {
      expect(Bus.prototype.emit).to.be.calledWith('ideal:BANK_CHOSEN', {
        issuingBankId: 'INGBNL2A'
      });
      done();
    }, 3501); // need some extra padding to allow the images to load
  });

  it('does not emit BANK_CHOSEN event until after 3 seconds after button is clicked', function (done) {
    var btn;

    this.timeout(4000);

    issuersFrame.start();

    btn = document.querySelector('#INGBNL2A');

    btn.click();

    setTimeout(function () {
      expect(Bus.prototype.emit).to.not.be.calledWith('ideal:BANK_CHOSEN', {
        issuingBankId: 'INGBNL2A'
      });
      done();
    }, 2900);
  });

  it('does not emit BANK_CHOSEN event if back button is clicked', function (done) {
    var btn, backBtn;

    this.timeout(5000);

    issuersFrame.start();

    btn = document.querySelector('#INGBNL2A');
    backBtn = document.querySelector('.confirm-view .back-btn');

    btn.click();

    setTimeout(function () {
      backBtn.click();
      setTimeout(function () {
        expect(Bus.prototype.emit).to.not.be.calledWith('ideal:BANK_CHOSEN', {
          issuingBankId: 'INGBNL2A'
        });
        done();
      }, 1000);
    }, 2900);
  });
});
