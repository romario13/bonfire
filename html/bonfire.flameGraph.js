bonfire = {};

(function () {
    'use strict';

    bonfire.flameGraph = function () {

        var width = window.screen.availWidth * 0.97;
        var height = window.screen.availHeight * 0.80;
        var cellHeight = 18;
        var data = {};
        var placeId = "flameGraph";
        var detailsId = "details";
        var matchedId = "matched";
        var matchedSum = -1;
        var searchFunc;
        var colorFunc = function (name) {
            return "#888888";
        };

        var graphMap = {};
        var colorMap = {};
        var cropTextCache = {};
        var clearGraph;
        var lastZoomFunction;
        var zoomPath;
        var maxEvents = 0;

        var libraryNameRegexp = new RegExp("/\([^()]*\)");

        function pub() {
            return pub;
        }

        pub.draw = function () {

            // one time calculation of color for each function name
            for (var i = 0; i < data.dict.length; i++) {
                colorMap[i] = colorPalette(data.dict[i], colorFunc(data.dict[i]));
            }

            internalDraw();
            return pub;
        };

        pub.update = function () {
            internalDraw();
            return pub;
        };

        function internalDraw() {
            graphMap = {};
            var canvas = document.createElement('canvas');

            canvas.width = width;
            canvas.height = height;
            canvas.style.backgroundColor = "#EEEEEE";

            var div = document.getElementById(placeId);
            var oldCanvas = div.children[0];
            if (oldCanvas) {
                div.replaceChild(canvas, oldCanvas);
            } else {
                div.appendChild(canvas);
            }

            var ctx = canvas.getContext("2d");

            var txtOffset = cellHeight / 6;
            var txtWidthDiff = txtOffset * 2;
            var txtFont = Math.floor(cellHeight - txtWidthDiff) + "px Arial";

            maxEvents = data.flame[1];

            // calculate percentage of searched items
            var sum = 0;

            function searchInner(dataItem) {

                if (searchFunc(data.dict[dataItem[0]])) {
                    sum += dataItem[1];
                } else {
                    if (dataItem.length > 2) {
                        for (var i = 2; i < dataItem.length; i++) {
                            searchInner(dataItem[i]);
                        }
                    }
                }
            }

            if (matchedSum == -1) {
                if (searchFunc) {
                    searchInner(data.flame);
                    matchedSum = sum;
                    setMatchPercentage("Matched:&nbsp;" + sum.toLocaleString() + "&nbsp;samples,&nbsp;" +
                        (sum / data.flame[1] * 100).toFixed(2) + "%");
                } else {
                    setMatchPercentage("");
                }
            }

            function drawFlame(level, yOffset, xOffset, xMax, parentEventsCount, dataItem, number, parentItemInMap,
                               copyOfSelectedPath) {

                var itemWidth = xMax;

                // calculate size for not selected function
                if (!copyOfSelectedPath) {
                    itemWidth = (dataItem[1] / parentEventsCount) * xMax;
                } else {
                    copyOfSelectedPath = copyOfSelectedPath.slice(1);
                    if (copyOfSelectedPath.length == 0) {
                        copyOfSelectedPath = null;
                    }
                }

                var c;
                if (searchFunc && searchFunc(data.dict[dataItem[0]])) {
                    c = [230, 0, 230];
                } else {
                    c = colorMap[dataItem[0]];
                }

                if (copyOfSelectedPath) {
                    c = colorOpacity(c, 0.5);
                }

                ctx.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";

                var rectWidth = itemWidth - 1;
                if (rectWidth < 0.5) {
                    rectWidth = 0.5;
                }

                ctx.fillRect(xOffset, yOffset, rectWidth, -cellHeight);

                // store rect coordinates in map
                var itemInMap = {
                    x: xOffset,
                    y: yOffset,
                    w: rectWidth + 1,
                    h: -cellHeight,
                    d: dataItem,
                    n: number,
                    p: parentItemInMap
                };

                getItemsInLevel(level).push(itemInMap);

                var txtWidth = itemWidth - txtWidthDiff;
                var txt = data.dict[dataItem[0]];
                ctx.fillStyle = "#000000";
                ctx.font = txtFont;
                txt = cropText(ctx, txt, txtWidth, dataItem[0]);

                function cropText(ctx, txt, txtWidth, id) {

                    var cacheKey = id + "#" + txtWidth;
                    var cachedValue = cropTextCache[cacheKey];
                    if (typeof cachedValue != 'undefined') {
                        return txt.substring(0, cachedValue);
                    }

                    // fixme: This is very expensive approach of string cropping to required width
                    if (ctx.measureText(txt).width > txtWidth) {
                        var step = Math.floor(txt.length / 2);
                        var direction = -1;

                        if (step == 0) {
                            txt = "";
                        } else {

                            var point = txt.length;
                            var newTxt;
                            var oldDirection = step;
                            while (true) {
                                point = point + step * direction;
                                newTxt = txt.substring(0, point);

                                if (point == 0) {
                                    break;
                                }

                                var big = ctx.measureText(newTxt).width > txtWidth;

                                if (direction == -1) {
                                    if (!big) {
                                        direction = 1;
                                    }
                                } else {
                                    if (big) {
                                        direction = -1;
                                    }
                                }

                                step = Math.floor(step / 2);
                                if (step < 1) {
                                    step = 1;
                                }

                                if (!big && step == 1 && oldDirection == -direction) {
                                    break;
                                }

                                oldDirection = direction;
                            }

                            txt = newTxt;
                        }
                    }

                    cropTextCache[cacheKey] = txt.length;
                    return txt;
                }

                if (txt.length > 0) {
                    ctx.fillText(txt, xOffset + txtOffset, yOffset - txtWidthDiff, txtWidth);
                }

                // has no child elements
                if (dataItem.length == 2) {
                    return itemWidth;
                }

                var sumChildEvents = 0;
                for (var i = 2; i < dataItem.length; i++) {
                    sumChildEvents += dataItem[i][1];
                }

                // one middle pixel for each child event
                var allChildWidth = 0;

                // zoom function
                if (copyOfSelectedPath) {
                    allChildWidth = xMax
                } else {
                    //- (dataItem.length - 3)
                    allChildWidth = (sumChildEvents / dataItem[1]) * itemWidth;
                    //- (dataItem.length - 3)
                    xOffset += (itemWidth - allChildWidth);
                }

                for (var i = 2; i < dataItem.length; i++) {

                    var shouldBreak = false;

                    // skip not selected functions
                    if (copyOfSelectedPath) {
                        if (i - 2 != copyOfSelectedPath[0]) {
                            continue;
                        }

                        shouldBreak = true;
                    }

                    xOffset += drawFlame(level + 1, yOffset - cellHeight - 1, xOffset,
                        allChildWidth, sumChildEvents, dataItem[i], i - 2, itemInMap, copyOfSelectedPath);

                    if (shouldBreak) {
                        break;
                    }
                }

                return itemWidth;
            }

            var xOffset = cellHeight;
            var yOffset = height - cellHeight;

            // copy selected stack of events
            var copyOfSelectedPath;
            if (zoomPath) {
                copyOfSelectedPath = zoomPath.slice();
                if (copyOfSelectedPath.length == 0) {
                    copyOfSelectedPath = null;
                }
            }
            drawFlame(1, yOffset, xOffset, width - 2 * cellHeight, maxEvents, data.flame, 0, null, copyOfSelectedPath);

            // store original graph
            clearGraph = ctx.getImageData(0, 0, width, height);

            // restore original graph
            function restoreGraph() {

                if (lastZoomFunction) {
                    // restore original graph
                    ctx.putImageData(clearGraph, 0, 0);
                    lastZoomFunction = null;
                    setDetails("");
                }
            }


            canvas.addEventListener("mousemove", function (event) {

                var selectedItem = getSelectedItem(event.clientX, event.clientY);

                if (!selectedItem) {
                    restoreGraph();
                    return;
                }

                // skip already focused
                if (lastZoomFunction == selectedItem) {
                    return;
                }

                // restore original graph
                restoreGraph();

                lastZoomFunction = selectedItem;

                var eventPercentage = ((lastZoomFunction.d[1] / maxEvents) * 100).toFixed(2);

                setDetails(data.dict[lastZoomFunction.d[0]] + " (" + lastZoomFunction.d[1].toLocaleString() +
                    " samples, " + eventPercentage + "%)");

                ctx.beginPath();
                ctx.strokeStyle = "#000000";
                ctx.rect(lastZoomFunction.x, lastZoomFunction.y, lastZoomFunction.w, lastZoomFunction.h);
                ctx.closePath();
                ctx.stroke();

            }, false);


            canvas.addEventListener("click", function (event) {

                var selectedItem = getSelectedItem(event.clientX, event.clientY);

                if (!selectedItem) {
                    return;
                }

                var path = [];

                while (true) {
                    path.push(selectedItem.n);
                    if (selectedItem.p) {
                        selectedItem = selectedItem.p;
                    } else {
                        break
                    }
                }

                zoomPath = path.reverse();
                internalDraw();

            }, false);

            function getSelectedItem(clientX, clientY) {
                var rect = canvas.getBoundingClientRect();
                var x = clientX - rect.left;
                var y = clientY - rect.top;

                var level = Math.ceil((yOffset - y) / (cellHeight + 1));

                var itemsInLevel = getItemsInLevel(level);
                if (itemsInLevel.length == 0) {
                    return;
                }

                for (var i = 0; i < itemsInLevel.length; i++) {
                    if (itemsInLevel[i].x <= x && itemsInLevel[i].x + itemsInLevel[i].w >= x) {
                        return itemsInLevel[i];
                    }
                }

            }

            function setDetails(t) {
                var details = document.getElementById(detailsId);
                if (details) {
                    if (t === "") {
                        details.innerHTML = '&nbsp;';
                    } else {
                        details.innerHTML = t;
                    }
                }

                canvas.title = t;
            }

            function setMatchPercentage(t) {
                var matchPersantage = document.getElementById(matchedId);
                if (matchPersantage) {
                    if (t === "") {
                        matchPersantage.innerHTML = '&nbsp;';
                    } else {
                        matchPersantage.innerHTML = t;
                    }
                }

                canvas.title = t;
            }

            return pub;
        }

        var colorSchema = {
            // color: [red, +red vector, greed, +greed vector, blue, +blue vector]
            red: [200, 55, 80, 50, 80, 50],
            green: [50, 60, 200, 55, 50, 60],
            blue: [80, 60, 80, 60, 205, 50],
            yellow: [175, 55, 175, 55, 50, 20],
            purple: [190, 65, 80, 60, 190, 65],
            aqua: [50, 60, 165, 55, 165, 55],
            orange: [190, 65, 90, 65, 0, 0],
            black: [0, 0, 0, 0, 0, 0]
        };

        function colorPalette(name, colorName) {
            var hash = hashCode(name);

            var c = colorSchema[colorName];
            if (!c) {
                c = colorSchema.black;
            }

            var r = c[0];
            if (c[1] > 0) {
                r += hash % c[1];
            }
            var g = c[2];
            if (c[3] > 0) {
                g += hash % c[3];
            }
            var b = c[4];
            if (c[5] > 0) {
                b += hash % c[5];
            }
            return [r, g, b];
        }

        function hashCode(name) {
            var h = 0;
            if (name.length > 0) {
                for (var i = 0; i < name.length; i++) {
                    h = 31 * h + name.charCodeAt(i);
                }
            }
            return h;
        }

        function colorOpacity(c, opacity) {
            var newC = c.slice();
            for (var i = 0; i < 3; i++) {
                newC[i] += Math.round((255 - c[i]) * opacity);
            }

            return newC;
        }

        function colorJava(name) {

            var libraryNameMatch = name.match(libraryNameRegexp);
            var libraryName;
            if (libraryNameMatch) {
                libraryName = libraryNameMatch.pop();
                name = name.replace(libraryNameRegexp, "");
            }

            if (libraryName && (
                libraryName.indexOf("jdk") != -1 ||
                libraryName.indexOf("jre") != -1 ||
                libraryName.indexOf("jvm") != -1)) {
                return "yellow";
            }
            if (name.indexOf("/") != -1 ||
                (libraryName && libraryName.indexOf("tmp/perf-") != -1)) {
                return "green";
            }
            if (name.indexOf("([k") != -1) {
                return "orange";
            }

            return "red";
        }

        function getItemsInLevel(level) {
            var itemsInLevel = graphMap[level];

            if (!itemsInLevel) {
                itemsInLevel = [];
                graphMap[level] = itemsInLevel;
            }

            return itemsInLevel;
        }

        pub.detailsId = function (_) {
            if (!arguments.length) {
                return detailsId;
            }
            detailsId = _;
            return pub;
        };

        pub.height = function (_) {
            if (!arguments.length) {
                return height;
            }

            height = _;
            return pub;
        };

        pub.autoHeight = function () {
            var maxDeep = deepLoop(data.flame, 1);

            function deepLoop(dataItem, currDeep) {
                var maxDeepInLevel = currDeep;

                if (dataItem.length > 2) {
                    for (var i = 2, len = dataItem.length; i < len; i++) {

                        var pathDeep = deepLoop(dataItem[i], currDeep + 1);

                        if (pathDeep > maxDeepInLevel) {
                            maxDeepInLevel = pathDeep;
                        }
                    }
                }

                return maxDeepInLevel;
            }

            height = (maxDeep + 2) * (cellHeight + 1);
            return pub;
        };

        pub.width = function (_) {
            if (!arguments.length) {
                return width;
            }

            width = _;
            return pub;
        };

        pub.cellHeight = function (_) {
            if (!arguments.length) {
                return cellHeight;
            }

            // minus one pixel of row delimiter
            cellHeight = _ - 1;
            return pub;
        };

        pub.placeId = function (_) {
            if (!arguments.length) {
                return placeId;
            }

            placeId = _;
            return pub;
        };

        pub.data = function (_) {
            if (!arguments.length) {
                return data;
            }

            data = _;
            return pub;
        };

        pub.color = function (_) {
            if (!arguments.length) {
                return colorFunc;
            }
            if (_ === "java") {
                colorFunc = colorJava;
            }
            return pub;
        };

        pub.search = function (_) {

            if (!arguments.length) {
                return searchFunc;
            }

            if (_ == null || typeof _ === "function") {
                searchFunc = _;
                matchedSum = -1;
            }

            return pub;
        };

        pub.resetZoom = function () {
            zoomPath = null;
            return pub;
        };

        return pub;
    }

})();