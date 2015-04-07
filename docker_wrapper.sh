#!/bin/bash

# A wrapper for the docker binary. Checks to make sure the docker host is
# set before executing docker commands.
docker() {

  # Start the daemon if it's not running
  if [ $(boot2docker status) != 'running' ]; then
    echo 'Starting the Docker daemon.'
    boot2docker start
  fi

  if [ -z $DOCKER_HOST ] || [ -z $DOCKER_IP ] || [ -z $DOCKER_CERT_PATH ]; then
    
    # Store the docker binary path
    DOCKER=$(which docker)
    
    # All 'echo' commands are unecessary, but it lets you know
    # if this block of code was run or not.
    echo 'Setting Docker host...'
    
    # Grab the ip address from boot2socker. DOCKER_IP is not
    # necessary to run docker, but it comes in handy (see readme).
    export DOCKER_IP=$(boot2docker ip 2>/dev/null)
    # export DOCKER_HOST="tcp://$DOCKER_IP:2375"
    eval $(boot2docker shellinit)
    
    # Confirm that variables were exported via the command line.
    echo "    DOCKER_IP=$DOCKER_IP"
    echo "    DOCKER_HOST=$DOCKER_HOST"
    echo "    DOCKER_CERT_PATH=$DOCKER_CERT_PATH"; echo
  fi

  # Execute docker with all arguments.
  DOCKER "$@"
}
