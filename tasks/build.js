'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var sequence = require('run-sequence');
var VERSION = require('../package.json').version;
var JS_PATH = 'dist/hosted/web/' + VERSION + '/js/';
var HTML_PATH = 'dist/hosted/web/' + VERSION + '/html/';
var PUBLISHED_DIST = 'dist/published';
var fs = require('fs');
var JS_COMMENT_REGEX = /(\/\*[\s\S]*?\*\/\n*|\/\/.*?\n)/gm;

gulp.task('build:published:debug', function () {
  return gulp.src([
    './src/index.js'
  ]).pipe(replace('@VERSION', VERSION))
    .pipe(replace('@EXT', '.debug'))
    .pipe(rename('debug.js'))
    .pipe(gulp.dest(PUBLISHED_DIST));
});

gulp.task('build:published:index', function () {
  return gulp.src([
    './src/index.js'
  ]).pipe(replace('@VERSION', VERSION))
    .pipe(replace('@EXT', ''))
    .pipe(replace(JS_COMMENT_REGEX, ''))
    .pipe(rename('index.js'))
    .pipe(gulp.dest(PUBLISHED_DIST));
});

gulp.task('build:published:statics', function () {
  return gulp.src([
    './publishing/.gitignore',
    './publishing/.npmignore',
    './publishing/bower.json',
    './publishing/package.json',
    './CHANGELOG.md',
    './LICENSE',
    './README.md'
  ]).pipe(replace('@VERSION', VERSION))
    .pipe(gulp.dest(PUBLISHED_DIST));
});

gulp.task('build:published:mins', function () {
  return gulp.src([
    JS_PATH + 'american-express.min.js',
    JS_PATH + 'apple-pay.min.js',
    JS_PATH + 'client.min.js',
    JS_PATH + 'data-collector.min.js',
    JS_PATH + 'hosted-fields.min.js',
    JS_PATH + 'paypal.min.js',
    JS_PATH + 'three-d-secure.min.js',
    JS_PATH + 'unionpay.min.js'
  ]).pipe(rename(function (path) {
    path.basename = path.basename.replace(/\.min$/, '');
  })).pipe(gulp.dest(PUBLISHED_DIST));
});

gulp.task('build:published:debugs', function () {
  return gulp.src([
    JS_PATH + 'american-express.js',
    JS_PATH + 'apple-pay.js',
    JS_PATH + 'client.js',
    JS_PATH + 'data-collector.js',
    JS_PATH + 'hosted-fields.js',
    JS_PATH + 'paypal.js',
    JS_PATH + 'three-d-secure.js',
    JS_PATH + 'unionpay.js'
  ]).pipe(rename({
    extname: '.debug.js'
  })).pipe(gulp.dest(PUBLISHED_DIST));
});

gulp.task('build:published', [
  'build:published:index',
  'build:published:debug',
  'build:published:mins',
  'build:published:debugs',
  'build:published:statics'
]);

gulp.task('build:unmin', function () {
  return gulp.src([
    HTML_PATH + '*.html',
    '!' + HTML_PATH + '*.min.html',
  ]).pipe(replace('@DOT_MIN', ''))
    .pipe(gulp.dest(HTML_PATH));
});

gulp.task('build:min', function () {
  return gulp.src([
    HTML_PATH + '*.min.html'
  ]).pipe(replace('@DOT_MIN', '.min'))
    .pipe(gulp.dest(HTML_PATH));
});

gulp.task('build:link-latest', function (done) {
  fs.symlink(VERSION, 'dist/hosted/web/dev', done);
});

gulp.task('build:hosted', [
  'build:apple-pay',
  'build:client',
  'build:paypal',
  'build:three-d-secure',
  'build:hosted-fields',
  'build:data-collector',
  'build:frame-service',
  'build:american-express',
  'build:unionpay'
]);

gulp.task('build', function (done) {
  sequence(
    'clean',
    'build:hosted',
    [
      'build:link-latest',
      'build:published'
    ], [
      'build:min',
      'build:unmin'
    ],
    done
  );
});
