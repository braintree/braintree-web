'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var browserify = require('./browserify');
var minify = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION + '/';
var JS_TASKS = ['build:masterpass:js:external'];
var HTML_TASKS = [];
var FRAMES = ['redirect', 'loading', 'landing'];

FRAMES.forEach(function (frame) {
  var jsTaskName = 'build:masterpass:js:' + frame + '-frame';
  var htmlTaskName = 'build:masterpass:html:' + frame + '-frame';

  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'braintree.masterpass',
      main: 'src/masterpass/internal/' + frame + '-frame.js',
      out: 'masterpass-' + frame + '-frame.js',
      dist: DIST_DIR + 'js'
    }, done);
  });

  JS_TASKS.push(jsTaskName);

  gulp.task(htmlTaskName, function () {
    return gulp.src('src/masterpass/internal/frame.html')
      .pipe(rename(function (path) {
        path.basename = 'masterpass-' + frame + '-' + path.basename;
      }))
      .pipe(replace('@FRAME', frame))
      .pipe(gulp.dest(DIST_DIR + 'html'))
      .pipe(minify({
        minify: true,
        collapseWhitespace: true,
        conservativeCollapse: false,
        minifyJS: true,
        minifyCSS: true
      }))
      .pipe(rename({
        extname: '.min.html'
      }))
      .pipe(gulp.dest(DIST_DIR + 'html'));
  });

  HTML_TASKS.push(htmlTaskName);
});

gulp.task('build:masterpass:js:external', function (done) {
  browserify({
    standalone: 'braintree.masterpass',
    main: 'src/masterpass/index.js',
    out: 'masterpass.js',
    dist: DIST_DIR + 'js'
  }, done);
});

gulp.task('build:masterpass:html', HTML_TASKS);
gulp.task('build:masterpass:js', JS_TASKS);
gulp.task('build:masterpass', ['build:masterpass:js', 'build:masterpass:html']);
