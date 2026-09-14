#!/bin/bash

# fail fast if no files are staged
if git diff --cached --quiet; then
  echo "No staged files. Run 'git add' before committing."
  exit 1
fi

./node_modules/.bin/vp check

./node_modules/.bin/markdownlint ./src/**/**/*.md --disable=MD024 --disable=MD013 --ignore=./jsdoc --ignore .gitignore

./node_modules/.bin/cspell . --report typos --gitignore
