#!/bin/bash

if [ -f ".env" ]; then
  export $(cat .env | xargs)
fi

npm run setup
