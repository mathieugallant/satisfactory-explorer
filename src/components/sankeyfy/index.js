import { Plot } from "./sankey";
import * as d3 from 'd3';

export const sankeyfy = ({
  data = {links: [], nodes: []}, 
  id = '#sankey', 
  width = 1000, 
  height = 400, 
  logarithmic = false,
  nodeWidth = 15, 
  iterations = 32, 
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

  let sankeyData = plot(data, logarithmic);

  let sankeyNodes = sankeyData.nodes;
  let sankeyLinks = sankeyData.links;

  var svg = d3.select(id).append("svg")
    .attr("width", "100%");
  
  var g = svg.append("g")
    .attr("id", `${id}-main-svg-g`)
  
  var linkG = g.append("g")
    .attr("fill", "none")
    .selectAll("g");
  
  var nodeG = g.append("g")
    .selectAll("g");
  
  let depthExtent = d3.extent(data.nodes, function (d) { return d.depth; });
  
  var colour = d3.scaleSequential(d3.interpolateCool)
    .domain(depthExtent);
  
  //Adjust link Y's based on target/source Y positions
  sortTargetLinks(sankeyNodes, sankeyLinks);
  sortSourceLinks(sankeyNodes, sankeyLinks, height)
  
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
  
  const xpos = (d) => { return d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6; };

  node.append("text")
    .attr("class", "sankey-label")
    .attr("text-anchor", function (d) { return d.x0 < width / 2 ? "start" : "end"})
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
      const y = d.x0 < width / 2 ? 1: (-1 * (d.labels.length -1));
      return d.labels.map((s, i) => {return {label: s, x, pos: (i?1:y)+"em", data: d}})
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

  d3.select(id).selectAll(".sankey-link")
    .append("path")
    .attr("class", "sankey-sub-link")
    .attr("d", curveSankeyForceLink)
    .style("stroke-width", function (d) { return Math.max(1, d.width)/3; })
    .classed("highlight", function (d) { return d.highlight})
    .filter(function (d) {return d.color || d.subColor})
    .style("stroke", function (d) {return d.subColor || d.color});
  
    // Parse all circular links and look for the widest path (maxPath) to use as padding
    let maxPath = 0;
    sankeyData.links.filter(l => l.circular).forEach(l => {
        maxPath < l.width && (maxPath = l.width);
    });
  
    // Find the bounding box of the main svg group to set the viewbox to match
    const vbox = document.getElementById(`${id}-main-svg-g`).getBBox();
    svg.attr("viewBox", [vbox.x - maxPath, vbox.y - maxPath, vbox.width + maxPath * 2, vbox.height + maxPath * 2].join(' '));
    

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
  let baseRadius = 1;

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
          link.circularPathData.leftNodeBuffer += (sameCircularTypeLinks.length - i) * link.width;
          link.circularPathData.rightNodeBuffer += (sameCircularTypeLinks.length - i) * link.width;
          link.circularPathData.verticalBuffer = (link.width * 2) + positionOffset + ((sameCircularTypeLinks.length - i) * circularLinkGap);

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
        link.circularPathData.verticalFullExtent = Math.max(link.y0, link.y1) + 10 + link.circularPathData.verticalBuffer;
        link.circularPathData.verticalLeftInnerExtent = link.circularPathData.verticalFullExtent - link.circularPathData.leftLargeArcRadius;
        link.circularPathData.verticalRightInnerExtent = link.circularPathData.verticalFullExtent - link.circularPathData.rightLargeArcRadius;
      }
      //top links
      else {
        link.circularPathData.verticalFullExtent = Math.min(link.y0, link.y1) - 10 - link.circularPathData.verticalBuffer;
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


function sortSourceLinks(sankeyNodes, sankeyLinks, height) {

  sankeyNodes.forEach(function (node) {

    //move any nodes up which are off the bottom
    if ((node.y + (node.y1 - node.y0)) > height) {
      node.y = node.y - ((node.y + (node.y1 - node.y0)) - height)
    }

    let nodesSourceLinks = sankeyLinks.filter(function (l) { return l.source.name == node.name });


    //if more than 1 link then sort
    if (nodesSourceLinks.length > 1) {
      nodesSourceLinks.sort(function (link1, link2) {

        //if both are not circular...
        if (!link1.circular && !link2.circular) {


          let link1Angle = linkAngle(link1);
          let link2Angle = linkAngle(link2);

          return link1Angle - link2Angle

        }

        //if only one is circular, the move top links up, or bottom links down
        if (link1.circular && !link2.circular) {
          return link1.circularLinkType == "top" ? -1 : 1;
        }
        else if (link2.circular && !link1.circular) {
          return link2.circularLinkType == "top" ? 1 : -1;
        }

        //if both links are circular...
        if (link1.circular && link2.circular) {

          //...and they both loop the same way (both top)
          if (link1.circularLinkType === link2.circularLinkType && link1.circularLinkType == "top") {
            //...and they both connect to a target with same depth, then sort by the target's y
            if (link1.target.depth === link2.target.depth) {
              return link1.target.y1 - link2.target.y1

            }
            //...and they connect to different depth targets, then sort by how far back they
            else {
              return link1.target.depth - link2.target.depth;
            }
          }

          //...and they both loop the same way (both bottom)
          else if (link1.circularLinkType === link2.circularLinkType && link1.circularLinkType == "bottom") {
            //...and they both connect to a target with same depth, then sort by the target's y
            if (link1.target.depth === link2.target.depth) {
              return link2.target.y1 - link1.target.y1;

            }
            //...and they connect to different depth targets, then sort by how far back they
            else {
              return link1.target.depth - link2.target.depth;
            }
          }


          //...and they loop around different ways, the move top up and bottom down
          else {
            return link1.circularLinkType == "top" ? -1 : 1;
          }
        }

      })

    }

    //update y0 for links
    let ySourceOffset = node.y0

    nodesSourceLinks.forEach(function (link) {
      link.y0 = ySourceOffset + (link.width / 2);
      ySourceOffset = ySourceOffset + link.width;
    })

  })

}

function sortTargetLinks(sankeyNodes, sankeyLinks) {
  sankeyNodes.forEach(function (node) {

    let nodesTargetLinks = sankeyLinks.filter(function (l) { return l.target.name == node.name });

    if (nodesTargetLinks.length > 1) {
      nodesTargetLinks.sort(function (link1, link2) {

        //if both are not circular, the base on the target y position
        if (!link1.circular && !link2.circular) {

          let link1Angle = linkAngle(link1);
          let link2Angle = linkAngle(link2);

          return link2Angle - link1Angle;

        }

        //if only one is circular, the move top links up, or bottom links down
        if (link1.circular && !link2.circular) {
          return link1.circularLinkType == "top" ? -1 : 1;
        }
        else if (link2.circular && !link1.circular) {
          return link2.circularLinkType == "top" ? 1 : -1;
        }

        //if both links are circular...
        if (link1.circular && link2.circular) {

          //...and they both loop the same way (both top)
          if (link1.circularLinkType === link2.circularLinkType && link1.circularLinkType == "top") {
            //...and they both connect to a target with same depth, then sort by the target's y
            if (link1.source.depth === link2.source.depth) {
              return link1.source.y1 - link2.source.y1

            }
            //...and they connect to different depth targets, then sort by how far back they
            else {
              return link1.source.depth - link2.source.depth;
            }
          }

          //...and they both loop the same way (both bottom)
          else if (link1.circularLinkType === link2.circularLinkType && link1.circularLinkType == "bottom") {
            //...and they both connect to a target with same depth, then sort by the target's y
            if (link1.source.depth === link2.source.depth) {
              return link2.source.y1 - link1.source.y1;

            }
            //...and they connect to different depth targets, then sort by how far back they
            else {
              return link2.source.depth - link1.source.depth;
            }
          }

          //...and they loop around different ways, the move top up and bottom down
          else {
            return link1.circularLinkType == "top" ? -1 : 1;
          }
        }

      })

    }

    //update y1 for links
    let yTargetOffset = node.y0;

    nodesTargetLinks.forEach(function (link) {
      link.y1 = yTargetOffset + (link.width / 2);
      yTargetOffset = yTargetOffset + link.width;
    })
  })

}
