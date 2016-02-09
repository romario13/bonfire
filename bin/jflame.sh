#!/usr/bin/env bash

set -e

#script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# default properties
TYPE=all
PROCESS_TYPE=all
GRAPH_TYPE=html
PID=
DOCKER=

# get arguments
count=0
for arg
do
    count=$(($count+1)) #update counter
    case "$arg" in
        -p)
            PROCESS_TYPE=process
            shift
            PID=$1
            shift
            ;;
        -g)
            shift
            GRAPH_TYPE=$1
            shift
            ;;
        -d)
            PROCESS_TYPE=docker
            shift
            DOCKER=$1
            PID=$(docker inspect -f '{{ .State.Pid }}' $DOCKER)
            shift
            ;;
        --help)
            echo "" >&2
            echo "Usage: $0 [-d docker_id | -p process_id] [-g graph_type] [type]" >&2
            echo "      graph_type:" >&2
            echo "          svg - svg Flame graph stack collapse and generator by Brendan Gregg." >&2
            echo "                  https://github.com/brendangregg/FlameGraph." >&2
            echo "          html - single html Flame graph stack collapse and generator by Sarychev Roman " >&2
            echo "                  https://github.com/romario13/bonfire" >&2
            echo "      type:" >&2
            echo "          all: (default) collect all CPU stack traces every 99Hz." >&2
            echo "          faults: collect all stack traces on page-faults event." >&2
            echo "          disk-io: collect all stack traces on events: " >&2
            echo "              block:block_rq_insert,block:block_rq_complete --filter 'rwbs ~ "*W*"'." >&2
            # TODO: add type "no" and skip profiling phase. create only gpath on existing data
            # TODO: add any other types (mem-stores, tcp-send)
            # TODO: add capability to use -e <filter>
            echo "  If -d and -p arguments are omitted then all processes will be profiled.">&2
            exit 3
        ;;
        #TODO: add options: -f <file-name> and -c to clean after execution
    esac
done

# check type
if [ ! -z "$1" ];
    then TYPE=$1
fi
TYPE_LIST="all faults disk-io tcp-send mem-stores"
if [[ ! $TYPE_LIST =~ $TYPE ]];
    then echo "ERROR: type should be one of [$TYPE_LIST]. use $0 --help" >&2; exit 3
fi

#check graph type
GRAPH_TYPE_LIST="svg html"
if [[ ! $GRAPH_TYPE_LIST =~ $GRAPH_TYPE ]];
    then echo "ERROR: graph type should be one of [$GRAPH_TYPE_LIST]. use $0 --help" >&2; exit 3
fi

# clean data
sudo rm -f perf.data
sudo rm -f /tmp/perf-*

# calculate process event filter
if [ ! -z "$PID" ];
    then PID_FILTER="-p $PID"
    else PID_FILTER="-a"
fi

echo "TYPE=$TYPE PROCESS_TYPE=$PROCESS_TYPE PID=$PID DOCKER=$DOCKER PID_FILTER=$PID_FILTER GRAPH_TYPE=$GRAPH_TYPE" >&2

# start profiler
case "$TYPE" in
    all)
        sudo perf record -F 99 ${PID_FILTER} -g -- sleep 10
        ;;
    faults)
        sudo perf record ${PID_FILTER} -e page-faults -g -- sleep 10
        ;;
    disk-io)
        # Trace all block insertions and completions, all types of writes, for 10 seconds
        sudo perf record ${PID_FILTER} -e 'block:*' -g -- sleep 20
        ;;
    tcp-send)
        set +e
        sudo perf probe tcp_sendmsg
        sudo perf record ${PID_FILTER} -e probe:tcp_sendmsg -g -- sleep 1
        sudo perf probe --del tcp_sendmsg
        set -e
        ;;
    mem-stores)
        sudo perf record ${PID_FILTER} -e mem-stores -g -- sleep 10
        ;;
esac

# TODO: if we have no -d and -p arguments we should have to collect symbol maps from all java processes
# collect java symbols
case "$PROCESS_TYPE" in
    process)
        $DIR/../lib/create-java-perf-map.sh $PID "unfold"
        ;;
    docker)
        sudo docker exec ${DOCKER} rm -f tmp/perf-1.map
        sudo docker exec ${DOCKER} jperf-map.sh
        sudo docker cp ${DOCKER}:/tmp/perf-1.map /tmp/perf-${PID}.map
#Failed to open /usr/lib/jvm/java-8-oracle/jre/lib/amd64/server/libjvm.so, continuing without symbols
#Failed to open /usr/lib/jvm/java-8-oracle/jre/lib/amd64/libnio.so, continuing without symbols
#Failed to open /usr/lib/jvm/java-8-oracle/jre/lib/amd64/libjava.so, continuing without symbols
#Failed to open /usr/lib/jvm/java-8-oracle/jre/lib/amd64/libnet.so, continuing without symbols
        ;;
esac


# produce flame graph
case "$GRAPH_TYPE" in
    html)
        sudo perf script| $DIR/../bonfire
        ;;
    svg)
        sudo perf script| $DIR/../lib/FlameGraph/stackcollapse-perf.pl --kernel| \
        $DIR/../lib/FlameGraph/flamegraph.pl "--title=Flame Graph (type=$TYPE)" --color=java --hash
        ;;
esac
