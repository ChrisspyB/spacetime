"use strict"
// SpacetimeDiagram (div,xmax,ymax,width,height,newtonian?)
var width = 840;

var foo = new SpacetimeDiagram("#testgrounds",0,50,50,width,width,false);
foo.addParticle(0,0,0,true,0,"lab","grey");
foo.addParticle(0,0,0.5,true,20,"r","red");
foo.addParticle(0,0,-0.4,true,20,"b","blue");
foo.addParticle(0,0,0.8,true,20,"g","green");
foo.addParticle(0,0,-0.9,true,20,"o","orange");