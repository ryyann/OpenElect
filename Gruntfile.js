'use strict';


var fs = require('fs'),
    path = require('path'),
    userhome = require('userhome');

module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);
  
  var caPath   = path.resolve(userhome(), '.boot2docker/certs/boot2docker-vm/', 'ca.pem'),
      certPath = path.resolve(userhome(), '.boot2docker/certs/boot2docker-vm/', 'cert.pem'),
      keyPath  = path.resolve(userhome(), '.boot2docker/certs/boot2docker-vm/', 'key.pem');

  grunt.initConfig({
    dock: {
  
      options: {
        // Docker connection options
        // By default, Boot2Docker only accepts secure connection.
        docker: {
          version: 'v1.15',
          protocol: 'https',
          host: '192.168.59.103',
          port: '2376',

          ca: fs.readFileSync(caPath),
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath)
        }
        
      },

      dev: {
        options: {
          // Docker images definition
          images: {
            // The Node.js container
            'node': {
              // The Dockerfile to use
              dockerfile: './bundle/node/Dockerfile',
              options: {
                
                // A startup, bind the 8080 port to the host
                // Bind the directory 'bundle/node' into the directory container '/bundle'
                start:  { 
                  "PortBindings": { "8080/tcp": [ { "HostPort": "8080" } ] },
                  "Binds":[__dirname + "/bundle/node:/opt/app"],
                  "Cmd": [
                    "npm start"
                  ] 
                },

                logs:   { stdout: true, stderr: true }
              }
            },
            // The NGINX container
            'nginx': {
              // The Dockerfile to use
              dockerfile: './bundle/nginx/Dockerfile',
              options: {
                // Bind the 80 port to the host 8081
                // Links this container to the node one. So Docker env variable will be accessible
                // Bind 2 directories to the container (config, NGINX startup script, default index.html file)
                start:  {
                  "PortBindings": { "80/tcp": [ { "HostPort": "8081" } ] },
                  "Links": ["node:latest"],
                  "Binds":[
                    __dirname + "/bundle/nginx:/data",
                    __dirname + "/bundle/nginx:/etc/nginx/sites-available",
                  ]
                },
                // For logs, sdtout & stderr
                logs:   { stdout: true, stderr: true }
              }
            }
          }

        }
      }
    },

    // Commands to run before building or stopping
    shell: {
      boot: {
        command: 'chmod +x ./docker_wrapper.sh && source docker_wrapper.sh'
      },
      browser: {
        command: 'open .'
      },
      stop: {
        command: 'boot2docker down'
      }
    }

  });

  grunt.registerTask('start', [
    'clean',
    'dock:prod:build',
    'dock:prod:start'
  ]);

  grunt.registerTask('stop', [
    'clean',
    'dock:prod:stop'
  ]);

  grunt.registerTask('clean', [
    'dock:clean'
  ]);

  grunt.registerTask('startdev', [
    'shell:boot',
    'dock:dev:build',
    'dock:dev:start'
  ]);

  grunt.registerTask('stopdev', [
    'dock:dev:stop',
    'clean'
  ]);

  grunt.registerTask('shutdown', [
    'shell:stop'
  ]);

  grunt.registerTask('default', [
    'startdev'
  ]);

};
