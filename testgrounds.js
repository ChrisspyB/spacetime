"use strict"
// SpacetimeDiagram (div,xmin,xmax,ymin,ymax,w,h,newtonian)
var width = 900;

var foo = new SpacetimeDiagram("#testgrounds",-20,20,-20,20,width/1,width/1,true,2.5);
foo.addParticle(0,0,0,true,0);
foo.addParticle(0,0,0.25,true,0);
foo.addParticle(0,0,1,false,20);
foo.addEvent(10,15);
foo.changeTime(0);