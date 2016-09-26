"use strict"

var frame_length = 100; // ms

var width = 900,
	xmin = -20,
	xmax = 100,
	tmin = -20,
	tmax = 100;

var tunnel = {x:10,w:10};
var train = {x:-5,w:10,v:0.5};
// Build the st diagram

var st = new SpacetimeDiagram("#stdiagram",xmin,xmax,tmin,tmax,width/1,width/1,false,2.5);
st.addParticle(train.x,0,train.v,true,0,"Train Front","steelblue");
st.addParticle(train.x+train.w,0,train.v,true,0,"Train Back","steelblue");
st.addParticle(tunnel.x,0,0,true,0,"Entrance","grey");
st.addParticle((tunnel.x+tunnel.w),0,0,true,0,"Exit","grey");
st.addEvent(tunnel.x,(tunnel.x-train.x-train.w)/train.v,"Front enters","green");
st.addEvent(tunnel.x,(tunnel.x-train.x)/train.v,"Back enters","green");
st.addEvent(tunnel.x+tunnel.w,(tunnel.x+tunnel.w-train.x-train.w)/train.v,"Front leaves","blue");
st.addEvent(tunnel.x+tunnel.w,(tunnel.x+tunnel.w-train.x)/train.v,"Back leaves","blue");
st.changeTime(0);
st.transformFrame(train.v);
