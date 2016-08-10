'use strict';

require('dotenv').config();
require('./tasks/client');
require('./tasks/paypal');
require('./tasks/three-d-secure');
require('./tasks/hosted-fields');
require('./tasks/data-collector');
require('./tasks/american-express');
require('./tasks/apple-pay');
require('./tasks/frame-service');
require('./tasks/unionpay');
require('./tasks/build');
require('./tasks/release');
require('./tasks/jsdoc');
require('./tasks/test');

var gulp = require('gulp');
var del = require('del');

gulp.task('clean', function () {
  return del(['./dist']);
});

gulp.task('build:integration', ['build', 'jsdoc']);

gulp.task('watch:integration', function () {
  gulp.watch([
    'src/**/*'
  ], ['build'])
  gulp.watch([
    'src/**/*',
    'jsdoc/*'
  ], ['jsdoc']);
});
