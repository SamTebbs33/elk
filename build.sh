#!/usr/bin/env bash
mkdir -p foo
pkg package.json --out-path build
browserify src/elk.js -o build/elk-bundle.js