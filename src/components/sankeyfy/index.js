import { Plot } from "./sankey";
import * as d3 from 'd3';

export const sankeyfy = ({
  data = {links: [], nodes: []}, 
  id = '#sankey', 
  width = 1000, 
  height = 400, 
  logarithmic = false,
  nodeWidth = 25, 
  iterations = 60, 
  nodePaddingRatio = 0.5,
  autoColor = true
}) => {
    
  var plot = Plot()
    .nodeWidth(nodeWidth)
    .nodePaddingRatio(nodePaddingRatio)
    .size([width, height])
    .nodeId(function (d) {
      return d.name;
    })
    .iterations(iterations);

  return plot(data, logarithmic).then(sankeyData => {
    let sankeyNodes = sankeyData.nodes;
    let sankeyLinks = sankeyData.links;
  
    var svg = d3.select(id).append("svg")
      .attr("width", "100%")
      .attr("height", "100%");
  
    svg.call(d3.zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.9, 12])
      .on("zoom", zoomed));    
    
    var g = svg.append("g").attr("id", `${id}-main-svg-g`);
  
    function zoomed({transform}) {
      g.attr("transform", transform);
    }
    
    var linkG = g.append("g")
      .attr("fill", "none")
      .selectAll("g");
    
    var nodeG = g.append("g").selectAll("g");
    
    let depthExtent = d3.extent(data.nodes, function (d) { return d.depth; });
    
    var colour = d3.scaleSequential(d3.interpolateCool).domain(depthExtent);
    
    //create paths for circular links
    sankeyLinks = addCircularPathData(sankeyLinks, height);
    
    //draw everything
    var node = nodeG.data(sankeyNodes)
      .enter()
      .append("g");
    
    node.append("rect")
      .attr("class", "sankey-node")
      .attr("x", function (d) { return d.x0; }) //Use original sankey defined positions
      .attr("y", function (d) { return d.y0; }) //Use force defined positions
      .attr("height", function (d) { return d.y1 - d.y0; })
      .attr("width", function (d) { return d.x1 - d.x0; })
      .classed("highlight", function (d) { return d.highlight})
      .on("mouseover", function (e, detail) {
        const event = new CustomEvent('sankey_node_mouseover', { detail });
        window.dispatchEvent(event);
        let thisName = detail.name;
        d3.select(id).selectAll(".sankey-link")
          .classed("dim", function (l) {
            return !(l.source.name == thisName || l.target.name == thisName);
          })
        d3.select(id).selectAll(".sankey-node")
          .classed("dim", function (l) {
            return !(l.name == thisName || l.sourceLinks.map(l => l.target.name).includes(thisName) || l.targetLinks.map(l => l.source.name).includes(thisName));
          })
        d3.select(id).selectAll(".sankey-label")
          .classed("dim", function (l) {
            return !(l.name == thisName || l.sourceLinks.map(l => l.target.name).includes(thisName) || l.targetLinks.map(l => l.source.name).includes(thisName));
          })
    
      })
      .on("mouseout", function (e, detail) {
        const event = new CustomEvent('sankey_node_mouseout', { detail });
        window.dispatchEvent(event);
        d3.select(id).selectAll(".sankey-node").classed("dim", false);
        d3.select(id).selectAll(".sankey-link").classed("dim", false);
        d3.select(id).selectAll(".sankey-label").classed("dim", false);
      })
      .on("click", function (e, detail) {
        const event = new CustomEvent('sankey_node_clicked', { detail });
        window.dispatchEvent(event);
      });
    
    const xpos = (d) => { return d.x1 + 6 };
  
    node.append("text")
      .attr("class", "sankey-label")
      .attr("text-anchor", function (d) { return "start"})
      .attr("x", xpos)
      .attr("y", function (d) { return d.x0 < width / 2 ? d.y0 + ((d.y1 - d.y0) / 50) : d.y1 - ((d.y1 - d.y0) / 50); })
      .on("mouseover", function (e, detail) {
        const event = new CustomEvent('sankey_node_mouseover', { detail });
        window.dispatchEvent(event);
        let thisName = detail.name;
        d3.select(id).selectAll(".sankey-link")
          .classed("dim", function (l) {
            return !(l.source.name == thisName || l.target.name == thisName);
          })
        d3.select(id).selectAll(".sankey-node")
          .classed("dim", function (l) {
            return !(l.name == thisName || l.sourceLinks.map(l => l.target.name).includes(thisName) || l.targetLinks.map(l => l.source.name).includes(thisName));
          })
        d3.select(id).selectAll(".sankey-label")
          .classed("dim", function (l) {
            return !(l.name == thisName || l.sourceLinks.map(l => l.target.name).includes(thisName) || l.targetLinks.map(l => l.source.name).includes(thisName));
          })
    
      })
      .on("mouseout", function (e, detail) {
        const event = new CustomEvent('sankey_node_mouseout', { detail });
        window.dispatchEvent(event);
        d3.select(id).selectAll(".sankey-node").classed("dim", false);
        d3.select(id).selectAll(".sankey-link").classed("dim", false);
        d3.select(id).selectAll(".sankey-label").classed("dim", false);
      })
      .on("click", function (e, detail) {
        const event = new CustomEvent('sankey_node_clicked', { detail });
        window.dispatchEvent(event);
      })
      .selectAll("tspan")
      .data(function (d) { 
        const x = xpos(d);
        if (!d?.labels?.length) return [{label: d.name, x, pos: "0em", data: d}];
        const y = (-1 * (d.labels.length / 2 -1));
        return d.labels.map((s, i) => {return {label: s, x, pos: (i?1.3:y)+"em", data: d}})
      })
      .enter()
      .append('tspan')
      .attr("x", d => d.x)
      .attr('dy', d => d.pos)
      .text(d => d.label);
  
    if (autoColor) {
      d3.select(id).selectAll(".sankey-node")
        .style("fill", function (d) { return d.color ? d.color : autoColor ? colour(d.depth) : null; })
        .style("stroke", function (d) { return d.borderColor ? d.borderColor : d.color ? d.color : autoColor ? colour(d.depth) : null; });
    }
    else {
      d3.select(id).selectAll(".sankey-node")
        .filter(function (d) { return Boolean(d.color)})
        .style("fill", function (d) { return d.color });
      d3.select(id).selectAll(".sankey-node")
        .filter(function (d) { return Boolean(d.borderColor || d.color)})
        .style("stroke", function (d) { return d.borderColor ? d.borderColor : d.color; });
    }
    
    linkG.data(sankeyLinks)
      .enter()
      .append("g")
      .attr("class", "sankey-link")
      .on("click", function (e, detail) {
        const event = new CustomEvent('sankey_link_clicked', { detail});
        window.dispatchEvent(event);
      })
      .on("mouseover", function (e, detail) {
        const event = new CustomEvent('sankey_link_mouseover', { detail });
        window.dispatchEvent(event);
        let thisIndex = detail.index;
        let thisSource = detail.source.name;
        let thisTarget = detail.target.name;
        d3.select(id).selectAll(".sankey-link")
          .classed("dim", function (l) {
            return !(l.index == thisIndex);
          })
        d3.select(id).selectAll(".sankey-node")
          .classed("dim", function (l) {
            return !(l.name == thisSource || l.name == thisTarget);
          })
        d3.select(id).selectAll(".sankey-label")
          .classed("dim", function (l) {
            return !(l.name == thisSource || l.name == thisTarget);
          })
      }).on("mouseout", function (e, detail) {
        const event = new CustomEvent('sankey_link_mouseout', { detail });
        window.dispatchEvent(event);
        d3.select(id).selectAll(".sankey-node").classed("dim", false);
        d3.select(id).selectAll(".sankey-link").classed("dim", false);
        d3.select(id).selectAll(".sankey-label").classed("dim", false);
      });
  
    d3.select(id).selectAll(".sankey-link")
      .append("path")
      .attr("class", "sankey-top-link")
      .attr("d", curveSankeyForceLink)
      .style("stroke-width", function (d) { return Math.max(1, d.width); })
      .classed("highlight", function (d) { return d.highlight})
      .filter(function (d) {return d.color})
      .style("stroke", function (d) {return d.color});
    
      // Parse all circular links and look for the widest path (maxPath) to use as padding
      let maxPath = 0;
      sankeyData.links.filter(l => l.circular).forEach(l => {
          maxPath < l.width && (maxPath = l.width);
      });
    
      // Find the bounding box of the main svg group to set the viewbox to match
      const vbox = document.getElementById(`${id}-main-svg-g`).getBBox();
      svg.attr("viewBox", [vbox.x - maxPath, vbox.y - maxPath, vbox.width + maxPath * 2, vbox.height + maxPath * 2].join(' '));

  })

}

//Create a normal curve or circular curve
function curveSankeyForceLink(link) {

  let path = ''
  if (link.circular) {
    path = link.circularPathData.path;
  } else {
    var normalPath = d3.linkHorizontal()
      .source(function (d) {
        let x = d.source.x0 + (d.source.x1 - d.source.x0);
        let y = d.y0;
        return [x, y]
      })
      .target(function (d) {
        let x = d.target.x0;
        let y = d.y1;
        return [x, y]
      })
    path = normalPath(link)
  }
  return path

}

function linkAngle(link) {

  let angle = 0;
  let opposite = link.y1 - link.y0;
  let adjacent = link.target.x0 - link.source.x1;

  angle = Math.atan(Math.abs(opposite) / Math.abs(adjacent))

  if (opposite > 0) {
    angle = angle + (Math.PI / 2)
  }
  else {
    angle = (Math.PI / 2) - angle
  }

  return angle;

}


function addCircularPathData(links) {
  let baseRadius = 10;

  let circularLinkGap = 5;

  //add the base data for each link
  links.forEach(function (link, i) {
    if (link.circular) {
      link.circularPathData = {};
      link.circularPathData.arcRadius = link.width + baseRadius;
      link.circularPathData.leftNodeBuffer = 10;
      link.circularPathData.rightNodeBuffer = 10;
      link.circularPathData.sourceWidth = link.source.x1 - link.source.x0;
      link.circularPathData.targetWidth = link.target.x1 - link.target.x0;
      link.circularPathData.sourceX = link.source.x0 + link.circularPathData.sourceWidth;
      link.circularPathData.targetX = link.target.x0;
      link.circularPathData.sourceY = linkSourceY(link);
      link.circularPathData.targetY = linkTargetY(link);

      //add left extent coordinates, based on links with same source depth and circularLink type
      let thisDepth = link.source.depth;
      let thisCircularLinkType = link.circularLinkType;
      let sameDepthLinks = links.filter(function (l) { return ((l.source.depth == thisDepth) && (l.circularLinkType == thisCircularLinkType)); })

      if (link.circularLinkType == "bottom") {
        sameDepthLinks.sort(sortLinkSourceYDescending);
      }
      else {
        sameDepthLinks.sort(sortLinkSourceYAscending);
      }


      sameDepthLinks.forEach(function (l) {
        if (l.circularLinkID == link.circularLinkID) {
          link.circularPathData.leftSmallArcRadius = baseRadius + (link.width * 2);
          link.circularPathData.leftLargeArcRadius = baseRadius + (link.width * 2);
        }
      })

      //add right extent coordinates, based on links with same target depth and circularLink type
      thisDepth = link.target.depth;
      sameDepthLinks = links.filter(function (l) { return ((l.target.depth == thisDepth) && (l.circularLinkType == thisCircularLinkType)); });
      if (link.circularLinkType == "bottom") {
        sameDepthLinks.sort(sortLinkTargetYDescending)
      }
      else {
        sameDepthLinks.sort(sortLinkTargetYAscending)
      }

      sameDepthLinks.forEach(function (l) {
        if (l.circularLinkID == link.circularLinkID) {
          link.circularPathData.rightSmallArcRadius = baseRadius + (link.width * 2);
          link.circularPathData.rightLargeArcRadius = baseRadius + (link.width * 2);
        }
      })

      //add vertical extent coordinates, based on links with same target depth and circularLink type
      const sameCircularTypeLinks = links.filter(function (l) { return l.circularLinkType == thisCircularLinkType; });
      sameCircularTypeLinks.sort(sortLinkDepthAscending);

      let positionOffset = sameCircularTypeLinks.reduce((p, c) => p + c.width + circularLinkGap, 0);
      sameCircularTypeLinks.forEach(function (l, i) {
        if (l.circularLinkID == link.circularLinkID) {
          link.circularPathData.leftNodeBuffer += (sameCircularTypeLinks.length - i) * circularLinkGap * i;
          link.circularPathData.rightNodeBuffer += (sameCircularTypeLinks.length - i) * circularLinkGap * i;
          link.circularPathData.verticalBuffer = link.width + positionOffset + ((sameCircularTypeLinks.length - i) * circularLinkGap);

        }
        positionOffset = positionOffset - l.width * 1.5;
      })

      //all links
      link.circularPathData.leftInnerExtent = link.circularPathData.sourceX + link.circularPathData.leftNodeBuffer;
      link.circularPathData.rightInnerExtent = link.circularPathData.targetX - link.circularPathData.rightNodeBuffer;
      link.circularPathData.leftFullExtent = link.circularPathData.sourceX + link.circularPathData.leftLargeArcRadius + link.circularPathData.leftNodeBuffer;
      link.circularPathData.rightFullExtent = link.circularPathData.targetX - link.circularPathData.rightLargeArcRadius - link.circularPathData.rightNodeBuffer;

      //bottom links
      if (link.circularLinkType == "bottom") {
        link.circularPathData.verticalFullExtent = Math.max(link.y0, link.y1) + link.circularPathData.verticalBuffer * 2;
        link.circularPathData.verticalLeftInnerExtent = link.circularPathData.verticalFullExtent - link.circularPathData.leftLargeArcRadius;
        link.circularPathData.verticalRightInnerExtent = link.circularPathData.verticalFullExtent - link.circularPathData.rightLargeArcRadius;
      }
      //top links
      else {
        link.circularPathData.verticalFullExtent = Math.min(link.y0, link.y1) - link.circularPathData.verticalBuffer * 2;
        link.circularPathData.verticalLeftInnerExtent = link.circularPathData.verticalFullExtent + link.circularPathData.leftLargeArcRadius;
        link.circularPathData.verticalRightInnerExtent = link.circularPathData.verticalFullExtent + link.circularPathData.rightLargeArcRadius;
      }

      link.circularPathData.path = createCircularPathString(link);
    }
  })

  return links;

}

function createCircularPathString(link) {
  let pathString = "";

  if (link.circularLinkType == "top") {

    pathString =
      // start at the right of the source node
      "M" + link.circularPathData.sourceX + " " + link.circularPathData.sourceY + " " +

      // line right to buffer point
      "L" + link.circularPathData.leftInnerExtent + " " + link.circularPathData.sourceY + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + link.circularPathData.leftLargeArcRadius + " " + link.circularPathData.leftSmallArcRadius + " 0 0 0 " +
      //End of arc X //End of arc Y
      link.circularPathData.leftFullExtent + " " + (link.circularPathData.sourceY - link.circularPathData.leftSmallArcRadius) + " " + //End of arc X

      // line up to buffer point
      "L" + link.circularPathData.leftFullExtent + " " + link.circularPathData.verticalLeftInnerExtent + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + link.circularPathData.leftLargeArcRadius + " " + link.circularPathData.leftLargeArcRadius + " 0 0 0 " +
      //End of arc X //End of arc Y
      link.circularPathData.leftInnerExtent + " " + link.circularPathData.verticalFullExtent + " " + //End of arc X

      // line left to buffer point
      "L" + link.circularPathData.rightInnerExtent + " " + link.circularPathData.verticalFullExtent + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + link.circularPathData.rightLargeArcRadius + " " + link.circularPathData.rightLargeArcRadius + " 0 0 0 " +
      //End of arc X //End of arc Y
      link.circularPathData.rightFullExtent + " " + link.circularPathData.verticalRightInnerExtent + " " + //End of arc X

      // line down
      "L" + link.circularPathData.rightFullExtent + " " + (link.circularPathData.targetY - link.circularPathData.rightSmallArcRadius) + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + link.circularPathData.rightLargeArcRadius + " " + link.circularPathData.rightSmallArcRadius + " 0 0 0 " +
      //End of arc X //End of arc Y
      link.circularPathData.rightInnerExtent + " " + link.circularPathData.targetY + " " + //End of arc X

      //line to end
      "L" + link.circularPathData.targetX + " " + link.circularPathData.targetY;

  }
  //bottom path  
  else {

    pathString =
      // start at the right of the source node
      "M" + link.circularPathData.sourceX + " " + link.circularPathData.sourceY + " " +

      // line right to buffer point
      "L" + link.circularPathData.leftInnerExtent + " " + link.circularPathData.sourceY + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + link.circularPathData.leftLargeArcRadius + " " + link.circularPathData.leftSmallArcRadius + " 0 0 1 " +
      //End of arc X //End of arc Y
      link.circularPathData.leftFullExtent + " " + (link.circularPathData.sourceY + link.circularPathData.leftSmallArcRadius) + " " + //End of arc X

      // line down to buffer point
      "L" + link.circularPathData.leftFullExtent + " " + link.circularPathData.verticalLeftInnerExtent + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + link.circularPathData.leftLargeArcRadius + " " + link.circularPathData.leftLargeArcRadius + " 0 0 1 " +
      //End of arc X //End of arc Y
      link.circularPathData.leftInnerExtent + " " + link.circularPathData.verticalFullExtent + " " + //End of arc X

      // line left to buffer point
      "L" + link.circularPathData.rightInnerExtent + " " + link.circularPathData.verticalFullExtent + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + link.circularPathData.rightLargeArcRadius + " " + link.circularPathData.rightLargeArcRadius + " 0 0 1 " +
      //End of arc X //End of arc Y
      link.circularPathData.rightFullExtent + " " + link.circularPathData.verticalRightInnerExtent + " " + //End of arc X

      // line up
      "L" + link.circularPathData.rightFullExtent + " " + (link.circularPathData.targetY + link.circularPathData.rightSmallArcRadius) + " " +

      //Arc around: Centre of arc X and  //Centre of arc Y
      "A" + link.circularPathData.rightLargeArcRadius + " " + link.circularPathData.rightSmallArcRadius + " 0 0 1 " +
      //End of arc X //End of arc Y
      link.circularPathData.rightInnerExtent + " " + link.circularPathData.targetY + " " + //End of arc X

      //line to end
      "L" + link.circularPathData.targetX + " " + link.circularPathData.targetY;

  }

  return pathString;
}

function sortLinkDepthAscending(link1, link2) {
  return linkDepthDistance(link1) - linkDepthDistance(link2);
}

function sortLinkSourceYAscending(link1, link2) {
  return linkSourceY(link1) - linkSourceY(link2);
}

function sortLinkSourceYDescending(link1, link2) {
  return linkSourceY(link2) - linkSourceY(link1);
}

function sortLinkTargetYAscending(link1, link2) {
  return linkTargetY(link1) - linkTargetY(link2);
}

function sortLinkTargetYDescending(link1, link2) {
  return linkTargetY(link2) - linkTargetY(link1);
}

function linkDepthDistance(link) {
  return link.source.depth - link.target.depth;
}

function linkSourceY(link) {
  //return link.y0 + (link.source.y - link.source.y0);
  return link.y0;
}

function linkTargetY(link) {
  //return link.y1 + (link.target.y - link.target.y0);
  return link.y1;
}
