#!/usr/bin/env bash

rm graphs/cpu-all.html;  bin/example.sh examples.CPU -g html all >> graphs/cpu-all.html
rm graphs/diskio-diskio.html; bin/example.sh examples.DiskIO -g html disk-io >> graphs/diskio-diskio.html
rm graphs/mem-faults.html;  bin/example.sh examples.Mem -g html faults >> graphs/mem-faults.html
rm graphs/mem-all.html;  bin/example.sh examples.Mem -g html all >> graphs/mem-all.html