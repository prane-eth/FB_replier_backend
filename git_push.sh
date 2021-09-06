#!/bin/bash

# This file pushes latest code from laptop to GitHub

message=${1:-'Edited files'}    

git add .
git commit -m "$message"
git push


