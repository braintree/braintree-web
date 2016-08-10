'use strict';

var gulp = require('gulp');
var chalk = require('chalk');
var VERSION = require('../package.json').version;
var sequence = require('run-sequence');
var spawn = require('child_process').spawn;
var HOSTED_DEST = process.env.BRAINTREE_JS_HOSTED_DEST;
var BOWER_DEST = process.env.BRAINTREE_JS_BOWER_DEST;

gulp.task('release:hosted:copy', function () {
  return gulp.src(['dist/hosted/web/' + VERSION + '/**/*'])
    .pipe(gulp.dest(HOSTED_DEST + '/web/' + VERSION));
});

gulp.task('release:hosted', function (done) {
  sequence(
    'build',
    'release:hosted:copy',
    endingMessage(HOSTED_DEST, done)
  );
});

gulp.task('release:bower:copy', function () {
  return gulp.src([
    'dist/published/*',
    'dist/published/.*',
    '!dist/published/package.json',
    '!dist/published/.npmignore'
  ]).pipe(gulp.dest(BOWER_DEST));
});

gulp.task('release:bower', function (done) {
  sequence(
    'build',
    'release:bower:copy',
    endingMessage(BOWER_DEST, done)
  );
});

function endingMessage(destination, done) {
  return function () {
    console.log();
    console.log(
      chalk.red('Files have been copied into'),
      chalk.green(destination)
    );
    console.log();
    done();
  }
}
