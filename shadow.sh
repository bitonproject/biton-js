#!/bin/sh

# Load the shadow-standalone docker image as per their tutorial
# https://github.com/shadow/shadow/blob/master/docs/1.2-Shadow-with-Docker.md
# 
# wget https://security.cs.georgetown.edu/shadow-docker-images/shadow-standalone.tar.gz
# gunzip -c shadow-standalone.tar.gz | docker load
# rm shadow-standalone.tar.gz

CONTAINER=shadow-biton

if ! docker container start $CONTAINER ; then
  docker run -it -d --name $CONTAINER shadow-standalone
fi

docker exec -it $CONTAINER /bin/bash
