#!/bin/bash
apt-get update
apt-get install -y nodejs npm
ln -s /usr/bin/nodejs /usr/bin/node

npm install bower gulp json-minify -g
npm install gulp-inline-source gulp-nunjucks-render gulp-minify-inline-scripts gulp-minify-inline --save-dev
npm install
bower --allow-root install --save
