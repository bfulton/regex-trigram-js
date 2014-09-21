module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        src: [ 'src/app.js' ],
        dest: 'dist/<%= pkg.name %>.js',
        options: {
          standalone: '<%= pkg.name %>'
        }
      },
      dist_min: {
        src: [ 'src/app.js' ],
        dest: 'dist/<%= pkg.name %>.min.js',
        options: {
          standalone: '<%= pkg.name %>',
          transform: ['uglifyify']
        }
      }
    },
    clean: ["build", "dist"],
    jshint: {
      all: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js']
    },
    nodeunit: {
      all: ['test/**/*_test.js']
    },
    peg: {
      options: { trackLineAndColumn: true },
      regex : {
        src: "src/regex.peg",
        dest: "build/regex-peg.js"
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-peg');

  grunt.registerTask('build', ['clean', 'peg', 'browserify']);

  grunt.registerTask('test', ['build', 'jshint', 'nodeunit']);

  grunt.registerTask('default', ['test']);
};