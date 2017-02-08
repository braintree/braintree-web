'use strict';

var COMPONENTS = require('./components.json');

require('dotenv').config();

COMPONENTS.forEach(function (component) {
  require('./tasks/' + component);
});
require('./tasks/build');
require('./tasks/frame-service');
require('./tasks/release');
require('./tasks/jsdoc');
require('./tasks/test');

var gulp = require('gulp');
var del = require('del');
var sequence = require('run-sequence');
var VERSION = require('./package.json').version;

gulp.task('clean', function () {
  return del(['./dist']);
});

gulp.task('build:integration', function (done) {
  process.env.npm_package_version = VERSION;

  sequence(
    ['build', 'jsdoc'],
    done
  );
});

gulp.task('watch:integration', function () {
  process.env.npm_package_version = VERSION;

  gulp.watch([
    'src/**/*'
  ], ['build'])
  gulp.watch([
    'src/**/*',
    'jsdoc/*'
  ], ['jsdoc']);
});
