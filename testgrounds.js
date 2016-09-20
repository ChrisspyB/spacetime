"use strict"
// SpacetimeDiagram (div,xmin,xmax,ymin,ymax,w,h,newtonian)
var width = 900;

var foo = new SpacetimeDiagram("#testgrounds",-20,20,-20,20,width/1.25,width/1.25,false,true);
foo.addParticle(0,0,0,true,0);
foo.addParticle(0,0,0.25,true,0);
foo.addParticle(-5,0,0.5,false,20);
foo.addParticle(0,0,0.75,true,0);
foo.addParticle(0,0,1,false,20);
// foo.addEvent(10,15);
foo.changeTime(0);