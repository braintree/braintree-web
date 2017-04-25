'use strict';

module.exports = {
  basePath: '../',
  frameworks: ['browserify', 'mocha'],
  plugins: [
    'karma-browserify',
    'karma-phantomjs-launcher',
    'karma-mocha',
    'karma-mocha-reporter'
  ],
  browsers: ['PhantomJS'],
  port: 7357,
  reporters: ['mocha'],
  preprocessors: {
    '../global.js': ['browserify'],
    '**/*.js': ['browserify']
  },
  browserify: {
    extensions: ['.js', '.json'],
    ignore: [],
    watch: true,
    debug: true,
    noParse: []
  },
  files: [
    '../global.js',
    '**/*.js'
  ],
  exclude: ['**/*.swp']
};
