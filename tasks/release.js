'use strict';

var gulp = require('gulp');
var chalk = require('chalk');
var VERSION = require('../package.json').version;
var sequence = require('run-sequence');
var spawn = require('child_process').spawn;
var HOSTED_DEST = process.env.BRAINTREE_JS_HOSTED_DEST;
var BOWER_DEST = process.env.BRAINTREE_JS_BOWER_DEST;
var NPM_DEST = './dist/npm';

gulp.task('release:hosted:copy', function () {
  return gulp.src([
    'dist/hosted/web/' + VERSION + '/**/*',
    '!dist/hosted/web/' + VERSION + '/js/index.*'
  ])
    .pipe(gulp.dest(HOSTED_DEST + '/web/' + VERSION));
});

gulp.task('release:hosted-static:copy', function () {
  return gulp.src(['dist/hosted/web/static/**/*'])
    .pipe(gulp.dest(HOSTED_DEST + '/web/static'));
});

gulp.task('release:hosted', ['clean'], function (done) {
  sequence(
    'build:hosted',
    'release:hosted-static:copy',
    'release:hosted:copy',
    endingMessage(HOSTED_DEST, done)
  );
});

gulp.task('release:bower:copy', function () {
  return gulp.src([
    'dist/bower/*',
    'dist/bower/.*'
  ]).pipe(gulp.dest(BOWER_DEST));
});

gulp.task('release:bower', ['clean'], function (done) {
  sequence(
    'build:hosted',
    'build:bower',
    'release:bower:copy',
    endingMessage(BOWER_DEST, done)
  );
});

gulp.task('release:npm', ['clean'], function (done) {
  sequence(
    'build:hosted',
    'build:npm',
    endingMessage(NPM_DEST, function () {
      console.log();
      console.log(
        'Run',
        chalk.yellow('cd dist/npm')
      );
      console.log();
      console.log(
        'Run',
        chalk.yellow('nvm install 8'),
        '(node 6 does not allow 2fa)'
      );
      console.log();
      console.log(
        'Run',
        chalk.yellow('npm publish')
      );

      done()
    })
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
