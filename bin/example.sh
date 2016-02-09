#!/usr/bin/env bash

set -e

CUR_DIR=$( pwd )
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXAMPLE=$1
shift
WAIT_BEFORE_PROFILE=10

echo "Start java process" >&2
cd $DIR/../lib/bonfire-java-examples/tests
java -XX:+PreserveFramePointer -XX:MaxInlineSize=0 -XX:InlineSmallCode=0 -Xms512m -Xmx512m $EXAMPLE &
#-XX:MaxInlineSize=0 -XX:InlineSmallCode=0 -XX:+UnlockDiagnosticVMOptions

#java -XX:+PreserveFramePointer $EXAMPLE &

PID=$!
cd $CUR_DIR

echo "Java process $PID started. Wait $WAIT_BEFORE_PROFILE second(s) before profile it" >&2
sleep $WAIT_BEFORE_PROFILE

echo "Start profiling" >&2
set +e
$DIR/jflame.sh -p $PID $@
set -e

echo "Kill process" >&2
kill $PID

echo "Done." >&2

#perf trace -e syscalls:sys_enter_futex -e syscalls:sys_exit_futex
#
#add -g to get the callchains. From there perf-script will dump the events.
