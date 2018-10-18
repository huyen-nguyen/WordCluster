/* Oct 2018
 * Tommy Dang, Assistant professor, iDVL@TTU
 * Huyen Nguyen, PhD student

 * THIS SOFTWARE IS BEING PROVIDED "AS IS", WITHOUT ANY EXPRESS OR IMPLIED
 * WARRANTY.  IN PARTICULAR, THE AUTHORS MAKE NO REPRESENTATION OR WARRANTY OF ANY KIND CONCERNING THE MERCHANTABILITY
 * OF THIS SOFTWARE OR ITS FITNESS FOR ANY PARTICULAR PURPOSE.
 */

var sizeW = 800;
// var svgW;
// var linkW;
// var nodeW;
// var nodes;
// var links;

var groupPath = function (d) { // calculate convex hull
    var fakePoints = [];
    if (d.values.length == 2) {
        //[dx, dy] is the direction vector of the line
        var dx = d.values[1].x2 - d.values[0].x2;
        var dy = d.values[1].y2 - d.values[0].y2;

        //scale it to something very small
        dx *= 0.00001;
        dy *= 0.00001;

        //orthogonal directions to a 2D vector [dx, dy] are [dy, -dx] and [-dy, dx]
        //take the midpoint [mx, my] of the line and translate it in both directions
        var mx = (d.values[0].x2 + d.values[1].x2) * 0.5;
        var my = (d.values[0].y2 + d.values[1].y2) * 0.5;
        fakePoints = [[mx + dy, my - dx],
            [mx - dy, my + dx]];
        //the two additional points will be sufficient for the convex hull algorithm
    }
    //do not forget to append the fakePoints to the input data
    return "M" +
        d3.geom.hull(d.values.map(function (i) {
            return [i.x2, i.y2];
        })
            .concat(fakePoints))
            .join("L")
        + "Z";
}
var t0, t1;
// Vinh Function
var gcell, gcells, gnode, ggroup, ggroups, gcoords, gcen, gregion, gregions, clusterData, coms = [], paths = [], text = [];
function createForceWithVorenon(m,svg,callback) {
    t0 = performance.now();
    var graph = graphByMonths[2][selectedCut];
    let newnodes = JSON.parse(JSON.stringify(graph.nodes));
    let newlinks = JSON.parse(JSON.stringify(graph.links));
    let fnodes = newnodes;      // new data
    let flinks = newlinks;


    //create new svg
    let width = 600,
        height = 600;
    let color =d3.scale.category10();
    let voronoi = d3.voronoi()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .extent([[-1, -1], [width + 1, height + 1]]);

    // let svg = d3.select("body").append("svg")
    //     .attr("width", width)
    //     .attr("height", height);
    let svg1 = svg.append("g").attr("transform", "translate(" + 210 + "," + 350 + ")");
    function start() {
        var ticksPerRender = 3;
        requestAnimationFrame(function render() {
            for (var i = 0; i < ticksPerRender; i++) {
                force.tick();
            }
            links
                .attr('x1', function(d) { return d.source.x; })
                .attr('y1', function(d) { return d.source.y; })
                .attr('x2', function(d) { return d.target.x; })
                .attr('y2', function(d) { return d.target.y; });
            nodes
                .attr('cx', function(d) { return d.x; })
                .attr('cy', function(d) { return d.y; });

            if (force.alpha() > 0) {
                requestAnimationFrame(render);
            }
        })
    }
    // create new force
    var newforce = d3.layout.force()
        .nodes(fnodes)
        .links(flinks)
        .size([width, height])
        .charge(-300)
        .on("tick", tick)
        .on("end", end)

        .start();
    // done drawing paths
    // after above commands, data has been forced to have x, y, ...

    // cells = all regions, each big region = 1 community, each small region = 1 term
    var cells = svg1.selectAll()
        .data(newforce.nodes())
        .enter().append("g")
        .attr("opacity","0.5")
        .attr("fill",function(d) { return color(d.community); })
        .attr("class",function(d) { return d.community });

    gcells = cells;
    var cell = cells.append("path")
        .data(voronoi.polygons(newforce.nodes()));

    gcell = cell;
    var node = svg1.selectAll(".node")
        .data(newforce.nodes())
        .enter().append("text")
        .text(function (d) {
            return d.name;
        })
        .attr("class", "node1")
        .attr("opacity", 0);
        // .attr("class", "link");
    // let pathGroup = 0[];
    // for (let i = 0; i < newforce.nodes().length; i++){
    //
    // }



    clusterData = newforce.nodes();  // PROTOTYPE ============================

    function tick() {
        let alpha = newforce.alpha();
        let coords ={};
        let groups = [];

        // sort the nodes into groups:
        node.each(function(d) {
            if (groups.indexOf(d.community) == -1 ) {
                groups.push(d.community);
                coords[d.community] = [];
            }

            coords[d.community].push({x:d.x,y:d.y});
        })

        // get the centroid of each group:
        var centroids = [];

        for (var group in coords) {     // group is so thu tu
            var groupNodes = coords[group];

            var n = groupNodes.length;
            var cx = 0;
            var tx = 0;
            var cy = 0;
            var ty = 0;

            groupNodes.forEach(function(d) {
                tx += d.x;
                ty += d.y;
            })

            cx = tx/n;
            cy = ty/n;

            centroids[group] = {x: cx, y: cy}
        }
        ggroup = group;
        ggroups = groups;
        gcoords = coords;
        gcen = centroids;       // An object

        // don't modify points close the the group centroid:
        var minDistance = 10;

        if (alpha < 0.1) {
            minDistance = 10 + (1000 * (0.1-alpha))
        }

        // adjust each point if needed towards group centroid:
        node.each(function(d) {
            var cx = centroids[d.community].x;
            var cy = centroids[d.community].y;
            var x = d.x;
            var y = d.y;
            var dx = cx - x;
            var dy = cy - y;

            var r = Math.sqrt(dx*dx+dy*dy)

            if (r>minDistance) {
                d.x = x * 0.9 + cx * 0.1;
                d.y = y * 0.9 + cy * 0.1;
            }
        })
        cell = cell.data(voronoi.polygons(newforce.nodes())).attr("d", renderCell);

        node.attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; });
        // link.attr("x1", function(d) { return d.source.x; })
        //     .attr("y1", function(d) { return d.source.y; })
        //     .attr("x2", function(d) { return d.target.x; })
        //     .attr("y2", function(d) { return d.target.y; });
    }
    function end() {
        // update link
        flinks.forEach(function (l,i) {
            newforce.nodes().forEach(function (n,j) {
                if(l.source.id ==n.id){
                    l.source.x = n.x;
                    l.source.y = n.y;
                }
                if(l.target.id ==n.id){
                    l.target.x = n.x;
                    l.target.y = n.y;
                }
            })
        });
        var link = svg1.selectAll(".link")
            .data(flinks)
            .enter().append("line")
            .attr("stroke-width",0)
            .attr("stroke","black");

        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        // group.attr("d", groupPath);
        console.log("End of force!");
        callback(svg1);

        // console.log(flinks);
        // console.log(fnodes);
    };
    function renderCell(d) {
        return d == null ? null : "M" + d.join("L") + "Z";
    }

}

function bound(svg1){       // Draw convex hull

    let width = 600,
        height = 600;
    let color =d3.scale.category10();
    let voronoi = d3.voronoi()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .extent([[-1, -1], [width + 1, height + 1]]);


    // draw regions after drawing cells
    var regions = svg1.selectAll()
        .data(gcen)
        .enter()
        .append("g")
        .attr("fill",function(d,i) { return color(i); })
        .attr("opacity","0.8");

    var region = regions.append("path")
        .data(voronoi.polygons(gcen));

    region = region.data(voronoi.polygons(gcen)).attr("d", d => `M${d.join("L")}Z`);

    svg1.append("g")
        .selectAll("text")
        .data(gcen)
        .enter().append("text")
        .text((d,i) => i)
        .attr("transform", d => "translate("+d.x +","+d.y+")");

    // var hullArray = [];
    // var hull = svg1.append("path")
    //     .attr("class", "hullFrame")
    //     .attr("transform", "translate(" + 210 + "," + 350 + ")");
    //
    // paths.forEach( function(vertices, index) {
    //     hullArray[index] = [];
    //     hullArray[index] = hullArray[index].concat(hull.datum(d3.geom.hull(vertices)).attr("d", function(d) { return "M" + d.join("L") + "Z"; })[0][0].__data__);
    //
    // });
    // var vertices = paths[2];
    // hull.datum(d3.geom.hull(vertices)).attr("d", function(d) { return "M" + d.join("L") + "Z"; });
    // console.log(hullArray);
    gnode = voronoi.polygons(gcen);
    gregion = region;
    gregions = regions;

    // let numClass = 0;
    // get number of classes
    // for (let i = 0; i < cells[0].length; i ++){
    //     // get max community
    //     coms.push(cells[0][i].__data__["community"]);
    //     numClass = d3.max(coms);
    // }

    // get coordinates for every point in each community
    // for (let i = 0; i < numClass+1; i++){       // 0 -> 6 (6 groups/communities)
    //     paths[i] = [];
    //     text[i] = [];
    //     for (let j = 0; j < cells[0].length; j ++){     // 0 -> 36
    //         if (i === cells[0][j].__data__["community"]){
    //             paths[i] = paths[i].concat(cells[0][j].firstElementChild.__data__);
    //             text[i] = text[i].concat(cells[0][j].__data__);
    //             // add to each paths[i] all the points
    //         }
    //     }
    // }
    // console.log(paths);
    // console.log(text);

    // get sites (middle point) for every
    // paths[i] contains all point in community i
    // done getting points
    t1 = performance.now();
    console.log("Call took " + ((t1 - t0)/1000).toFixed(0) + " seconds.")
}

console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.")
function wordCluster(){
//     svgW = svg.append("g")
//                 .attr("class", "svgW")
//                 .attr("transform", "translate(" + 0 + "," + 0 + ")");
//
//    /* svgW.append("rect")
//         .attr("class", "rect1")
//         .attr("x", 0)
//         .attr("y", 0)
//         .attr("width", sizeW)
//         .attr("height", sizeW)
//         .style("stroke-opacity", 0.6)
//         .style("stroke", "#00")
//         .style("fill", "#fff");*/
//
//     var graph = graphByMonths[2][selectedCut];
//     nodes = graph.nodes;
//     links = graph.links;
//
//
//     var rScale = d3.scale.linear()
//                     .range([3,10])
//                     .domain([0, Math.sqrt(50)]);
//
//     var fill = d3.scale.category10();
//     var groups = d3.nest()
//         .key(function (d) {
//             return d.community;
//         })
//         .entries(nodes);
//     groups = groups.filter(function (d) {
//         return d.values.length > 1;
//     });
//     var partition = [];
//     groups.forEach(function (d) {
//         var temp = [];
//         d.values.forEach(function (e) {
//             temp.push(e.id);
//         })
//         partition.push(temp);
//     });
//
//
//
//
//      groupW =  svgW.selectAll("path")
//         .data(groups)
//         .attr("d", groupPath)
//         .enter().append("path", "circle")
//         .style("fill", "#000")
//         .style("stroke", "#000")
//         .style("stroke-width", 14)
//         .style("stroke-linejoin", "round")
//         .style("opacity", 0.2);
//
//
// // Link Scales ************************************************************
//     linkW = svgW.selectAll(".linkWordCluster")
//         .data(links)
//         .enter().append("line")
//         .attr("class", "linkWordCluster")
//         .style("stroke-opacity", 0.6)
//         .style("stroke", "#000")
//         .style("stroke-width", function (d) {
//
//             return linkScale3(d.count);
//         });
//
//
//     nodeW = svgW.selectAll(".nodeWordCluster")
//         .data(nodes)
//         .enter().append("circle")
//         .attr("class", "nodeWordCluster")
//         .attr("r", function(d){
//             return rScale(d.count);
//         })
//         .style("stroke", "#000")
//         .style("stroke-width", 0.02)
//         .style("stroke-opacity", 1)
//         .style("fill",function(d){
//                 return getColor3(d.category);
//         })
//         .on("mouseover", function(d){
//             showTip(d, this);
//         })
//         .on("mouseout", function(d){
//             hideTip(d);
//         });
}


