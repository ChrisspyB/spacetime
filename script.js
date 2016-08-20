(function() {
"use strict"

var width = 840; //width of containing div

var FourVector2D = function(w,x) {
    //Object representing four vectors in special relativity, with y,z componets assumed zero
    //eg spacetime: (ct,x,y,z), energy-momentum (E/c,px,py,pz), 4velocity gamma*(c,ux,uy,uz)
    //Uses (+---) metric signature
    this.w = w; 
    this.x = x;
};
FourVector2D.prototype.add = function(other) {
    //Add another FourVector2D
    this.w+=other.w;
    this.x+=other.x;
};
FourVector2D.prototype.sub = function(other) {
    //Subtract another FourVector2D
    this.w-=other.w;
    this.x-=other.x;
};
FourVector2D.prototype.scale = function(scaler) {
    //Scaler multiplication
    this.w*=scaler;
    this.x*=scaler;
};
FourVector2D.prototype.inner = function(other) {
    //Inner product of two four vectors
    return this.w*other.w-this.x*other.x;
};
FourVector2D.prototype.norm = function() {
    return this.inner(this);
};
FourVector2D.prototype.copy = function() {
    return new FourVector2D(this.w,this.x);
};

var Particle = function(spacetime,velocity,restmass) {
    //Particle restricted to motion in +- x-direction only
    //Everything in natural units (c=1)

    //Frame dependent
    this.st = spacetime; //FourVector2D: .w = ct part, .x = x part
    this.u = velocity; // signed scaler velocity (x-direction)
    this.g; // gamma factor
    this.p; // relativistic momentum
    this.mass_rel; // relativistic mass
    this.E_square; // 

    //Frame independent
    this.restmass = restmass; // rest mass
    this.s_square; //length of st vectors

    this._calc(true,true,true,true,true);

};
Particle.prototype._calc= function(g,m_rel,p,energy,s) {
    if(g) this.g = 1/Math.sqrt(1-this.u*this.u);
    if(m_rel) this.mass_rel = this.g * this.restmass;
    if(p) this.p = this.mass_rel * this.u;
    if(energy) this.E_square = this.p*this.p + this.restmass*this.restmass
    if(s) this.s_square = this.st.norm();
};
Particle.prototype.updatePos = function(x) {
    var w_sq = this.s_square-x*x;
    if (w_sq<0) w_sq*=-1;
    this.st.w = Math.sqrt(w_sq);
    this.st.x  = x;
    return true;
};
Particle.prototype.updateVel = function(u) {
    this.u = u;
    this._calc(true,true,true,true,true);
};
Particle.prototype.changeFrame = function(x,u) {
    // x,u particle position and velocity in new frame
    if(u>1){
        throw("Particles cannot travel faster than light speed...")
        return;
    }
    if(this.updatePos(x)){
        this.updateVel(u);
    }

};
var SpacetimeDiagram = function(div,w,h) {
    //SVG diagram displaying ct against x
    //div is the html element id (#string) to which the svg is appended
    var that = this; 

    this.div = div;

    this.margin = {top: 20, right: 20, bottom: 50, left: 70},
    this.width = w - this.margin.left - this.margin.right,
    this.height = h - this.margin.top - this.margin.bottom;

    //add svg object and translate group to top left margin
    this.svg = d3.select(div).append("svg")
        .classed("spacetime",true)
        .attr("width",w)
        .attr("height",h)
    .append("g")
        .attr("transform",
        "translate(" + this.margin.left + "," + this.margin.top + ")");

    //set up axes scaling functions
    this.yscale = d3.scaleLinear()
        .domain([0,50])
        .range([this.height,0]);

    this.xscale = d3.scaleLinear()
        .domain([0,50])
        .range([0,this.width]);

    //add x axis
    this.svg.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(this.xscale));

    this.svg.append("text")             
        .attr("transform",
            "translate(" + (this.width/2) + " ," + 
                (this.height + this.margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("x");

    //add y axis
    this.svg.append("g")
        .call(d3.axisLeft(this.yscale));
    this.svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - this.margin.left)
        .attr("x",0 - (this.height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("ct"); 

    this.stvector = this.svg.append("g");

    this.stvector_line = this.stvector.append("line")
        .style("stroke","black");

    this.stvector_arrowhead = this.stvector.append("circle") //temp appearance
        .attr("r",5)
        .style("fill","red");

    this.updateVector(0,0,0,0);
};
SpacetimeDiagram.prototype.updateVector = function(x1,y1,x2,y2) {
    // update the position of the vector
    console.log(x1,y1,x2,y2);
    this.stvector_line
        .attr("x1",this.xscale(x1))
        .attr("y1",this.yscale(y1))
        .attr("x2",this.xscale(x2))
        .attr("y2",this.yscale(y2));
    this.stvector_arrowhead
        .attr("cx",this.stvector_line.attr("x2"))
        .attr("cy",this.stvector_line.attr("y2"));
};
var temp_LogParticleProperties = function(p) {
    console.log(p);
    console.log("st vector: "+p.st.x+","+p.st.w);
    console.log("velocity: "+p.u+"c");
    console.log("momentum: "+p.p+"eV/c");
    console.log("relativistic mass "+p.mass_rel+"eV/c/c");
    console.log("rest mass "+ p.restmass+"eV/c/c");
    console.log("energy "+Math.sqrt(p.E_square)+"eV");
};
var p = new Particle(new FourVector2D(10,0),0,2);
var st = new SpacetimeDiagram("#testgrounds",width,width);
p.changeFrame(0,0)
st.updateVector(0,0,p.st.x,p.st.w);
temp_LogParticleProperties(p);
})();