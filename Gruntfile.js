module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
        options: {
            curly: true,
            eqeqeq: true,
            immed: true,
            latedef: true,
            newcap: true,
            noarg: true,
            sub: true,
            undef: true,
            eqnull: true,
            browser: true,
            multistr:true,
            shadow:true,
            laxbreak:true,
            node:true,
            globals: {
                jQuery: true,
                $: true,
                console: true,
                CONTEXT: true,
                CHESSHUB: true
            }
        },
        'chessHubClientLibs': {
            src: [ 'src/js/chessHub*.js' ]
        },
        'chessHubServer': {
            src: [ 'server.js', 'channel.js' ]
        }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      dist: {
	files: {
        	'client/js/chessHubBoard-<%= pkg.version %>.min.js':'src/js/chessHubBoard-<%= pkg.version %>.js',
        	'client/js/chessHubClient-<%= pkg.version %>.min.js':'src/js/chessHubClient-<%= pkg.version %>.js',
	}
      }
    },
    copy: {
	main: {
		files: [
		    	{ expand:true, cwd: 'src/', src:['main.html'],dest:'client/' },
			    { expand:true, cwd: 'src/css/', src:['**'],dest:'client/css/' },
			    { expand:true, cwd: 'src/lib/', src:['**'],dest:'client/lib/' },
			    { expand:true, cwd: 'src/img/', src:['**'],dest:'client/img/' }
		]
	}
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');

  // Default task(s).
  grunt.registerTask('default', ['jshint','uglify','copy']);

};
