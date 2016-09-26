"use strict"

var frame_length = 100; // ms

var width = 900,
	xmin = -20,
	xmax = 20,
	tmin = 0,
	tmax = 20;

// Define the inital particles

var p_data = [];
p_data.push({x:0,y:0,v:0,m:0,m0:10});
p_data.push({x:0,y:1,v:0.25,m:0,m0:10});
p_data.push({x:0,y:2,v:0.5,m:0,m0:10});
p_data.push({x:0,y:3,v:0.75,m:0,m0:10});
p_data.push({x:0,y:4,v:0.99,m:0,m0:10});

// Build the st diagram

var st = new SpacetimeDiagram("#stdiagram",xmin,xmax,tmin,tmax,width/1,width/1,false,2.5,true);
for (var i=0; i<p_data.length; i++){
	st.addParticle(0,0,p_data[i].v,true,0);
}
// st.changeTime(0);

// Build the particle animation box

var margin = {top:20, right:20, bottom:20, left: 20};

var w = width - margin.left - margin.right;
var h = w/2 - margin.top - margin.bottom;
var t = tmin;

var svg = d3.select("#particles").append("svg")
	.attr("width",w+margin.left+margin.right)
	.attr("height",h+margin.bottom+margin.top)
	.style("background","grey")
	.append("g")
        .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

var xscale = d3.scaleLinear()
    .domain([xmin,xmax])
    .range([0,w]);

var yscale = d3.scaleLinear()
    .domain([0,p_data.length-1])
    .range([h,0]);


var circles = svg.selectAll("circle").data(p_data);

circles.enter().append("circle")
	.attr("cx",function(d) {return xscale(d.x)})
	.attr("cy",function(d) {return yscale(d.y)})
	.attr("r",function(d) {return d.m})
	.attr("fill","red");


d3.select("#particles").append("input").attr("type","range")
	.attr("min",-0.99)
	.attr("max",0.99)
	.attr("step",0.01)
	.on("change",function() {
		var u = d3.select(this).property("value");
		st.transformFrame(u);
		t=0;
		for(var i=0; i<p_data.length; i++){
			var p = p_data[i];
			p.v = (p.v-u)/(1-p.v*u);
		}
		run();
		d3.select(this).property("value",0);
	})

var update_particles = function() {
	// update p data
	for (var i=0; i<p_data.length; i++){
		var p  = p_data[i];
		p.x = p.v*t; // x = vt
		p.m = Math.abs(p.v)>=1?0:1/Math.sqrt(1-p.v*p.v)*p.m0 // m = gamma m0

	}
	// update visuals
	circles = svg.selectAll("circle").data(p_data);

	circles
		.attr("cx",function(d) {return xscale(d.x)})
		.attr("r",function(d) {return d.m;});
};
var waitframe = false;
var run = function() {
	// run the st and the other sim
	// dont use st.animate to ensure diagrams in sync
	if(waitframe) return;
	waitframe = true;
	setTimeout(function() {
		waitframe = false;
		t++;
		if(t>tmax){
			return;
		}
		st.changeTime(t)
		update_particles();
		run();
	},frame_length);
};

run();