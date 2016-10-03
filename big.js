"use strict"
// SpacetimeDiagram (div,xmin,xmax,ymin,ymax,w,h,newtonian)
var width = 900,
	height = 800;

for (var i=1; i<3; i++) {
	var st = new SpacetimeDiagram("#diag"+i,-20,20,-20,20,width,height,i===1?true:false,1,true,false,true);		
	st.addEvent(4,4,"","red");
	st.addEvent(8,10,"","green");
	st.addEvent(12,7,"","blue");
	st.addEvent(2,14,"","orange");
	st.addEvent(12,4,"","purple");
	st.changeTime(0);
}


// Dimensions in tunnel frame

var xmin = -20,
	xmax = 40,
	ymin = -20,
	ymax = 40

var tunnel = {x:10,w:10};
var train = {x:0,w:10,v:0.8};

var st3 = new SpacetimeDiagram("#diag_train_st",xmin,xmax,ymin,ymax,width,height,false,5,true);
st3.addParticle(train.x,0,train.v,true,0,"Train Front","steelblue");
st3.addParticle(train.x-train.w,0,train.v,true,0,"Train Back","steelblue");
st3.addParticle(tunnel.x,0,0,true,0,"Entrance","grey");
st3.addParticle((tunnel.x+tunnel.w),0,0,true,0,"Exit","grey");
st3.addEvent(tunnel.x,(tunnel.x-train.x+train.w)/train.v,"Gate Closes","red");
// st3.addEvent(tunnel.x,(tunnel.x-train.x)/train.v,"Front enters","blue");
// st3.addEvent(tunnel.x+tunnel.w,(tunnel.x+tunnel.w-train.x+train.w)/train.v,"Back leaves","blue");
st3.addEvent(tunnel.x+tunnel.w,(tunnel.x+tunnel.w-train.x)/train.v,"Front leaves","red");
st3.changeTime(0);

// Build train diagram.
var svg = d3.select("#diag_train_extra").append("svg")
	.attr("width",width)
	.attr("height",height)
	.style("background","green");
var xscale = d3.scaleLinear().domain([xmin,xmax]).range([0,width])
var tunnel = svg.append("rect")
	.attr("x",xscale(tunnel.x-tunnel.w))
	.attr("y",height/4)
	.attr("width",xscale(tunnel.x+tunnel.w)-xscale(tunnel.x))
	.attr("height",height/2)
	.style("fill","#888");
var car = svg.append("rect")
	.attr("x",xscale(train.x-train.w))
	.attr("y",3*height/8)
	.attr("width",xscale(train.x+train.w)-xscale(train.x))
	.attr("height",height/4)
	.style("fill","blue");