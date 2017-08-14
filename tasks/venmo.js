'use strict';

var gulp = require('gulp');
var browserify = require('./browserify');
var VERSION = require('../package.json').version;

gulp.task('build:venmo', function (done) {
  browserify({
    standalone: 'braintree.venmo',
    main: 'src/venmo/index.js',
    out: 'venmo.js',
    dist: 'dist/hosted/web/' + VERSION + '/js'
  }, done);
});
