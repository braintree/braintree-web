'use strict';

var gulp = require('gulp');
var Karma = require('karma').Server;
var run = require('run-sequence');
var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;

var TEST_DIR = path.resolve(__dirname, '..', 'test') + '/';
var KARMA_SUITES = [
  'american-express',
  'apple-pay',
  'client',
  'data-collector',
  'hosted-fields',
  'lib',
  'paypal',
  'three-d-secure',
  'unionpay'
];
var TEST_TASKS = [
  'test:environment',
  'test:node-parsing',
  'lint'
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

function _karma(suite, done) {
  new Karma({
    configFile: TEST_DIR + suite + '/config/karma.js',
    singleRun: true
  }, done).start();
}

KARMA_SUITES.forEach(function (suite) {
  var karmaTask = 'karma:' + suite;
  var lintTask = 'lint:' + suite;
  var standaloneTestTask = 'test:' + suite;

  TEST_TASKS.push(karmaTask);

  gulp.task(karmaTask, function (done) {
    _karma(suite, done);
  });
  gulp.task(lintTask, function (done) {
    _lint(suite, suite, done);
  });
  gulp.task(standaloneTestTask, function (done) {
    run(lintTask, karmaTask, done);
  });
});

gulp.task('karma:publishing', function (done) {
  _karma('publishing', done);
});
gulp.task('lint:publishing', function (done) {
  _lint('index.js', 'publishing', done);
});
gulp.task('test:publishing', function (done) {
  run('build', 'lint:publishing', 'karma:publishing', done);
});

TEST_TASKS.push('karma:publishing');

gulp.task('test:node-parsing', ['build'], function (done) {
  var error, bt;

  try {
    bt = require('../dist/published');
    bt = require('../dist/published/debug');
  } catch (e) {
    error = e;
  }

  done(error);
});

gulp.task('test:environment', function (done) {
  var nvmrcPath = path.resolve(__dirname, '..', '.nvmrc');
  var expectedVersion = fs.readFileSync(nvmrcPath).toString().trim().replace(/^v/, '^').replace(/\./, '\\.');
  var actualVersion = process.versions.node;

  if (new RegExp(expectedVersion).test(actualVersion)) {
    done()
  } else {
    done('The current node version is not compatible with the one in .nvmrc');
  }
});

gulp.task('lint', function(done) {
  _lint('', '', done);
});

gulp.task('test', function (done) {
  TEST_TASKS.push(done);
  run.apply(null, TEST_TASKS);
});
