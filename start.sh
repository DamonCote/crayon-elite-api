#!/bin/sh
pm2 start --env production ./ecosystem.config.js --no-daemon
