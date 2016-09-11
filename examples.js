"use strict"
// SpacetimeDiagram (div,xmin,xmax,ymin,ymax,w,h,newtonian)
var width = 840;

var ex1 = new SpacetimeDiagram("#ex1",0,50,0,50,width,width,false);
ex1.addParticle(0,0,0,true,Infinity,"lab");
ex1.addParticle(0,0,0.5,false,20,"particle");
//
var ex2 = new SpacetimeDiagram("#ex2",0,50,0,50,width,width,false);
ex2.addParticle(0,-50,0,true,Infinity,"lab");
ex2.addParticle(0,0,0.9,true,Infinity,"rodLeft","grey");
ex2.addParticle(10,0,0.9,true,Infinity,"rodRight","grey");
//asteroid warning
var ex3 = new SpacetimeDiagram("#ex3",0,30,0,25,width,width,false);
ex3.tstep=0.5;
ex3.addParticle(5,0,0,false,10,"spaceship1","blue");
ex3.addParticle(10,0,0,false,15,"spaceship2_Slow","red");
ex3.addParticle(0,0,0.5,false,Infinity,"asteroid","brown");
ex3.addParticle(5,10,1,false,5,"explosion");
ex3.addParticle(10,15,0.6,false,Infinity,"spaceship2_Fast","red");
ex3.addEvent(5,10,"collision");
ex3.addEvent(10,15,"collisionDetected");
//twins
var ex4 = new SpacetimeDiagram("#ex4",-20,20,-20,20,width,width,false);
ex4.tstep=0.5;
ex4.addParticle(0,-50,0,true,Infinity,"earth","blue");
ex4.addParticle(0,0,0.8,false,5,"spaceshipLeaving","red");
ex4.addParticle(4,5,-0.8,false,5,"spaceshipReturning","red");
ex4.addEvent(0,0,"departure");
ex4.addEvent(4,5,"turnAround");
ex4.addEvent(0,10,"arrival");