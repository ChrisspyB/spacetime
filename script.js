(function() {
"use strict"

var width = 840; // width of containing div

var velAddition = function(u,v) {
    //in natural units
    //returns velocity in frame S'
    //u:velocity in frame S, v: relative velocity of frames S and S'
    return (u-v)/(1-u*v) 
};


var FourVector2D = function(w,x) {
    // Object representing four vectors in special relativity, with y,z componets assumed zero
    // eg spacetime: (ct,x,y,z), energy-momentum (E/c,px,py,pz), 4velocity gamma*(c,ux,uy,uz)
    // Uses (+---) metric signature
    this.w = w; 
    this.x = x;
};
FourVector2D.prototype.add = function(other) {
    // Add another FourVector2D
    this.w+=other.w;
    this.x+=other.x;
};
FourVector2D.prototype.sub = function(other) {
    // Subtract another FourVector2D
    this.w-=other.w;
    this.x-=other.x;
};
FourVector2D.prototype.scale = function(scaler) {
    // Scaler multiplication
    this.w*=scaler;
    this.x*=scaler;
};
FourVector2D.prototype.inner = function(other) {
    // Inner product of two four vectors
    return this.w*other.w-this.x*other.x;
};
FourVector2D.prototype.norm = function() {
    // inner product with itself
    return this.inner(this);
};
FourVector2D.prototype.copy = function() {
    // Make an identical copy of this vector
    return new FourVector2D(this.w,this.x);
};

var Particle = function(spacetime,velocity,restmass) {
    // Particle restricted to motion in +- x-direction only
    // Everything in natural units (c=1)

    // Frame dependent
    this.st = spacetime; // FourVector2D: .w = ct part, .x = x part
    this.u = velocity; // signed scaler velocity (x-direction)
    this.g; // gamma factor
    this.p; // relativistic momentum
    this.mass_rel; // relativistic mass
    this.E_square; // 

    // Frame independent
    this.restmass = restmass; // rest mass
    this.s_square; // length of st vectors

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
    var w_sq = this.s_square+x*x;

    if (w_sq<0){console.log("negative w_sq!"); w_sq*=-1;}
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
        throw("Particles cannot travel faster than light speed...");
        return;
    }
    if(this.updatePos(x)){
        this.updateVel(u);
    }
};
var SpacetimeDiagram = function(div,xmax,ymax,w,h) {
    // SVG diagram displaying ct against x
    // div is the html element id (#string) to which the svg is appended
    // xmax(ymax): max value for x(y) domain.
    // There should never be more than one SpacetimeDiagram per div!

    var that = this;
    this.div = div;
    this.pointevents = []; // list of point events to be plotted (as circles)
    this.eventselected = false; // is an event currently selected?
    this.selectedIndex = 0;
    this.newtonian = false; // is this currently displaying newtonian physics?
    this.event_marker_r = 10; // radius of circle representing point events
    this.selection_axes_l = 5; // length (before scaling) of axes drawn on selection
    this._data = [];
    this.oldoff = 0;
    this.t = 0; // current time (simulation run-time)
    this.animating = false;
    this.waitframe = false; // for preventing overlapping animation calls.
    this.framelength = 100;
    // conventional d3 margin setup
    this.margin = {top: 220, right: 220, bottom: 250, left: 270},
    this.width = w - this.margin.left - this.margin.right,
    this.height = h - this.margin.top - this.margin.bottom;

    // add svg object and translate group to top left margin
    this.svg = d3.select(div).append("svg")
        .classed("spacetime",true)
        .attr("width",w)
        .attr("height",h)
    .append("g")
        .attr("transform",
        "translate(" + this.margin.left + "," + this.margin.top + ")");
    
    // ---------- Set up axes ----------
    
    // scaling functions
    this.yscale = d3.scaleLinear()
        .domain([0,ymax])
        .range([this.height,0]);

    this.xscale = d3.scaleLinear()
        .domain([0,xmax])
        .range([0,this.width]);

    // add x axis
    this.svg.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(this.xscale));

    this.svg.append("text")
        .attr("transform",
            "translate(" + (this.width/2) + " ," + 
                (this.height + this.margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("x");

    // add y axis
    this.svg.append("g")
        .call(d3.axisLeft(this.yscale));
    this.svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - this.margin.left)
        .attr("x",0 - (this.height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("ct"); 

    // --------------------------------

    this.active = this.svg.append("g")

    this.active_line = this.active.append("line")
        .attr("x1",this.xscale(0))
        .attr("y1",this.yscale(0))
        .attr("display","none")
        .style("stroke","black");

    this.hovertext = this.svg.append("text"); 
        // .classed("hovertext",true);

    this.svg.append("line") // light-like line seperating space-like and time-like
        .attr("x1",this.xscale(0))
        .attr("y1",this.yscale(0))
        .attr("x2",this.xscale(xmax))
        .attr("y2",this.yscale(ymax))
        .style("stroke","black")
        .style("stroke-dasharray","3,3");

    this.eventsgroup = this.svg.append("g"); // svg element that will hold all events

    this.t_slider = d3.select(this.div).append("input")
        .attr("type","range")
        .attr("min",-50)
        .attr("max",50)
        .attr("value",0)
        .on("change",function() {
            that.changeTime(parseFloat(d3.select(this).property("value")));
        });
    this.t_slider_txt = d3.select(this.div).append("span")
        .html(" t: "+this.t_slider.property("value"));
    d3.select(this.div).append("button").html(" PLAY ")
        .on("click",function() {
            that.animating = !that.animating;
            that.animate();
        });
    d3.select(this.div).append("button").html(" RESET ")
        .on("click",function() {
            that.animating = false;
            that.changeTime(0);
            that.newtonian?that.setReferenceEvent_Classical(0):that.setReferenceEvent_Relativistic(0);
        });
    d3.select(this.div).append("button").html(" ZERO ")
        .on("click",function() {
            that.animating = false;
            that.changeTime(0);
        });
    // lines displayed when an event is selected
    this.selection_axes = this.svg.append("g").attr("display","none");
    this.selection_axes.append("line") // x-line
        .attr("x1",this.xscale(0))
        .attr("y1",this.yscale(0))
        .attr("x2",this.xscale(this.selection_axes_l))
        .attr("y2",this.yscale(0))
        .style("stroke","black");
    this.selection_axes.append("line") //y-line
        .attr("x1",this.xscale(0))
        .attr("y1",this.yscale(0))
        .attr("x2",this.xscale(0))
        .attr("y2",this.yscale(this.selection_axes_l))
        .style("stroke","black");
};
SpacetimeDiagram.prototype.updateEvents = function(arr,cleardata) {
    // format of arr: array [[x,y,v,fix_t],[x,y,v,fix_t],...]
    // where x,y,v are the coordinates and velocities of the event
    // fix_t true if the event does not travel through time
    // note: if v!=0, physics requires fix_t = false
    // cleardata: should previous events be removed?
    if(cleardata !== true) cleardata = false;
    if(cleardata) this._data = [];

    var that = this;
    var backup = this._data.slice(); // in case invalue args have been use
    for(var i=0; i<arr.length; i++){
        if(arr[i][2]>1 && !this.newtonian){ 
            // * might this be triggered by floating point rounding errors?
            console.log("WARNING: Faster than light particle created. Speed: "
                +arr[i][2] + " Time-stationary: "+arr[i][3]);
        }
        this._data.push({
            xi:arr[i][0], // starting x-position
            yi:arr[i][1], // time to start moving 
            vx:arr[i][2], // x-velocity
            fix_t:arr[i][3], // is this event time-stationary?
            lifetime:arr[i][4], // for how long does the particle travel
            x:arr[i][0],y:arr[i][1], // current position
            alive:false
        });
    }

    // Following D3 general update pattern
    // Data Join
    var events = this.eventsgroup.selectAll("circle").data(this._data);

    // Update any existing data
    events
        .attr("cx",function(d,i){return that.xscale(d.x);})
        .attr("cy",function(d,i){return that.yscale(d.y);})
        .style("stroke-width",function(d) {return d.fix_t ? "1" : "2";})
        .style("fill",function(d) {return d.fix_t ? "red" : d.alive?"steelblue":"grey";});

    // Add new data
    events.enter().append("circle")
        .classed("event_marker",true)
        .attr("cx",function(d,i){return that.xscale(d.x);})
        .attr("cy",function(d,i){return that.yscale(d.y);})
        .attr("r",this.event_marker_r)
        .on("click",function(d,i) {
            that.updateSelection(this,i);
        })
        .style("stroke-width",function(d) {return d.fix_t ? "1" : "2";})
        .style("fill",function(d) {return d.fix_t ? "red" : d.alive?"steelblue":"grey";});
    // Remove any no longer present data
    events.exit().remove();
};
SpacetimeDiagram.prototype.updateSelection = function(e_marker,i) {
    //e_marker: 
    //i: index of new selection
    if(this.eventselected){ // deselect previous
        d3.select(".event_marker_selected")
            .classed("event_marker_selected",false);
        
        if (this.selectedIndex === i) {
            this.eventselected = false;
            this.hovertext.style("opacity",0);
            this.active_line.attr("display","none");
            this.selection_axes.attr("display","none");
            this.newtonian?this.setReferenceEvent_Classical(i):this.setReferenceEvent_Relativistic(i);
            return;
        }
    }
    this.selectedIndex = i;
    this.eventselected = true;
    d3.select(e_marker).classed("event_marker_selected",true);
    this.moveSelectionLines();
};

SpacetimeDiagram.prototype.animate = function() {
    var that = this;
    if(!this.waitframe){
        this.waitframe=true; //prevent overlapping animation calls.
        setTimeout(function(){
            that.waitframe=false;
            if (!that.animating) return;
            if(that.t>49){
                this.animating = false;
                return;
            }
            that.changeTime(that.t+1);
            that.animate();
        },this.framelength);
    }
};
SpacetimeDiagram.prototype.moveSelectionLines = function() {
    // update lines which are following the selected event
    // called by both updateSelection and changeTime
    var  i = this.selectedIndex;
    this.active_line
        .attr("x2",this.xscale(this._data[i].x))
        .attr("y2",this.yscale(this._data[i].y))
        .attr("display","inline");

    this.hovertext.style("opacity",1)
        .attr("x",this.xscale(this._data[i].x)+10)
        .attr("y",this.yscale(this._data[i].y)+30)
        .html(["(",this._data[i].x.toFixed(2),","
            ,this._data[i].y.toFixed(2),","
            ,(this._data[i].y*this._data[i].y
                -this._data[i].x*this._data[i].x).toFixed(2),")"
            ].join(""));

    this.selection_axes.attr("display","inline")
        .attr("transform",  
        "translate("+(this.xscale(this._data[i].x)-this.xscale(0))+
            ","+(this.yscale(this._data[i].y)-this.yscale(0))+")");
};
SpacetimeDiagram.prototype.changeTime = function(t) {
    this.t = t;
    this.t_slider_txt.html(" t: "+t);
    this.t_slider.property("value",t);

    for (var i=0; i<this._data.length; i++){
        if(this._data[i].fix_t) continue;

        this._data[i].y = t;

        if(t < this._data[i].yi) {
            // particle remains at rest until born
            // this._data[i].x = this._data[i].xi;
            this._data[i].alive = false;
        }
        else if (t>this._data[i].yi+this._data[i].lifetime){
            // particle remains at position of death
            // this._data[i].x = this._data[i].xi+this._data[i].vx*this._data[i].lifetime;
            this._data[i].alive = false;
        }
        else{
            this._data[i].alive = true;
        }
            this._data[i].x = this._data[i].xi+this._data[i].vx*(t-this._data[i].yi);
    }
    this.updateEvents([],false);
    if(this.eventselected)this.moveSelectionLines();
};
SpacetimeDiagram.prototype.setReferenceEvent_Classical = function(event_index) {
    // change event from which event are we viewing from.
    // via Galilean transformations
    this.newtonian = true;
    var data = [];
    var ref = this._data[event_index];
    var t = this.t;
    this.changeTime(0);
    for (var i=0; i<this._data.length; i++){
            data.push([
                this._data[i].x-ref.vx*this._data[i].y, // linear translation
                this._data[i].y,
                this._data[i].fix_t?0:this._data[i].vx-ref.vx, // u'= u - v
                this._data[i].fix_t, // continue (not) moving with time
            ]);
    }
    this.updateEvents(data,true);
    this.changeTime(t);
};
SpacetimeDiagram.prototype.setReferenceEvent_Relativistic = function(event_index) {
    // change event from which event are we viewing from.
    // via Lorentz transformations

    // throw("Not yet implemented");
    console.log("relativistic frame");
    this.newtonian = false;
    var data = [];
    var ref = Object.assign({},this._data[event_index]);
    var t = this.t;
    this.changeTime(ref.yi); // 

    var g = 1/Math.sqrt(1-ref.vx*ref.vx); // gamma value for the current particle

    // ref.xi+=this.oldoff; // *for translation to x=0
    // var xoff = g*(ref.xi-ref.vx*ref.yi); // *for translation to x=0
    for (var i=0; i<this._data.length; i++){
        var p={};
        var d=this._data[i];
        d.lt = d.lifetime;

        // d.xi+=this.oldoff;
        
        p.xi=g*(d.xi-ref.vx*d.yi);
        p.yi=g*(d.yi-ref.vx*d.xi);
        p.vx=(d.vx-ref.vx)/(1-(d.vx*ref.vx)), // u'=(u-v)/(1-uv)
        p.lt = g*d.lt*(1-(d.vx*ref.vx))

        // p.xi-=xoff; // *for translation to x=0
        data.push([p.xi,p.yi,p.vx,d.fix_t,p.lt]);
    }
    // this.oldoff = xoff; // *for translation to x=0

    this.updateEvents(data,true);
    this.changeTime(0);

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
var st = new SpacetimeDiagram("#testgrounds",50,50,width,width);
var spd = 0.25;
var lt = 20;
var xi = 0;
var ot = 0;
st.updateEvents([
    [0,0,0,false,10000], // particle at rest in lab frame
    [0,0,0,true,0], // particle at rest in
    [xi,ot,spd,false,lt], // created particle
    [xi,ot,0,true,0], // birth
    [xi+spd*lt,ot+lt,0,true,0], //birth
    [xi+spd*lt,ot+lt,2*spd,false,lt], // created particle
    [xi+3*spd*lt,ot+2*lt,0,true,0], // death
    [xi+spd*lt,ot+lt,0,true,0]],false); // death
st.changeTime(0);

})();