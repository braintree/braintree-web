'use strict';

var browserify = require('./browserify');
var gulp = require('gulp');
var path = require('path');
var VERSION = require('../package.json').version;

var BASE_PATH = path.resolve(__dirname, '..', 'src', 'google-payment');
var DIST_PATH = path.resolve(__dirname, '..', 'dist', 'hosted', 'web', VERSION);

gulp.task('build:google-payment:js', function (done) {
  browserify({
    standalone: 'braintree.googlePayment',
    main: 'src/google-payment/index.js',
    out: 'google-payment.js',
    dist: 'dist/hosted/web/' + VERSION + '/js'
  }, done);
});

gulp.task('build:google-payment', ['build:google-payment:js']);
