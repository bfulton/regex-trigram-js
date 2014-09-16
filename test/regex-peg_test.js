var peg = require('../build/regex-peg');

module.exports = {
  "exports": {
    "parse": function(test) {
      test.notEqual(null, peg.parse);
      test.ok('function' === typeof peg.parse);
      test.done();
    }
  }
};
