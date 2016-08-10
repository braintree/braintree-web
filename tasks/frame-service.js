
'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var browserify = require('./browserify');
var minifyHTML = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION + '/';
var JS_TASKS = [];
var HTML_TASKS = [];
var FRAMES = ['dispatch'];

FRAMES.forEach(function (frame) {
  var jsTaskName = 'build:frame-service:js:' + frame + '-frame';
  var htmlTaskName = 'build:frame-service:html:' + frame + '-frame';

  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'frameService',
      main: 'src/lib/frame-service/internal/dispatch-frame/index.js',
      out: 'frame-service-' + frame + '-frame.js',
      dist: DIST_DIR + 'js'
    }, done);
  });

  JS_TASKS.push(jsTaskName);

  gulp.task(htmlTaskName, function () {
    return gulp.src('src/lib/frame-service/internal/dispatch-frame/index.html')
      .pipe(rename(function (path) {
        path.basename = 'dispatch-frame';
      }))
      .pipe(replace('@FRAME', frame))
      .pipe(gulp.dest(DIST_DIR + 'html'))
      .pipe(minifyHTML({
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

gulp.task('build:frame-service:html', HTML_TASKS);
gulp.task('build:frame-service:js', JS_TASKS);
gulp.task('build:frame-service', ['build:frame-service:js', 'build:frame-service:html']);
