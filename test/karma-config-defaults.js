'use strict';

module.exports = {
  basePath: '../',
  frameworks: ['browserify', 'mocha', 'chai-sinon'],
  plugins: [
    'karma-browserify',
    'karma-phantomjs-launcher',
    'karma-mocha',
    'karma-chai-sinon',
    'karma-mocha-reporter'
  ],
  browsers: ['PhantomJS'],
  port: 7357,
  reporters: ['mocha'],
  preprocessors: {
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
    '**/*.js'
  ],
  exclude: ['**/*.swp']
};
