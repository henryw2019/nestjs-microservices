FROM node:22-alpine

# Install system build dependencies required for compiling native node modules
RUN apk add --no-cache \
	libc6-compat \
	wget \
	openssl \
	python3 \
	make \
	g++ \
	build-base \
	bash

# Install common global build tools used by native modules (node-gyp, node-pre-gyp, prebuild)
RUN npm set progress=false && npm config set unsafe-perm true && \
	npm install -g --silent node-gyp node-pre-gyp prebuild || true

WORKDIR /app