#!/bin/bash
cd "$(dirname "$0")" || exit

VERSION=`node -p "require('./package.json').version"`

IMAGE_TAG="v${VERSION}"
REPOSITORY="damoncote/crayon-elite-api"
IMAGE_NAME_AND_TAG="${REPOSITORY}:${IMAGE_TAG}"
docker image build -t ${IMAGE_NAME_AND_TAG} -f Dockerfile .

docker push ${IMAGE_NAME_AND_TAG}
echo "image ${IMAGE_NAME_AND_TAG} pushd!"
