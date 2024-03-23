/// https://github.com/tomshanley/d3-sankeyCircular-circular
// fork of https://github.com/d3/d3-sankeyCircular copyright Mike Bostock
import { ascending, min, max, mean, sum } from "d3-array";
import { map, nest } from "d3-collection";
import findCircuits from "elementary-circuits-directed-graph";

// returns a function, using the parameter given to the sankey setting
function constant(x) {
    return function() {
      return x;
    };
}

// The depth of a node when the nodeAlign (align) is set to 'justify'
function justify(node, n) {
    return node.sourceLinks.length ? node.depth : n - 1;
}

function left(node, n) {
    return node.targetLinks.length ? node.depth : 0;
}

function none(node, n) {
    return node.depth;
}

// sort links' breadth (ie top to bottom in a column), based on their source nodes' breadths
function ascendingSourceBreadth(a, b) {
    return ascendingBreadth(a.source, b.source) || a.index - b.index
}

// sort links' breadth (ie top to bottom in a column), based on their target nodes' breadths
function ascendingTargetBreadth(a, b) {
    return ascendingBreadth(a.target, b.target) || a.index - b.index
}

// sort nodes' breadth (ie top to bottom in a column)
// if both nodes have circular links, or both don't have circular links, then sort by the top (y0) of the node
// else push nodes that have top circular links to the top, and nodes that have bottom circular links to the bottom
function ascendingBreadth(a, b) {
    if (a.partOfCycle || b.partOfCycle) {
        if (a.partOfCycle === b.partOfCycle) {
            return a.y0 - b.y0
        } else {
            if (a.circularLinkType === 'top' || b.circularLinkType === 'bottom') {
                return -1
            } else {
                return 1
            }
        }
    }
    else {
        return byYLinks(a, b)
    }
}

// return the value of a node or link
function value(d) {
    return d.value
}

// return the vertical center of a node
function nodeCenter(node) {
    return (node.y0 + node.y1) / 2
}

// return the vertical center of a link's source node
function linkSourceCenter(link) {
    return nodeCenter(link.source)
}

// return the vertical center of a link's target node
function linkTargetCenter(link) {
    return nodeCenter(link.target)
}


// Return the default value for ID for node, d.index
function defaultId(d) {
    return d.index
}

// Return the default object the graph's nodes, graph.nodes
function defaultNodes(graph) {
    return graph.nodes
}

// Return the default object the graph's nodes, graph.links
function defaultLinks(graph, logarithmic) {
    graph.links.forEach(gl => {
        gl.real_value = gl.value;
        gl.value = logarithmic ? Math.log(gl.value + 1) : gl.value;
    });
    return graph.links
}

// Return the node from the collection that matches the provided ID, or throw an error if no match
function find(nodeById, id) {
    var node = nodeById.get(id)
    if (!node) throw new Error('missing: ' + id)
    return node
}

function getNodeID(node, id) {
    return id(node)
}

// The main sankeyCircular functions

// Some constants for circular link calculations
var verticalMargin = 10;
var baseRadius = 1;
var scale = 0.4; //Possibly let user control this, although anything over 0.5 starts to get too cramped


export const Plot = function () {
    // Set the default values
    var x0 = 0,
        y0 = 0,
        x1 = 1,
        y1 = 1, // extent
        dx = 24, // nodeWidth
        py, // nodePadding, for vertical postioning
        id = defaultId,
        align = none,
        nodes = defaultNodes,
        links = defaultLinks,
        iterations = 20,
        circularLinkGap = 2,
        paddingRatio,
        sortNodes = null

    function sankeyCircular(graphData, logarithmic = false) {
        return new Promise(async (resolve) => {
            var graph = {
                nodes: nodes(graphData),
                links: links(graphData, logarithmic)
            }
            // Process the graph's nodes and links, setting their positions
            // 1.  Associate the nodes with their respective links, and vice versa
            computeNodeLinks(graph)
    
            // 2.  Determine which links result in a circular path in the graph
            identifyCircles(graph, id, sortNodes)
    
            // 4. Calculate the nodes' values, based on the values of the incoming and outgoing links
            computeNodeValues(graph)
    
            // 5.  Calculate the nodes' depth based on the incoming and outgoing links
            //     Sets the nodes':
            //     - depth:  the depth in the graph
            //     - column: the depth (0, 1, 2, etc), as is relates to visual position from left to right
            //     - x0, x1: the x coordinates, as is relates to visual position from left to right
            computeNodeDepths(graph)
    
            // 3.  Determine how the circular links will be drawn,
            //     either travelling back above the main chart ("top")
            //     or below the main chart ("bottom")
            selectCircularLinkTypes(graph, id)
    
            // 6.  Calculate the nodes' and links' vertical position within their respective column
            //     Also readjusts sankeyCircular size if circular links are needed, and node x's
            computeNodeBreadths(graph, iterations, id)
            computeLinkBreadths(graph)
    
            spreadNodes(graph, py)
            
            // 7.  Sort links per node, based on the links' source/target nodes' breadths
            // 8.  Adjust nodes that overlap links that span 2+ columns
            var linkSortingIterations = iterations;
            for (var iteration = 0; iteration < linkSortingIterations; iteration++) {
                resolveNodeLinkOverlaps(graph, y0, y1, id);
                deTangle(graph);   
                spreadNodes(graph, py)
                
                await yieldControl();
            }

            sortSourceLinks(graph, y1, id);
            sortTargetLinks(graph, y1, id);
    
            resolve(graph);
        })
    } // end of sankeyCircular function

    function yieldControl() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    // Set the sankeyCircular parameters
    // nodeID, nodeAlign, nodeWidth, nodePadding, nodes, links, size, extent, iterations, nodePaddingRatio, circularLinkGap
    sankeyCircular.nodeId = function (_) {
        return arguments.length
            ? ((id = typeof _ === 'function' ? _ : constant(_)), sankeyCircular)
            : id
    }

    sankeyCircular.nodeAlign = function (_) {
        return arguments.length
            ? ((align = typeof _ === 'function' ? _ : constant(_)), sankeyCircular)
            : align
    }

    sankeyCircular.nodeWidth = function (_) {
        return arguments.length ? ((dx = +_), sankeyCircular) : dx
    }

    sankeyCircular.nodePadding = function (_) {
        return arguments.length ? ((py = +_), sankeyCircular) : py
    }

    sankeyCircular.nodes = function (_) {
        return arguments.length
            ? ((nodes = typeof _ === 'function' ? _ : constant(_)), sankeyCircular)
            : nodes
    }

    sankeyCircular.links = function (_) {
        return arguments.length
            ? ((links = typeof _ === 'function' ? _ : constant(_)), sankeyCircular)
            : links
    }

    sankeyCircular.size = function (_) {
        return arguments.length
            ? ((x0 = y0 = 0), (x1 = +_[0]), (y1 = +_[1]), sankeyCircular)
            : [x1 - x0, y1 - y0]
    }

    sankeyCircular.extent = function (_) {
        return arguments.length
            ? ((x0 = +_[0][0]), (x1 = +_[1][0]), (y0 = +_[0][1]), (y1 = +_[1][1]), sankeyCircular)
            : [[x0, y0], [x1, y1]]
    }

    sankeyCircular.iterations = function (_) {
        return arguments.length ? ((iterations = +_), sankeyCircular) : iterations
    }

    sankeyCircular.circularLinkGap = function (_) {
        return arguments.length
            ? ((circularLinkGap = +_), sankeyCircular)
            : circularLinkGap
    }

    sankeyCircular.nodePaddingRatio = function (_) {
        return arguments.length ? ((paddingRatio = +_), sankeyCircular) : paddingRatio
    }

    sankeyCircular.sortNodes = function (_) {
        return arguments.length ? ((sortNodes = _), sankeyCircular) : sortNodes
    }

    sankeyCircular.update = function (graph) {
        selectCircularLinkTypes(graph, id)
        computeLinkBreadths(graph)

        // Force position of circular link type based on position
        graph.links.forEach(function (link) {
            if (link.circular) {
                link.circularLinkType = (link.y0 + link.y1 < y1)
                    ? 'top'
                    : 'bottom'

                link.source.circularLinkType = link.circularLinkType
                link.target.circularLinkType = link.circularLinkType
            }
        })

        sortSourceLinks(graph, y1, id, false) // Sort links but do not move nodes
        sortTargetLinks(graph, y1, id)
        return graph
    }

    // Populate the sourceLinks and targetLinks for each node.
    // Also, if the source and target are not objects, assume they are indices.
    function computeNodeLinks(graph) {
        graph.nodes.forEach(function (node, i) {
            node.index = i
            node.sourceLinks = []
            node.targetLinks = []
        })
        var nodeById = map(graph.nodes, id)
        graph.links.forEach(function (link, i) {
            link.index = i
            var source = link.source
            var target = link.target
            if (typeof source !== 'object') {
                source = link.source = find(nodeById, source)
            }
            if (typeof target !== 'object') {
                target = link.target = find(nodeById, target)
            }
            source.sourceLinks.push(link)
            target.targetLinks.push(link)
        })
        return graph
    }

    // Compute the value (size) and cycleness of each node by summing the associated links.
    function computeNodeValues(graph) {
        graph.nodes.forEach(function (node) {
            node.partOfCycle = false
            node.value = Math.max(
                sum(node.sourceLinks, value),
                sum(node.targetLinks, value)
            )
            node.sourceLinks.forEach(function (link) {
                if (link.circular) {
                    node.partOfCycle = true
                    node.circularLinkType = link.circularLinkType
                }
            })
            node.targetLinks.forEach(function (link) {
                if (link.circular) {
                    node.partOfCycle = true
                    node.circularLinkType = link.circularLinkType
                }
            })
        })
    }

    function getCircleMargins(graph) {
        var totalTopLinksWidth = 0,
            totalBottomLinksWidth = 0,
            totalRightLinksWidth = 0,
            totalLeftLinksWidth = 0;
        const maxDepth = graph.nodes.reduce((p,c) => Math.max(p, c.depth),1) / 3;
        const maxLabel = graph.nodes.reduce((p,c) => Math.max(p, c.name.length),0) * -2 * maxDepth;
        
        var maxColumn = max(graph.nodes, function (node) {
            return node.column
        })

        graph.links.forEach(function (link) {
            if (link.circular) {
                if (link.circularLinkType == 'top') {
                    totalTopLinksWidth = totalTopLinksWidth + link.width
                } else {
                    totalBottomLinksWidth = totalBottomLinksWidth + link.width
                }

                if (link.target.column == 0) {
                    totalLeftLinksWidth = totalLeftLinksWidth + link.width
                }

                if (link.source.column == maxColumn) {
                    totalRightLinksWidth = totalRightLinksWidth + link.width
                }
            }
        })

        //account for radius of curves and padding between links
        totalTopLinksWidth = totalTopLinksWidth > 0 ? totalTopLinksWidth + verticalMargin + baseRadius : totalTopLinksWidth;
        totalBottomLinksWidth = totalBottomLinksWidth > 0 ? totalBottomLinksWidth + verticalMargin + baseRadius : totalBottomLinksWidth;
        totalRightLinksWidth = totalRightLinksWidth > 0 ? totalRightLinksWidth + verticalMargin + baseRadius : totalRightLinksWidth;
        totalLeftLinksWidth = totalLeftLinksWidth > 0 ? totalLeftLinksWidth + verticalMargin + baseRadius : totalLeftLinksWidth;
        return { "top": totalTopLinksWidth, "bottom": totalBottomLinksWidth, "left": Math.min(maxLabel, totalLeftLinksWidth), "right": Math.min(maxLabel, totalRightLinksWidth) }

    }

    // Update the x0, y0, x1 and y1 for the sankeyCircular, to allow space for any circular links
    function scaleSankeySize(graph, margin) {

        var maxColumn = max(graph.nodes, function (node) {
            return node.column
        })

        var currentWidth = x1 - x0;
        var currentHeight = y1 - y0;

        var newWidth = currentWidth + margin.right + margin.left;
        var newHeight = currentHeight + margin.top + margin.bottom;

        var scaleX = currentWidth / newWidth;
        var scaleY = currentHeight / newHeight;

        x0 = (x0 * scaleX) + (margin.left);
        x1 = margin.right == 0 ? x1 : x1 * scaleX;
        y0 = (y0 * scaleY) + (margin.top);
        y1 = y1 * scaleY;

        graph.nodes.forEach(function (node) {
            node.x0 = x0 + (node.column * ((x1 - x0 - dx) / maxColumn))
            node.x1 = node.x0 + dx
        })

        return scaleY;

    }

    // Iteratively assign the depth for each node.
    function computeNodeDepths(graph) {
        var nodes, next, x

        for (
            (nodes = graph.nodes), (next = []), (x = 0);
            nodes.length;
            ++x, (nodes = next), (next = [])
        ) {
            nodes.forEach(function (node) {
                node.depth = x
                node.sourceLinks.forEach(function (link) {
                    if (next.indexOf(link.target) < 0 && !link.circular) {
                        next.push(link.target)
                    }
                })
            })
        }

        // Push any source only nodes as close to it's  deepest target
        graph.nodes.forEach(node => {
            if (!node.targetLinks.length) {
                node.depth = Math.max(...node.sourceLinks.map(l => l.target.depth)) - 1
            }
        })

        // With the above depth processed, use the deepest nodes to pull their incoming nodes as deep as possible
        graph.nodes.sort((a,b) => {
            return b.depth - a.depth;
        }).forEach((node, i) => {
            node.sourceLinks.sort((a,b) => a.target.depth - b.target.depth);
            const t_nodes = node.sourceLinks.filter(n => !n.circular);
            t_nodes.length && (graph.nodes[i].depth = t_nodes[0].target.depth -1)
        });

        for (
            (nodes = graph.nodes), (next = []), (x = 0);
            nodes.length;
            ++x, (nodes = next), (next = [])
        ) {
            nodes.forEach(function (node) {
                node.height = x
                node.targetLinks.forEach(function (link) {
                    if (next.indexOf(link.source) < 0 && !link.circular) {
                        next.push(link.source)
                    }
                })
            })
        }

        // assign column numbers, and get max value
        graph.nodes.forEach(function (node) {
            node.column = sortNodes !== null ? node[sortNodes] : Math.floor(align.call(null, node, x))
        })
    }

    // Assign nodes' breadths, and then shift nodes that overlap (resolveCollisions)
    function computeNodeBreadths(graph, iterations, id) {
        var columns = nest()
            .key(function (d) {
                return d.column
            })
            .sortKeys(ascending)
            .entries(graph.nodes)
            .map(function (d) {
                return d.values
            });
        
        initializeNodeBreadth(id);

        function initializeNodeBreadth(id) {
            //override py if nodePadding has been set
            if (paddingRatio) {
                var padding = Infinity
                columns.forEach(function (nodes) {
                    var thisPadding = y1 * paddingRatio / (nodes.length + 1)
                    padding = thisPadding < padding ? thisPadding : padding
                })
                py = padding
            }

            var ky = min(columns, function (nodes) {
                return (y1 - y0 - (nodes.length - 1) * py) / sum(nodes, value)
            })

            //calculate the widths of the links
            ky = ky * scale
            graph.links.forEach(function (link) {
                link.width = link.value * ky
            })
            //determine how much to scale down the chart, based on circular links
            var margin = getCircleMargins(graph)
            var ratio = scaleSankeySize(graph, margin);
            
            //re-calculate widths
            ky = ky * ratio

            graph.links.forEach(function (link) {
                link.width = link.value * ky
            })

            // Assign node height based on value and scale
            // Nodes are initially all set at the top (y0) of the graph
            columns.forEach(function (nodes) {
                nodes.forEach(function (node) {
                    node.y0 = y0
                    node.y1 = node.y0 + node.value * ky
                })
            })
        }
    }

    // Assign the links y0 and y1 based on source/target nodes position,
    // plus the link's relative position to other links to the same node
    function computeLinkBreadths(graph) {
        graph.nodes.forEach(function (node) {
            node.sourceLinks.sort(ascendingTargetBreadth)
            node.targetLinks.sort(ascendingSourceBreadth)
        })
        graph.nodes.forEach(function (node) {
            var y0 = node.y0
            var y1 = y0

            // start from the bottom of the node for cycle links
            var y0cycle = node.y1
            var y1cycle = y0cycle

            node.sourceLinks.forEach(function (link) {
                if (link.circular) {
                    link.y0 = y0cycle - link.width / 2
                    y0cycle = y0cycle - link.width
                } else {
                    link.y0 = y0 + link.width / 2
                    y0 += link.width
                }
            })
            node.targetLinks.forEach(function (link) {
                if (link.circular) {
                    link.y1 = y1cycle - link.width / 2
                    y1cycle = y1cycle - link.width
                } else {
                    link.y1 = y1 + link.width / 2
                    y1 += link.width
                }
            })
        })
    }

    return sankeyCircular;

}

/// /////////////////////////////////////////////////////////////////////////////////
// Cycle functions
// portion of code to detect circular links based on Colin Fergus' bl.ock https://gist.github.com/cfergus/3956043

// Identify circles in the link objects
function identifyCircles(graph, id, sortNodes) {
    var circularLinkID = 0
    if (sortNodes === null) {

        // Building adjacency graph
        var adjList = []
        for (var i = 0; i < graph.links.length; i++) {
            var link = graph.links[i];
            var source = link.source.index;
            var target = link.target.index;
            if (!adjList[source]) adjList[source] = []
            if (!adjList[target]) adjList[target] = []

            // Add links if not already in set
            if (adjList[source].indexOf(target) === -1) adjList[source].push(target);
        }

        // Find all elementary circuits
        var cycles = findCircuits(adjList);

        // Sort by circuits length
        cycles.sort(function (a, b) {
            return a.length - b.length;
        });

        var circularLinks = {};
        for (i = 0; i < cycles.length; i++) {
            var cycle = cycles[i];
            var last = cycle.slice(-2);
            if (!circularLinks[last[0]]) circularLinks[last[0]] = {};
            circularLinks[last[0]][last[1]] = true
        }

        graph.links.forEach(function (link) {
            var target = link.target.index;
            var source = link.source.index;
            // If self-linking or a back-edge
            if (target === source || (circularLinks[source] && circularLinks[source][target])) {
                link.circular = true
                link.circularLinkID = circularLinkID
                circularLinkID = circularLinkID + 1
            } else {
                link.circular = false
            }
        })
    } else {
        graph.links.forEach(function (link) {
            if (link.source[sortNodes] < link.target[sortNodes]) {
                link.circular = false
            } else {
                link.circular = true
                link.circularLinkID = circularLinkID
                circularLinkID = circularLinkID + 1
            }
        })

    }
}

// Assign a circular link type (top or bottom), based on:
// - if the source/target node already has circular links, then use the same type
// - if not, choose the type with fewer links
function selectCircularLinkTypes(graph, id) {
    var numberOfTops = 0
    var numberOfBottoms = 0
    graph.links.forEach(function (link) {
        if (link.circular) {
            // if either souce or target has type already use that
            if (link.source.circularLinkType || link.target.circularLinkType) {
                // default to source type if available
                link.circularLinkType = link.source.circularLinkType
                    ? link.source.circularLinkType
                    : link.target.circularLinkType
            } else {
                link.circularLinkType = numberOfTops < numberOfBottoms
                    ? 'top'
                    : 'bottom'
            }

            if (link.circularLinkType == 'top') {
                numberOfTops = numberOfTops + 1
            } else {
                numberOfBottoms = numberOfBottoms + 1
            }

            graph.nodes.forEach(function (node) {
                if (getNodeID(node, id) == getNodeID(link.source, id) || getNodeID(node, id) == getNodeID(link.target, id)) {
                    node.circularLinkType = link.circularLinkType
                }
            })
        }
    })

    //correct self-linking links to be same direction as node
    graph.links.forEach(function (link) {
        if (link.circular) {
            //if both source and target node are same type, then link should have same type
            if (link.source.circularLinkType == link.target.circularLinkType) {
                link.circularLinkType = link.source.circularLinkType
            }
            //if link is selflinking, then link should have same type as node
            if (selfLinking(link, id)) {
                link.circularLinkType = link.source.circularLinkType
            }
        }
    })

}

// Return the angle between a straight line between the source and target of the link, and the vertical plane of the node
function linkAngle(link) {
    var adjacent = Math.abs(link.y1 - link.y0)
    var opposite = Math.abs(link.target.x0 - link.source.x1)

    return Math.atan(opposite / adjacent)
}


// Return the number of circular links for node, not including self linking links
function numberOfNonSelfLinkingCycles(node, id) {
    var sourceCount = 0
    node.sourceLinks.forEach(function (l) {
        sourceCount = l.circular && !selfLinking(l, id)
            ? sourceCount + 1
            : sourceCount
    })

    var targetCount = 0
    node.targetLinks.forEach(function (l) {
        targetCount = l.circular && !selfLinking(l, id)
            ? targetCount + 1
            : targetCount
    })

    return sourceCount + targetCount
}


// return the distance between the link's target and source node, in terms of the nodes' X coordinate
function linkXLength(link) {
    return link.target.x0 - link.source.x1
}

// Return the Y coordinate on the longerLink path * which is perpendicular shorterLink's source.
// * approx, based on a straight line from target to source, when in fact the path is a bezier
function linkPerpendicularYToLinkSource(longerLink, shorterLink) {
    // get the angle for the longer link
    var angle = linkAngle(longerLink)

    // get the adjacent length to the other link's x position
    var heightFromY1ToPependicular = linkXLength(shorterLink) / Math.tan(angle)

    // add or subtract from longer link1's original y1, depending on the slope
    var yPerpendicular = incline(longerLink) == 'up'
        ? longerLink.y1 + heightFromY1ToPependicular
        : longerLink.y1 - heightFromY1ToPependicular

    return yPerpendicular
}

// Return the Y coordinate on the longerLink path * which is perpendicular shorterLink's source.
// * approx, based on a straight line from target to source, when in fact the path is a bezier
function linkPerpendicularYToLinkTarget(longerLink, shorterLink) {
    // get the angle for the longer link
    var angle = linkAngle(longerLink)

    // get the adjacent length to the other link's x position
    var heightFromY1ToPependicular = linkXLength(shorterLink) / Math.tan(angle)

    // add or subtract from longer link's original y1, depending on the slope
    var yPerpendicular = incline(longerLink) == 'up'
        ? longerLink.y1 - heightFromY1ToPependicular
        : longerLink.y1 + heightFromY1ToPependicular

    return yPerpendicular
}

const yCenter = (y_able) => {
    return y_able.y0 + (y_able.y1 - y_able.y0) / 2;
}

function getAverageY(node) {
    if (node.partOfCycle) {
        return node.y0
    }
    const sourceTargetAvg = [
        node.sourceLinks.reduce((p,c) => p+yCenter(c.target), 0) / node.sourceLinks.length || null,
        node.targetLinks.reduce((p,c) => p+yCenter(c.source), 0) / node.targetLinks.length || null
    ].filter(x=>x);
    return sourceTargetAvg.reduce((p,c) => p+c, 0) / sourceTargetAvg.length;
}

function deTangle(graph) {
    graph.nodes.forEach(n => {
        // if a node is lower or higher than all it's links, move it to the average y of it's links
        const averageLinkY = getAverageY(n);
        let factor = 1;
        let dy = 0;
        if (n.y0 > averageLinkY) {
            dy = averageLinkY - yCenter(n);
        }
        else if (n.y1 < averageLinkY) {
            factor = -1;
            dy = yCenter(n) - averageLinkY;
        }
        n.y0 += dy * factor;
        n.y1 += dy * factor;
        n.targetLinks.forEach(l => {
            l.y1 += dy * factor;
            // if the incoming link is only connected to us, move it as well
            if (!l.source.targetLinks.length) {
                l.source.y1 = l.y0 + l.source.y1 - l.source.y0;
                l.source.y0 = l.y0;
            }
        })
        n.sourceLinks.forEach(l => {
            l.y0 += dy * factor;
        })
    });
}

// Move any nodes that overlap links which span 2+ columns
function resolveNodeLinkOverlaps(graph, y0, y1, id) {

    graph.links.forEach(function (link) {
        if (link.circular) {
            return
        }

        if (link.target.column - link.source.column > 1) {
            var columnToTest = link.source.column + 1
            var maxColumnToTest = link.target.column - 1

            var i = 1
            var numberOfColumnsToTest = maxColumnToTest - columnToTest + 1

            for (
                columnToTest, (i = 1);
                columnToTest <= maxColumnToTest;
                columnToTest++, i++
            ) {
                graph.nodes.forEach(function (node) {
                    if (node.column == columnToTest) {
                        var t = i / (numberOfColumnsToTest + 1);

                        // Find all the points of a cubic bezier curve in javascript
                        // https://stackoverflow.com/questions/15397596/find-all-the-points-of-a-cubic-bezier-curve-in-javascript

                        var B0_t = Math.pow(1 - t, 3);
                        var B1_t = 3 * t * Math.pow(1 - t, 2);
                        var B2_t = 3 * Math.pow(t, 2) * (1 - t);
                        var B3_t = Math.pow(t, 3);

                        var py_t =
                            B0_t * link.y0 +
                            B1_t * link.y0 +
                            B2_t * link.y1 +
                            B3_t * link.y1;

                        var linkY0AtColumn = py_t - (link.width / 2);
                        var linkY1AtColumn = py_t + (link.width / 2);
                        var dy;

                        if (linkY0AtColumn > node.y0 && linkY0AtColumn < node.y1) {
                            // If top of link overlaps node, push node up

                            dy = (node.y1 - linkY0AtColumn) * -1;

                            node = adjustNodeHeight(node, dy, y0, y1);

                            // check if other nodes need to move up too
                            graph.nodes.forEach(function (otherNode) {
                                // don't need to check itself or nodes at different columns
                                if (
                                    getNodeID(otherNode, id) == getNodeID(node, id) ||
                                    otherNode.column != node.column
                                ) {
                                    return
                                }
                                const overlapFactor = nodesOverlap(node, otherNode);
                                if (overlapFactor) {
                                    adjustNodeHeight(otherNode, dy * overlapFactor, y0, y1)
                                }
                            })
                        } else if (linkY1AtColumn > node.y0 && linkY1AtColumn < node.y1) {
                            // If bottom of link overlaps node, push node down
                            dy = linkY1AtColumn - node.y0

                            node = adjustNodeHeight(node, dy, y0, y1)

                            // check if other nodes need to move down too
                            graph.nodes.forEach(function (otherNode) {
                                // don't need to check itself or nodes at different columns
                                if (
                                    getNodeID(otherNode, id) == getNodeID(node, id) ||
                                    otherNode.column != node.column
                                ) {
                                    return
                                }
                                const overlapFactor = nodesOverlap(node, otherNode);
                                if (overlapFactor) {
                                    adjustNodeHeight(otherNode, dy * overlapFactor, y0, y1)
                                }
                            })
                        } else if (linkY0AtColumn < node.y0 && linkY1AtColumn > node.y1) {
                            // Move towards the average Y value relative to the node's y value
                            const averageLinkY = getAverageY(node);

                            dy = averageLinkY - (node.y1 - node.y0) / 2;

                            node = adjustNodeHeight(node, dy, y0, y1);

                            graph.nodes.forEach(function (otherNode) {
                                // don't need to check itself or nodes at different columns
                                if (
                                    getNodeID(otherNode, id) == getNodeID(node, id) ||
                                    otherNode.column != node.column
                                ) {
                                    return
                                }
                                if (otherNode.y0 < node.y1 && otherNode.y1 > node.y1) {
                                    adjustNodeHeight(otherNode, dy, y0, y1)
                                }
                            })
                        }
                    }
                })
            }
        }
    })
}

function showNodeLinkOverlap(graph, y0, y1, id) {

    graph.links.forEach(function (link) {
        if (link.circular) {
            return
        }

        if (link.target.column - link.source.column > 1) {
            var columnToTest = link.source.column + 1
            var maxColumnToTest = link.target.column - 1

            var i = 1
            var numberOfColumnsToTest = maxColumnToTest - columnToTest + 1

            for (
                columnToTest, (i = 1);
                columnToTest <= maxColumnToTest;
                columnToTest++, i++
            ) {
                graph.nodes.forEach(function (node) {
                    if (node.column == columnToTest) {
                        var t = i / (numberOfColumnsToTest + 1);

                        // Find all the points of a cubic bezier curve in javascript
                        // https://stackoverflow.com/questions/15397596/find-all-the-points-of-a-cubic-bezier-curve-in-javascript

                        var B0_t = Math.pow(1 - t, 3);
                        var B1_t = 3 * t * Math.pow(1 - t, 2);
                        var B2_t = 3 * Math.pow(t, 2) * (1 - t);
                        var B3_t = Math.pow(t, 3);

                        var py_t =
                            B0_t * link.y0 +
                            B1_t * link.y0 +
                            B2_t * link.y1 +
                            B3_t * link.y1;

                        var linkY0AtColumn = py_t - (link.width / 2);
                        var linkY1AtColumn = py_t + (link.width / 2);
                        var dy;

                        if (linkY0AtColumn > node.y0 && linkY1AtColumn < node.y1) {
                            node.color = "#000"
                            node.highlight = true;
                            link.color = "#F0F"
                        }else if (linkY0AtColumn > node.y0 && linkY0AtColumn < node.y1) {
                            // If top of link overlaps node, push node up

                            dy = (node.y1 - linkY0AtColumn) * -1;
                            
                            node.color = "#FF0"
                            node.highlight = true;
                            // node = adjustNodeHeight(node, dy, y0, y1);

                            // // check if other nodes need to move up too
                            // graph.nodes.forEach(function (otherNode) {
                            //     // don't need to check itself or nodes at different columns
                            //     if (
                            //         getNodeID(otherNode, id) == getNodeID(node, id) ||
                            //         otherNode.column != node.column
                            //     ) {
                            //         return
                            //     }
                            //     if (nodesOverlap(node, otherNode)) {
                            //         adjustNodeHeight(otherNode, dy, y0, y1)
                            //     }
                            // })
                        } else if (linkY1AtColumn > node.y0 && linkY1AtColumn < node.y1) {
                            // If bottom of link overlaps node, push node down
                            dy = linkY1AtColumn - node.y0
                            
                            node.color = "#0FF"
                            node.highlight = true;

                            // node = adjustNodeHeight(node, dy, y0, y1)

                            // // check if other nodes need to move down too
                            // graph.nodes.forEach(function (otherNode) {
                            //     // don't need to check itself or nodes at different columns
                            //     if (
                            //         getNodeID(otherNode, id) == getNodeID(node, id) ||
                            //         otherNode.column != node.column
                            //     ) {
                            //         return
                            //     }
                            //     if (otherNode.y0 < node.y1 && otherNode.y1 > node.y1) {
                            //         adjustNodeHeight(otherNode, dy, y0, y1)
                            //     }
                            // })
                        } else if (linkY0AtColumn < node.y0 && linkY1AtColumn > node.y1) {
                            // if link completely overlaps node
                            dy = linkY1AtColumn - node.y0 + (linkY1AtColumn - linkY0AtColumn);
                            node.color = "#F0F"
                            node.highlight = true;
                            link.color="#F00"

                        //     node = adjustNodeHeight(node, dy, y0, y1)

                        //     graph.nodes.forEach(function (otherNode) {
                        //         // don't need to check itself or nodes at different columns
                        //         if (
                        //             getNodeID(otherNode, id) == getNodeID(node, id) ||
                        //             otherNode.column != node.column
                        //         ) {
                        //             return
                        //         }
                        //         if (otherNode.y0 < node.y1 && otherNode.y1 > node.y1) {
                        //             adjustNodeHeight(otherNode, dy, y0, y1)
                        //         }
                        //     })
                        }
                    }
                })
            }
        }
    })
}

// check if two nodes overlap
function nodesOverlap(nodeA, nodeB) {
    const nodeMargin = 0;
    const testNodeAy0 = nodeA.y0 - nodeMargin;
    const testNodeAy1 = nodeA.y1 + nodeMargin;
    // test if nodeA top partially overlaps nodeB
    if (testNodeAy0 > nodeB.y0 && testNodeAy0 < nodeB.y1) {
        return 1
    } else if (testNodeAy1 > nodeB.y0 && testNodeAy1 < nodeB.y1) {
        // test if nodeA bottom partially overlaps nodeB
        return -1
    } else if (testNodeAy0 < nodeB.y0 && testNodeAy1 > nodeB.y1) {
        // test if nodeA covers nodeB
        return 2
    } else {
        return false
    }
}

// update a node, and its associated links, vertical positions (y0, y1)
function adjustNodeHeight(node, dy) {
    node.y0 = node.y0 + dy
    node.y1 = node.y1 + dy

    node.targetLinks.forEach(function (l) {
        l.y1 = l.y1 + dy
    })

    node.sourceLinks.forEach(function (l) {
        l.y0 = l.y0 + dy
    })
    return node
}

// sort and set the links' y0 for each node
function sortSourceLinks(graph, y1, id, moveNodes) {
    graph.nodes.forEach(function (node) {
        // move any nodes up which are off the bottom
        if (moveNodes && node.y + (node.y1 - node.y0) > y1) {
            node.y = node.y - (node.y + (node.y1 - node.y0) - y1)
        }

        var nodesSourceLinks = graph.links.filter(function (l) {
            return getNodeID(l.source, id) == getNodeID(node, id)
        })

        var nodeSourceLinksLength = nodesSourceLinks.length

        // if more than 1 link then sort
        if (nodeSourceLinksLength > 1) {
            nodesSourceLinks.sort(function (link1, link2) {
                // if both are not circular...
                if (!link1.circular && !link2.circular) {
                    // if the target nodes are the same column, then sort by the link's target y
                    if (link1.target.column == link2.target.column) {
                        return link1.y1 - link2.y1
                    } else if (!sameInclines(link1, link2)) {
                        // if the links slope in different directions, then sort by the link's target y
                        return link1.y1 - link2.y1

                        // if the links slope in same directions, then sort by any overlap
                    } else {
                        if (link1.target.column > link2.target.column) {
                            var link2Adj = linkPerpendicularYToLinkTarget(link2, link1)
                            return link1.y1 - link2Adj
                        }
                        if (link2.target.column > link1.target.column) {
                            var link1Adj = linkPerpendicularYToLinkTarget(link1, link2)
                            return link1Adj - link2.y1
                        }
                    }
                }

                // if only one is circular, the move top links up, or bottom links down
                if (link1.circular && !link2.circular) {
                    return link1.circularLinkType == 'top' ? -1 : 1
                } else if (link2.circular && !link1.circular) {
                    return link2.circularLinkType == 'top' ? 1 : -1
                }

                // if both links are circular...
                if (link1.circular && link2.circular) {
                    // ...and they both loop the same way (both top)
                    if (
                        link1.circularLinkType === link2.circularLinkType &&
                        link1.circularLinkType == 'top'
                    ) {
                        // ...and they both connect to a target with same column, then sort by the target's y
                        if (link1.target.column === link2.target.column) {
                            return link1.target.y1 - link2.target.y1
                        } else {
                            // ...and they connect to different column targets, then sort by how far back they
                            return link2.target.column - link1.target.column
                        }
                    } else if (
                        link1.circularLinkType === link2.circularLinkType &&
                        link1.circularLinkType == 'bottom'
                    ) {
                        // ...and they both loop the same way (both bottom)
                        // ...and they both connect to a target with same column, then sort by the target's y
                        if (link1.target.column === link2.target.column) {
                            return link2.target.y1 - link1.target.y1
                        } else {
                            // ...and they connect to different column targets, then sort by how far back they
                            return link1.target.column - link2.target.column
                        }
                    } else {
                        // ...and they loop around different ways, the move top up and bottom down
                        return link1.circularLinkType == 'top' ? -1 : 1
                    }
                }
            })
        }

        // update y0 for links
        var ySourceOffset = node.y0

        nodesSourceLinks.forEach(function (link) {
            link.y0 = ySourceOffset + link.width / 2
            ySourceOffset = ySourceOffset + link.width
        })

        // correct any circular bottom links so they are at the bottom of the node
        nodesSourceLinks.forEach(function (link, i) {
            if (link.circularLinkType == 'bottom') {
                var j = i + 1
                var offsetFromBottom = 0
                // sum the widths of any links that are below this link
                for (j; j < nodeSourceLinksLength; j++) {
                    offsetFromBottom = offsetFromBottom + nodesSourceLinks[j].width
                }
                link.y0 = node.y1 - offsetFromBottom - link.width / 2
            }
        })
    })
}

// sort and set the links' y1 for each node
function sortTargetLinks(graph, y1, id) {
    graph.nodes.forEach(function (node) {
        var nodesTargetLinks = graph.links.filter(function (l) {
            return getNodeID(l.target, id) == getNodeID(node, id)
        })

        var nodesTargetLinksLength = nodesTargetLinks.length

        if (nodesTargetLinksLength > 1) {
            nodesTargetLinks.sort(function (link1, link2) {
                // if both are not circular, the base on the source y position
                if (!link1.circular && !link2.circular) {
                    if (link1.source.column == link2.source.column) {
                        return link1.y0 - link2.y0
                    } else if (!sameInclines(link1, link2)) {
                        return link1.y0 - link2.y0
                    } else {
                        // get the angle of the link to the further source node (ie the smaller column)
                        if (link2.source.column < link1.source.column) {
                            var link2Adj = linkPerpendicularYToLinkSource(link2, link1)

                            return link1.y0 - link2Adj
                        }
                        if (link1.source.column < link2.source.column) {
                            var link1Adj = linkPerpendicularYToLinkSource(link1, link2)

                            return link1Adj - link2.y0
                        }
                    }
                }

                // if only one is circular, the move top links up, or bottom links down
                if (link1.circular && !link2.circular) {
                    return link1.circularLinkType == 'top' ? -1 : 1
                } else if (link2.circular && !link1.circular) {
                    return link2.circularLinkType == 'top' ? 1 : -1
                }

                // if both links are circular...
                if (link1.circular && link2.circular) {
                    // ...and they both loop the same way (both top)
                    if (
                        link1.circularLinkType === link2.circularLinkType &&
                        link1.circularLinkType == 'top'
                    ) {
                        // ...and they both connect to a target with same column, then sort by the target's y
                        if (link1.source.column === link2.source.column) {
                            return link1.source.y1 - link2.source.y1
                        } else {
                            // ...and they connect to different column targets, then sort by how far back they
                            return link1.source.column - link2.source.column
                        }
                    } else if (
                        link1.circularLinkType === link2.circularLinkType &&
                        link1.circularLinkType == 'bottom'
                    ) {
                        // ...and they both loop the same way (both bottom)
                        // ...and they both connect to a target with same column, then sort by the target's y
                        if (link1.source.column === link2.source.column) {
                            return link1.source.y1 - link2.source.y1
                        } else {
                            // ...and they connect to different column targets, then sort by how far back they
                            return link2.source.column - link1.source.column
                        }
                    } else {
                        // ...and they loop around different ways, the move top up and bottom down
                        return link1.circularLinkType == 'top' ? -1 : 1
                    }
                }
            })
        }

        // update y1 for links
        var yTargetOffset = node.y0

        nodesTargetLinks.forEach(function (link) {
            link.y1 = yTargetOffset + link.width / 2
            yTargetOffset = yTargetOffset + link.width
        })

        // correct any circular bottom links so they are at the bottom of the node
        nodesTargetLinks.forEach(function (link, i) {
            if (link.circularLinkType == 'bottom') {
                var j = i + 1
                var offsetFromBottom = 0
                // sum the widths of any links that are below this link
                for (j; j < nodesTargetLinksLength; j++) {
                    offsetFromBottom = offsetFromBottom + nodesTargetLinks[j].width
                }
                link.y1 = node.y1 - offsetFromBottom - link.width / 2
            }
        })
    })
}

// test if links both slope up, or both slope down
function sameInclines(link1, link2) {
    return incline(link1) == incline(link2)
}

// returns the slope of a link, from source to target
// up => slopes up from source to target
// down => slopes down from source to target
function incline(link) {
    return link.y0 - link.y1 > 0 ? 'up' : 'down'
}

// check if link is self linking, ie links a node to the same node
function selfLinking(link, id) {
    return getNodeID(link.source, id) == getNodeID(link.target, id)
}


function byYLinks(a, b) {
    return getAverageY(a) - getAverageY(b)
}

function spreadNodes(graph, py) {
    var columns = nest()
        .key(d => {
            return d.column
        })
        .sortKeys(ascending)
        .entries(graph.nodes)
        .map(d => {
            return d.values
        })

    columns.forEach((nodes) => {
        nodes.sort(ascendingBreadth);
        if (nodes.length > 1) {
            // Spread nodes upwards from the center
            for (let i = Math.floor(nodes.length / 2) - 1; i >= 0; i--) {
                if (i < nodes.length - 1 && nodes[i].y1 + py > nodes[i + 1].y0) {
                    const overlap = nodes[i].y1 + py - nodes[i + 1].y0;
                    nodes[i].y0 -= overlap;
                    nodes[i].y1 -= overlap;
                    nodes[i].targetLinks.forEach(l => {
                        l.y1 = nodes[i].y1
                    })
                    nodes[i].sourceLinks.forEach(l => {
                        l.y0 = nodes[i].y0
                    })
                }
            }

            // Spread nodes downwards from the center
            for (let i = Math.floor(nodes.length / 2); i < nodes.length; i++) {
                if (i > 0 && nodes[i - 1].y1 + py > nodes[i].y0) {
                    const overlap = nodes[i - 1].y1 + py - nodes[i].y0;
                    nodes[i].y0 += overlap;
                    nodes[i].y1 += overlap;
                    
                    nodes[i].targetLinks.forEach(l => {
                        l.y1 = nodes[i].y1
                    })
                    nodes[i].sourceLinks.forEach(l => {
                        l.y0 = nodes[i].y0
                    })
                }
            }
        }
    })
}
