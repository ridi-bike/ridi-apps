#!/bin/bash

if [ -z "$DOCKER_ENV" ]; then
  pnpm exec cypress install
fi
