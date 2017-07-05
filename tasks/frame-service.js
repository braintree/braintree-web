
'use strict';

var del = require('del');
var fs = require('fs');
var gulp = require('gulp');
var rename = require('gulp-rename');
var run = require('run-sequence');
var replace = require('gulp-replace');
var browserify = require('./browserify');
var minifyHTML = require('gulp-minifier');
var VERSION = require('../package.json').version;

var DIST_DIR = 'dist/hosted/web/' + VERSION + '/';
var JS_TASKS = [];
var JS_DELETE_TASKS = [];
var HTML_TASKS = [];
var FRAMES = ['dispatch'];

FRAMES.forEach(function (frame) {
  var jsTaskName = 'build:frame-service:js:' + frame + '-frame';
  var jsDeleteTaskName = 'build:frame-service:js:delete' + frame + '-frame';
  var htmlTaskName = 'build:frame-service:html:' + frame + '-frame';

  gulp.task(jsTaskName, function (done) {
    browserify({
      standalone: 'frameService',
      main: 'src/lib/frame-service/internal/dispatch-frame/index.js',
      out: 'frame-service-' + frame + '-frame.js',
      dist: DIST_DIR + 'js',
      uglify: false
    }, done);
  });

  JS_TASKS.push(jsTaskName);

  gulp.task(htmlTaskName, function () {
    var jsFile = fs.readFileSync(DIST_DIR + 'js/frame-service-dispatch-frame.js');

    return gulp.src('src/lib/frame-service/internal/dispatch-frame/index.html')
      .pipe(replace('@BUILT_FILE', jsFile))
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

  gulp.task(jsDeleteTaskName, function () {
    var jsFilePath = DIST_DIR + 'js/frame-service-dispatch-frame.js';

    return del(jsFilePath);
  });

  JS_DELETE_TASKS.push(jsDeleteTaskName);
});

gulp.task('build:frame-service:html', HTML_TASKS);
gulp.task('build:frame-service:js', JS_TASKS);
gulp.task('build:frame-service:js:delete', JS_DELETE_TASKS);
gulp.task('build:frame-service', function (done) {
  run('build:frame-service:js', 'build:frame-service:html', 'build:frame-service:js:delete', done);
});
