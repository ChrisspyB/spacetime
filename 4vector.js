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

// -----
var table = d3.select("#st2_table");
var info_cells = [];
var row = table.append("tr");
row.append("td")
	.attr("rowspan","4")
	.append("div")
		.attr("id","stdiagram2");
		
info_cells.push(row.append("td"));
info_cells.push(table.append("tr").append("td"));
info_cells.push(table.append("tr").append("td"));
info_cells.push(table.append("tr").append("td"));

var tmin = -10;
var st2 = new SpacetimeDiagram("#stdiagram2",tmin,10,-10,10,width/1,width/1,false,2,false,true,true);

var st2_pdata = [];

st2.old_transformFrame = st2.transformFrame;
st2.transformFrame = function(v) { 
	// adjust the transform frame function to update the info table
	if(Math.abs(v)>=1) return;
	st2.old_transformFrame(v)
	if(st2_pdata.length===st2._data_particle.length){
		for (var i = 0; i < st2_pdata.length; i++) {
			var p = st2_pdata[i];
			if (Math.abs(p.v)>=1) continue;
			p.v = st2._data_particle[i].vx;
			p.mom = p.m0*p.v/Math.sqrt(1-p.v*p.v);
			p.E = Math.sqrt(p.mom*p.mom+p.m0*p.m0);
			p.m = p.m0/Math.sqrt(1-p.v*p.v);
		};
	}
	updateInfo();
	st2.changeTime(-10);
};
var mergeParticles = function(p1,p2) {

	var p1 = Object.assign({}, p1);
	var p2 = Object.assign({}, p2);
	var p3 = {};

	p3.mom = p2.mom+p1.mom;
	p3.E = p2.E+p1.E;


	p3.ti = 0;
	p3.xi = 0;
	var b = p3.E*p3.E - p3.mom*p3.mom;
	p3.m0 = b===0?0:Math.sqrt(b);

	if (b===0) p3.v=1;
	else{
		var a = (p3.E*p3.E-p3.m0*p3.m0)/(p3.m0*p3.m0);
		p3.v = Math.sqrt(a/(a+1)) * (Math.sign(p3.mom));
	}
	console.log(p3);
	p3.lt = Infinity
	return p3;
};
var updateInfo = function() {
	for (var i = 1; i < info_cells.length; i++) {
		var cell = info_cells[i];
		var p = st2_pdata[i-1];
		cell.html([
			"<b>Particle ", i,
			"</b><br>Rest mass: ", p.m0.toFixed(2)," eV/c<sup>2</sup>",
			"</b><br>Rel. mass: ", p.m0===0?"N/A":p.m.toFixed(2),p.m0===0?"":" eV/c<sup>2</sup>",
			"<br>Velocity: ", p.v.toFixed(2)," c",
			"<br>Momentum: ", p.mom.toFixed(2)," eV/c",
			"<br>Energy: ", p.E.toFixed(2)," eV"

			].join(""));
	};
	//all the system properties are that of the third particle
	var  p = st2_pdata[2];
	info_cells[0].html([
		"<b>System",
		"</b><br>Invariant mass: ",p.m0.toFixed(2)," eV/c<sup>2</sup>",
		"<br>Momentum: ",p.mom.toFixed(2)," eV/c",
		"<br>Energy :",p.E.toFixed(2)," eV"
		].join(""));
};
var buildSim = function(v1,v2) {
	if(v1[0]<v1[1] || v2[0]<v2[1]) throw("uh oh");
	st2._updateData([],true);
	st2_pdata = [];
	for (var i = 0; i <2; i++) {
		var v = i==0?v1:v2;
		var p = {
			E:v[0],
			mom:v[1],
			m0:Math.sqrt(v[0]*v[0]-v[1]*v[1]),
			lt:-tmin,
			ti:tmin
		};
		if (p.m0!==0){
			var a = (v[0]*v[0]-p.m0*p.m0)/(p.m0*p.m0);
			p.v = Math.sqrt(a/(a+1))*Math.sign(v[1]);
		}
		else{
			p.v=1*Math.sign(v[1]);
		}
		p.xi = -p.v*p.lt;
		p.m = p.v/p.m0;
		st2_pdata.push(p);
	};

	st2_pdata.push(mergeParticles(st2_pdata[0],st2_pdata[1]));

	for (var i=0; i<st2_pdata.length; i++){
		var p = st2_pdata[i];
		st2.addParticle(p.xi,p.ti,p.v,false,p.lt,""+i,Math.abs(p.v)===1?"orange":"red");
	}
	st2.transformFrame(0);
};	

d3.select("#rebuild-sim")
	.on("click",function() {
		var v1 = [
			parseFloat(d3.select("#input-p1-e").property("value")),
			parseFloat(d3.select("#input-p1-p").property("value"))
			];

		var v2 = [
			parseFloat(d3.select("#input-p2-e").property("value")),
			parseFloat(d3.select("#input-p2-p").property("value"))
			];
		if (v1[0]<=0||v1[0]<v1[1]){
			d3.select("#input-p1-e").style("background-color","#faa")
			d3.select("#input-p1-p").style("background-color","#faa")
		}else if (v2[0]<=0||v2[0]<v2[1]){
			d3.select("#input-p2-e").style("background-color","#faa")
			d3.select("#input-p2-p").style("background-color","#faa")
		}else{
			d3.select("#input-p1-e").style("background-color","#ffd")
			d3.select("#input-p1-p").style("background-color","#ffd")
			d3.select("#input-p2-e").style("background-color","#ffd")
			d3.select("#input-p2-p").style("background-color","#ffd")
			buildSim(v1,v2);
		}

	});
})();	