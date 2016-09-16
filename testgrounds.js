"use strict"
// SpacetimeDiagram (div,xmin,xmax,ymin,ymax,w,h,newtonian)
var width = 840;

var foo = new SpacetimeDiagram("#testgrounds",-100,100,-0,100,width/1.26,width/1.6,false);
// foo.addParticle(0,0,0,true,0);
// foo.addParticle(0,0,0.25,true,0);
foo.addParticle(0,0,0.5,true,0);
// foo.addParticle(0,0,0.75,true,0);
foo.addParticle(0,0,1,true,0);
// foo.addEvent(10,15);
foo.changeTime(0);