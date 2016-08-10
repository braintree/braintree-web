var VERSION = require('../package.json').version;

exports.handlers = {
  jsdocCommentFound: function(e) {
    e.comment = e.comment.replace(/{@pkg version}/g, VERSION);
  }
};
