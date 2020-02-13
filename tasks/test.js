'use strict';

var gulp = require('gulp');
var path = require('path');
var spawn = require('child_process').spawn;

var TEST_DIR = path.resolve(__dirname, '..', 'test') + '/';

var TEST_TASKS = [
  'lint',
  'mocha:publishing',
  'test:node-parsing'
];

function _lint(src, test, done) {
  spawn('eslint', [
    'src/' + src,
    'test/' + test
  ], {
    stdio: 'inherit'
  }).on('exit', function (code, signal) {
    if (code === 0) {
      done();
    } else {
      done('eslint reported errors');
    }
  });
}

function _mocha(suite, done) {
  var projectRoot = path.resolve(__dirname, '..');
  var mochaPath = path.resolve(projectRoot, 'node_modules', '.bin', 'mocha');
  var testPath = path.resolve(projectRoot, 'test', suite);

  spawn(mochaPath, [testPath], {
    stdio: 'inherit'
  }).on('exit', (code) => {
    if (code === 0) {
      done();
    } else {
      done('mocha exited with code ' + code);
    }
  });
}

gulp.task('mocha:publishing', function (done) {
  _mocha('publishing', done);
});
gulp.task('lint:publishing', function (done) {
  _lint('index.js', 'publishing', done);
});
gulp.task('test:publishing', gulp.series(
  'build',
  'lint:publishing',
  'mocha:publishing'
));

gulp.task('test:node-parsing', function (done) {
  var error, bt;

  try {
    bt = require('../dist/npm');
  } catch (e) {
    error = e;
  }

  done(error);
});

gulp.task('test:environment', done => {
  spawn('jest', ['--config', 'test/environment/jest.config.json']).on('exit', done)
});

gulp.task('lint', function(done) {
  _lint('', '', done);
});

gulp.task('cleanup', function (done) {
  spawn('rm', ['-rf', 'src/dropin']).on('exit', function (code, signal) {
    if (code === 0) {
      done();
    } else {
      done('Failed to remove src/dropin');
    }
  });
});

gulp.task('test', gulp.series('build', 'cleanup', gulp.series(TEST_TASKS)));
