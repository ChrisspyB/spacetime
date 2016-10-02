(function() {
"use strict"

var frame_length = 100; // ms

var width = 900,
	xmin = -20,
	xmax = 20,
	tmin = 0,
	tmax = 20;

// Define the inital particles

var p_data = [];
p_data.push({x:0,y:0,v:0.00,m:0,m0:10});
p_data.push({x:0,y:1,v:0.25,m:0,m0:10});
p_data.push({x:0,y:2,v:0.50,m:0,m0:10});
p_data.push({x:0,y:3,v:0.75,m:0,m0:10});
p_data.push({x:0,y:4,v:0.99,m:0,m0:10});

// Build the st diagram

var st = new SpacetimeDiagram("#stdiagram",xmin,xmax,tmin,tmax,width/1,width/1,false,2.5,false,false,false);
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

var mergeParticles = function(p1,p2) {

	var p1 = Object.assign({}, p1);
	var p2 = Object.assign({}, p2);
	var p3 = {};

	p3.mom = p2.mom+p1.mom;
	p3.E = p2.E+p1.E;

	console.log(p3.mom,p3.E);

	p3.ti = (p1.xi-p2.xi)/(p2.v-p1.v);
	p3.xi = p1.xi+p1.v*p3.ti;
	p3.m0 = Math.sqrt(p3.E*p3.E - p3.mom*p3.mom);

	var a = (p3.E*p3.E-p3.m0*p3.m0)/(p3.m0*p3.m0);
	p3.v = Math.sqrt(a/(a+1)) * (Math.sign(p3.mom));

	p3.lt = Infinity
	return p3;
};

var foo = function(e,p) {
	var m = Math.sqrt(e*e-p*p);
	var a = (e*e-m*m)/(m*m)
	var v = Math.sqrt(a/(a+1));
	console.log("m:"+m+" spd:"+v);
};

var p1 = {xi:-5,v:0.40,m0:3};
var p2 = {v:-0.6,m0:90};

p1.mom = p1.m0*p1.v/Math.sqrt(1-p1.v*p1.v);
p1.E = Math.sqrt(p1.mom*p1.mom+p1.m0*p1.m0);
p2.mom = p2.m0*p2.v/Math.sqrt(1-p2.v*p2.v);
p2.E = Math.sqrt(p2.mom*p2.mom+p2.m0*p2.m0);

p2.xi = p1.xi*p2.v/p1.v; // to ensure collision at x=0
p1.lt = (p1.xi-p2.xi)/(p2.v-p1.v);
p2.lt = p1.lt

var p3 = mergeParticles(p1,p2);

// offset so that collision occurs at t=0

p1.ti=-p1.lt;
p2.ti=-p1.lt;
p3.ti-=p1.lt;


var p2_data = [];
p2_data.push(p1);
p2_data.push(p2);
p2_data.push(p3);

var st2 = new SpacetimeDiagram("#stdiagram2",-10,10,-10,10,width/1,width/1,false,2,false,true,true);
for (var i=0; i<p2_data.length; i++){
	var p = p2_data[i];
	st2.addParticle(p.xi,p.ti,p.v,false,p.lt,"","red");
}

st2.changeTime(-10);

})();	