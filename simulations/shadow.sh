#!/bin/sh

# Load the shadow-standalone docker image as per their tutorial
# https://github.com/shadow/shadow/blob/master/docs/1.2-Shadow-with-Docker.md
#
# wget https://security.cs.georgetown.edu/shadow-docker-images/shadow-standalone.tar.gz
# gunzip -c shadow-standalone.tar.gz | docker load
# rm shadow-standalone.tar.gz

IMAGE=shadow-standalone-biton
CONTAINER=shadow-biton

# Uncomment to build a custom Docker image and to upload simulation files
# docker build . -t $IMAGE -f Dockerfile

if ! docker container start $CONTAINER ; then
  docker run -it -d --name $CONTAINER $IMAGE
fi

docker cp . $CONTAINER:/home/shadow/shadow/biton

docker exec -it $CONTAINER /bin/bash
