var regex = require('../src/regex-trigram');

module.exports = {
  "exports": {
    "parse": function(test) {
      test.notEqual(null, regex.parse);
      test.ok('function' === typeof regex.parse);
      test.done();
    },

    "query": function(test) {
      test.notEqual(null, regex.query);
      test.ok('function' === typeof regex.query);
      test.done();
    }
  }
};
