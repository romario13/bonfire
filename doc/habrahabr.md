# Docker

    docker run --privileged -ti --name perfdock ubuntu:trusty bash
    apt-get update && apt-get install linux-tools-common linux-tools-`uname -r`
    perf record -F 99 -a -g -- sleep 10



