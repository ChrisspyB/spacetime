(function() {
"use strict"

var FourVector = function(w,x,y,z) {
    //eg spacetime: (ct,x,y,z), energy-momentum (E,px,py,pz), 4velocity (c,ux,uy,uz)
    //Uses (+---) metric signature
    this.w = w; 
    this.x = x;
    this.y = y;
    this.z = z;
};

FourVector.prototype.add = function(other) {
    //Add another FourVector
    this.w+=other.w;
    this.x+=other.x;
    this.y+=other.y;
    this.z+=other.z;
};

FourVector.prototype.copy = function() {
    return new FourVector(this.w,this.x,this.y,this.z);
};
FourVector.prototype.inner = function(other) {
    return this.w*other.w-this.x*other.x-this.y*other.y-this.z*other.z;
};
FourVector.prototype.norm = function() {
    return this.inner(this);
};

var InertialFrame = function(speed) {
    this.spd = speed;
};

var Particle = function(pos,vel,mass,frame) {
    this.pos = pos;
    this.vel = vel;
    this.mass = mass;
};

//
})();