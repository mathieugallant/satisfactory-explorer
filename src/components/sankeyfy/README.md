# d3-sankey-circular-alt

This is a simple ES6 style packaging of d3-sankey-circular (MIT) from Tom Shanley, which is itself based on d3-sankey from Mike Bostock (BSD 3).

The intention of this package is to be used as a ready-made implementation of a d3 Sankey diagram, not as a library. It is not a browser package. It is intended to be used in a project that leverages some sort of bundler.

# Installation in a Feature

You can install this local npm package like any regular npm package by simply passing the correct installation path to the `npm i` command.

Ex.: 
```
npm i ../common/pkgs/d3-sankey-circular-alt
```


# Developping and Testing of this package : Plain Webpack Example

To develop or test this package separately from a feature, you can first create a dummy test project with `npm init`. In that project, add the following files in the specified paths.

## src/index.js
```javascript
import { sankeyfy } from "d3-sankey-circular-alt";

window.someFunction = function (id, data) {
    sankeyfy({ data, id, height: 200, logarithmic: true, autoColor: true });
}
```

## dist/index.html
```html
<!DOCTYPE html>
<html>
<head>
    <script src="main.js"></script>
    <script>
        const sankeyData = {
        nodes: [
          { name: "startA", color: "yellow", borderColor: "black" },
          { name: "startB" },
          { name: "process1", highlight: true},
          { name: "process2", data: {arbitrary: "information"} },
          { name: "process3" },
          { name: "process4" },
          { name: "process5" },
          { name: "process6" },
          { name: "process7" },
          { name: "process8", borderColor: "red" },
          { name: "process9" },
          { name: "process10" },
          { name: "process11" },
          { name: "process12" },
          { name: "process13" },
          { name: "process14" },
          { name: "process15" },
          { name: "process16" },
          { name: "finishA" },
          { name: "finishB" },
          { name: "finishC" },
        ],
        links: [
          { source: "startA", target: "process1", value: 15 },
          { source: "startA", target: "process8", value: 20, color: "red" },
          { source: "startA", target: "process5", value: 30, subColor: "blue" },
          { source: "startA", target: "process6", value: 20 },
          { source: "startB", target: "process1", value: 15 },
          { source: "startB", target: "process5", value: 15 },
          { source: "process1", target: "process4", value: 20 },
          { source: "process4", target: "process1", value: 10 },
          { source: "process2", target: "process7", value: 30 },
          { source: "process1", target: "process3", value: 10 },
          { source: "process5", target: "process3", value: 20, highlight: true },
          { source: "process6", target: "startA", value: 5 },
          { source: "process4", target: "process2", value: 5 },
          { source: "process6", target: "process8", value: 15 },
          { source: "process4", target: "startB", value: 5 },
          { source: "process4", target: "process7", value: 10 },
          { source: "process3", target: "process2", value: 25 },
          { source: "process3", target: "startB", value: 5 },
          { source: "process15", target: "process13", value: 10 },
          { source: "process13", target: "finishC", value: 10 },
          { source: "process7", target: "startB", value: 20 },
          { source: "process8", target: "process1", value: 10 },
          { source: "process16", target: "process9", value: 10 },
          { source: "process8", target: "process11", value: 35 },
          { source: "process11", target: "process10", value: 25 },
          { source: "process4", target: "process12", value: 10 },
          { source: "process12", target: "process11", value: 5 },
          { source: "process7", target: "process15", value: 20 },
          { source: "process15", target: "process14", value: 10 },
          { source: "process10", target: "process9", value: 10 },
          { source: "process10", target: "process16", value: 20 },
          { source: "process14", target: "finishB", value: 10 },
          { source: "process9", target: "finishA", value: 10 },
          { source: "process16", target: "process8", value: 10 },
          { source: "process9", target: "finishB", value: 10 },
          { source: "process11", target: "process14", value: 25 },
        ],
      };
    </script>
    <title>Sankey Example</title>
    <style>
        .sankey-node {
            fill: green;
            stroke-width: 2;
            transition: opacity 0.2s ease-out;
        }

        .sankey-node.dim {
            pointer-events: none;
            opacity: 0.2;
        }

        .sankey-link {
            transition: opacity 0.2s ease-out;
        }

        .sankey-link.dim {
            pointer-events: none;
            opacity: 0.02;
        }

        .sankey-label {
            pointer-events: none;
            font-family: sans-serif;
            font-size: 80%;
            text-shadow: 0 1px 0 #fff;
        }

        .sankey-label.dim {
            opacity: 0.2;
        }

        .sankey-top-link {
            stroke: gray;
            opacity: 0.4;
        }

        .sankey-sub-link {
            opacity: 0.6;
            pointer-events: none;
            stroke: gray;
            stroke-dasharray: 15;
            stroke-dashoffset: 30;
            animation: dash 1s linear forwards;
            animation-iteration-count: infinite;
        }

        .sankey-top-link.highlight {
            animation: pblink 0.5s linear alternate;
            animation-iteration-count: infinite;
        }

        rect.highlight {
            animation: rblink 0.5s linear alternate;
            animation-iteration-count: infinite;
        }

        @keyframes pblink {
            to {
                stroke: red;
            }
        }

        @keyframes rblink {
            to {
                stroke-width: 5;
                stroke: yellow;
            }
        }

        @keyframes dash {
            to {
                stroke-dashoffset: 0;
            }
        }
    </style>
</head>

<body>
    <h2>Sankey Example</h2>
    <div id="chart"></div>
    <script>
        someFunction("#chart", sankeyData)
    </script>
</body>
</html>
```

## Install Modules
In your dummy project, install the module, webpack and a server to test with. 

```
npm init
npm i d3-sankey-circular alt
npm i --save-dev webpack webpack-cli
npm i -g serve
```

Develop or test as needed.

## Build Example and Serve
```
npx webpack
serve ./dist/
```

# Description and Usage

The module exports one function `sankeyfy`. You pass a data object and point it to a DOM element ID.

The function supports some options. The generated diagram is SVG and a basic set of CSS classes are applied to the different parts of the diagram. 

## Data Object Structure

```javascript
{
    nodes: [
        { name: "Start Node", color: "red", borderColor: "black" },
        { name: "Intermediate Node" },
        { name: "End Node", highlight: true}
    ],
    links: [
        { source: "Start Node", target: "Intermediate Node", value: 15 },
        { source: "Intermediate Node", target: "End Node", value: 15, color: "red" },
        { source: "End Node", target: "Start Node", value: 5, subColor: "blue" },
    ],
}
```

## Nodes
Nodes are plain SVG `rect`s.

Node definitions can include
- name : The unique key and label of the node (mandatory, must be unique)
- color : Used to optionally force the node to be a specific color.
- borderColor : Used to optionally force the node border (stroke) to be a specific color. Will match the node color if nothing is specified.
- highlight : Adds the  `highlight` class to the rendered node `rect`.
- data : Can be any arbitrary data. Will be included in the payload of the `mouse-over`, `mouse-out` and `clicked` custom events.

Rendered nodes have the `sankey-node` CSS class. They emit the `sankey_node_mouseover`, `sankey_node_mouseout` and `sankey_node_clicked` custom events. When the user hovers over another node or attached link which has no relations to a given node, that node will be given the `dim` class.

Nodes are accompanied by labels. Text labels cannot be interacted with, but will also have the `dim` applied to is along with it's corresponding node. 

### Example Node CSS 
```css
.sankey-label {
  pointer-events: none;
  font-family: sans-serif;
  font-size: 80%;
  text-shadow: 0 1px 0 #fff;
}
.sankey-label.dim {
  opacity: 0.2;
}

.sankey-node {
  fill: green;
  stroke-width: 1;
  transition: opacity 0.2s ease-out;
}
.sankey-node.dim {
  pointer-events: none;
  opacity: 0.2;
}

.sankey-node.highlight {
  animation: blink 0.5s linear alternate;
  animation-iteration-count: infinite;
}

@keyframes blink {
  to {
    stroke-width: 5;
    stroke: yellow;
  }
}
```

## Links
Links are 2 overlayed SVG `path`s (the link and sublink). The sublink is one third the width of the link and is intended to be used as a visual aid in busy diagrams by applying key CSS treatment to their class. Both the link and sublink are grouped.

Link definitions can include
- source : The unique key of the source node (mandatory)
- target : The unique key of the target node (mandatory)
- value : A numerical value
- color : Used to optionally force the link path to be a specific color.
- subColor : Used to optionally force the sub link path to be a specific color. Will match the link color if nothing is specified
- highlight : Adds the  `highlight` class to the rendered node `path`s (both the link and sublink).

Rendered links have the `sankey-top-link` CSS class. Sublinks have the `sankey-sub-link` class applied. The link and sublink group has the `sankey-link` class. They emit the `sankey_link_mouseover`, `sankey_link_mouseout` and `sankey_link_clicked` custom events. When the user hovers over another link or attached node, that links will be given the `dim` class.


### Example Link CSS 
```css
.sankey-link {
  transition: opacity 0.2s ease-out;
}
.sankey-link.dim {
  pointer-events: none;
  opacity: 0.02;
}

.sankey-top-link {
  stroke: gray;
  opacity: 0.4;
}

.sankey-sub-link {
  opacity: 0.6;
  pointer-events: none;
  stroke: gray;
  stroke-dasharray: 15;
  stroke-dashoffset: 30;
  animation: dash 1s linear forwards;
  animation-iteration-count: infinite;
}

.sankey-top-link.highlight {
  animation: pblink 0.5s linear alternate;
  animation-iteration-count: infinite;
}

@keyframes blink {
  to {
    stroke: red;
  }
}

@keyframes dash {
  to {
    stroke-dashoffset: 0;
  }
}
```

# Parameters

The `sankeyfy` functions accepts the following parameters :
- data : Default = {links: [], nodes: []}. The data object.
- id : Default = '#sankey'. The HTML DOM element ID.
- width : Default = 1000. The `User Space` width of the SVG
- height : Default = 400. The `User Space` height of the SVG
- logarithmic : Default = false. Runs all link "values" through a logarithmic function to reduce link size discrepancies (`Math.log(value + 1)`).
- nodeWidth : Default = 15. The width of the SVG `rect` in `user space`. 
- iterations : Default = 32. Affects the node positioning logic.
- nodePaddingRatio : Default = 0.5. Affects how far apart nodes are placed.
- autoColor : Default = false. Will apply a `fill` and `stroke` color to all nodes based on `depth` in the data structure, which will override any value set in the CSS classes for `sankey-node`. Will not override `color` and `borderColor` set in the nodes.

