#!/usr/bin/env bash

if [[ ! "one two three" =~ $1 ]];
    then echo "no"
    else echo "yes"
fi
