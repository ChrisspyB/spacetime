"use strict"
var SpacetimeDiagram = function(div,xmin,xmax,ymin,ymax,w,h,newtonian) {
    // SVG diagram displaying ct against x
    // div is the html element id (#string) to which the svg is appended
    // xmax(ymax): max value for x(y) domain.
    // There should never be more than one SpacetimeDiagram per div!

    if(typeof newtonian === "undefined") newtonian = false;
    if(xmin>0 || xmax<0 || ymin>0 || ymax<0){
        throw("Currently, rotations cannot be displayed without a 0,0 origin")
    }
    var that = this;
    this.div = div;
    this.tstep = 1;
    this.xmin = xmin;
    this.xmax = xmax;
    this.ymin = ymin;
    this.ymax = ymax;
    this.pointevents = []; // list of point events to be plotted (as circles)
    this.eventselected = false; // is an event currently selected?
    this.selectedIndex = 0;
    this.newtonian = newtonian; // is this diagram displaying newtonian physics?
    this.event_marker_r = 10; // radius of circle representing point events
    this.selection_axes_l = 5; // length (before scaling) of axes drawn on selection
    this._data = [];
    this._data_particle = [];
    this.lab_vel = 0;
    this.prime_vel = 0;
    this.t = 0; // current time (simulation run-time)
    this.animating = false;
    this.waitframe = false; // for preventing overlapping animation calls.
    this.framelength = 100;
    // conventional d3 margin setup
    this.margin = {top: 20, right: 20, bottom: 50, left: 50};
    this.width = w - this.margin.left - this.margin.right;
    this.height = h - this.margin.top - this.margin.bottom;
    this.angle_scale = (this.ymax-this.ymin)/((this.xmax-this.xmin))
        *this.width/this.height; // for dealing with rotations.
    // 
    this.particlecount = 0;
    this.colors = ["red","orange","green","blue","cyan"];
    // 
    this._mode = "normal" // "normal", "addingBirth","addingDeath"
    // add svg object and translate group to top left margin
    this.svg = d3.select(div).append("svg")
        .classed("spacetime",true)
        .attr("width",w)
        .attr("height",h)
    .append("g")
        .attr("transform",
        "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.statusbar = d3.select(div).append("div")
        .classed("statusbar",true)
        .html("Statusbar default text");

    d3.select(div).append("div")
        .classed("buttons",true);
    
    // ---------- Set up axes ----------
    
    // scaling functions
    this.yscale = d3.scaleLinear()
        .domain([ymin,ymax])
        .range([this.height,0]);

    this.xscale = d3.scaleLinear()
        .domain([xmin,xmax])
        .range([0,this.width]);

    // add x axis
    this.svg.append("g")
        .attr("transform", "translate(0," + this.yscale(0) + ")")
        .call(d3.axisBottom(this.xscale));

    this.svg.append("text")
        .attr("transform",
            "translate(" + (this.width/2) + " ," + 
                (this.height + this.margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("x");

    // add y axis
    this.svg.append("g")
        .call(d3.axisLeft(this.yscale))
        .attr("transform","translate("+this.xscale(0)+",0)");
    this.svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - this.margin.left)
        .attr("x",0 - (this.height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("ct");

    // add x' axis
    this.axis_xprime=this.svg.append("g")
        .call(d3.axisBottom(this.xscale));

    // add y' axis
    this.axis_yprime=this.svg.append("g")
        .call(d3.axisLeft(this.yscale));
    // ---------------------------------

    this.active = this.svg.append("g")

    this.active_line = this.active.append("line")
        .attr("x1",this.xscale(0))
        .attr("y1",this.yscale(0))
        .attr("display","none")
        .style("stroke","black");

    this.hovertext = this.svg.append("text");

    this.svg.append("line") // light-like line seperating space-like and time-like
        .attr("x1",this.xscale(ymin))
        .attr("y1",this.yscale(ymin))
        .attr("x2",this.xscale(ymax))
        .attr("y2",this.yscale(ymax))
        .style("stroke","black")
        .style("stroke-dasharray","3,3");
    this.svg.append("line") // light-like line seperating space-like and time-like
        .attr("x1",this.xscale(-ymin))
        .attr("y1",this.yscale(ymin))
        .attr("x2",this.xscale(-ymax))
        .attr("y2",this.yscale(ymax))
        .style("stroke","black")
        .style("stroke-dasharray","3,3");

    this.eventsgroup = this.svg.append("g"); // svg element that will hold all events

    this.tempcone1 = this.svg.append("line")
        .style("stroke","black");
    this.tempcone2 = this.svg.append("line")
        .style("stroke","black");
    this.tempBirth = this.svg.append("circle")
        .classed("event temp",true)
        .style("fill","none")
        .style("stroke","red")
        .style("display","none")
        .attr("r",this.event_marker_r);
    this.tempDeath = this.svg.append("circle")
        .classed("event temp",true)
        .style("fill","none")
        .style("stroke","blue")
        .style("display","none")
        .attr("r",this.event_marker_r);

    this.construct_x = this.svg.append("line")
        .style("stroke","red")
        .style("stroke-dasharray","2,2");
    this.construct_t = this.svg.append("line")
        .style("stroke","blue")
        .style("stroke-dasharray","2,2");

    // Sliders and buttons

    d3.select(this.div+" .buttons").append("span")
        .html("S Frame Properties: ");
    this.t_slider = d3.select(this.div+" .buttons").append("input")
        .attr("type","range")
        .attr("min",ymin)
        .attr("max",ymax)
        .attr("value",0)
        .on("change",function() {
            that.changeTime(parseFloat(d3.select(this).property("value")));
        });
    this.t_slider_txt = d3.select(this.div+" .buttons").append("span")
        .html(" t: "+parseFloat(this.t_slider.property("value")).toFixed(2));

    d3.select(this.div+" .buttons").append("br")
    d3.select(this.div+" .buttons").append("span")
            .html("S' Frame Properties: ");
    this.prime_slide = d3.select(this.div+" .buttons").append("input")
        .attr("type","range")
        .attr("min",-1)
        .attr("max",1)
        .attr("value",this.prime_vel)
        .attr("step",0.01)
    .on("change",function() {
            that.updatePrimeAxes(parseFloat(d3.select(this).property("value")));
            // that.setLabVel(parseFloat(d3.select(this).property("value")));
        });
    this.prime_slide_txt = d3.select(this.div+" .buttons").append("span");

    d3.select(this.div+" .buttons").append("br");
    d3.select(this.div+" .buttons").append("button").html(" TRANSFORM ")
        .on("click",function() {
            // transform to the prime axes
            that.transformFrame(that.prime_vel);
        });
    d3.select(this.div+" .buttons").append("button").html(" PLAY ")
        .on("click",function() {
            that.animating = !that.animating;
            that.animate();
        });
    d3.select(this.div+" .buttons").append("button").html(" t = 0 ")
        .on("click",function() {
            that.animating = false;
            that.changeTime(0);
        });
    d3.select(this.div+" .buttons").append("button").html(" LAB FRAME ")
        .on("click",function() {
            that.setLabVel(0);
        });
    d3.select(this.div+" .buttons").append("button").html(" ADD PARTICLE ")
        .on("click",function() {
            that.setMode("addingBirth");
        });
    d3.select(this.div+" .buttons").append("button").html(" CLEAR ALL ")
        .on("click",function() {
            alert("not yet implemented");
        });
    d3.select(this.div+" .buttons").append("br");
    this.checkbox_con = d3.select(this.div+" .buttons").append("input")
        .attr("type","checkbox")
        .property("checked",true);
    d3.select(this.div+" .buttons").append("span").html("Show Construction Lines");

    this.checkbox_world = d3.select(this.div+" .buttons").append("input")
        .attr("type","checkbox")
        .property("checked",true);
    d3.select(this.div+" .buttons").append("span").html("Show worldlines");

    this.updatePrimeAxes(0);
};
SpacetimeDiagram.prototype.updatePrimeAxes = function(v) {
    // Handles of rotation of prime axes, relative velocity of new frame
    // If the t and x axes have the same scale (as==1) this will 
    // rotate the prime axes by arctan(v)

    var ary = Math.atan(v*this.angle_scale); // angle (rad) to rotate y-axis
    var arx = Math.atan(v/this.angle_scale); // angle (rad) to rotate x-axis
    var yp = Math.abs(this.yscale(this.ymax)-this.yscale(0)); // length of postive y-axis
    var xm = Math.abs(this.xscale(0)-this.xscale(this.xmin)); // length of negative x-axis

    // Rotations are not about (0,0) so translations are also required
    this.axis_xprime.attr("transform",["translate(",
        xm*(1-Math.cos(arx)), // x translation
        ",",this.yscale(0)+xm*Math.sin(arx), // y translation
        ") rotate(",-arx*180/Math.PI, // rotate (deg) 
        ")"].join(""));
    this.axis_yprime.attr("transform",["translate(",
            this.xscale(0)+yp*Math.sin(ary), // x translation
            ",",yp*(1-Math.cos(ary)), // y translation
            ") rotate(",ary*180/Math.PI, // rotate (deg)
            ")"].join(""));

    // Ensure the slider is up to date
    this.prime_vel = v;
    this.prime_slide.property("value",v);
    this.prime_slide_txt
        .html("Prime velocity: "+v.toFixed(2)+"c");
    this.updateConstructionLines();
};
SpacetimeDiagram.prototype.setMode = function(newmode) {
    var that = this;
    var click;
    var move;
    if(newmode==="normal"){
        this.tempBirth.style("display","none");
        this.tempDeath.style("display","none");
        this.tempcone1.style("display","none");
        this.tempcone2.style("display","none");
        click = function() {};
        move = function() {};
    }
    else if (newmode==="addingBirth"){
        this.tempDeath.style("display","none");
        this.tempcone1.style("display","inline");
        this.tempcone2.style("display","inline");
        this.tempBirth.style("display","inline");
        click = function() {
            that.setMode("addingDeath");
        };
        move = function() {
            var x = (d3.event.offsetX-that.margin.left)
            var y = (d3.event.offsetY-that.margin.top)
            that.tempBirth
                .attr("cx",x)
                .attr("cy",y);
            that.tempcone1
                .attr("x1",x+10)
                .attr("y1",y-10)
                .attr("x2",x+200)
                .attr("y2",y-200);
            that.tempcone2
                .attr("x1",x-10)
                .attr("y1",y-10)
                .attr("x2",x-200)
                .attr("y2",y-200);
            };

    }
    else if (newmode==="addingDeath"){
        this.tempDeath.style("display","inline");
        click = function() {
            that.user_AddParticle_Clicks(
                that.xscale.invert(that.tempBirth.attr("cx")),
                that.yscale.invert(that.tempBirth.attr("cy")),
                that.xscale.invert(that.tempDeath.attr("cx")),
                that.yscale.invert(that.tempDeath.attr("cy")));
            that.setMode("normal");
        };
        move = function() {
            var x = (d3.event.offsetX-that.margin.left)
            var y = (d3.event.offsetY-that.margin.top)
            that.tempDeath
                .attr("cx",x)
                .attr("cy",y);
        };
    }
    else{
        throw("unrecognised mode!");
    }
    d3.select(this.div).select("svg").on("click",click);
    d3.select(this.div).select("svg").on("mousemove",move);
    this._mode = newmode;
};
SpacetimeDiagram.prototype._updateEvents = function(arr,cleardata) {
    // ...
    // cleardata: are we overwriting any data?
    if(cleardata !== true) cleardata = false;
    if(cleardata) {
        this._data = [];
        this._data_particle = [];
    }

    var that = this;
    var backup = this._data.slice(); // in case invalid args have been use
    for(var i=0; i<arr.length; i++){
        if(arr[i][2]>1 && !this.newtonian){
            // * might this be triggered by floating point errors?
            console.log("WARNING: FTL particle created. Speed: "+arr[i][2]);
        }
        var d = {
            xi:arr[i][0], // starting x-position
            yi:arr[i][1], // time to start moving 
            vx:arr[i][2], // x-velocity
            lt:arr[i][3], // for how long does the particle travel
            x:arr[i][0],y:arr[i][1], // current position
            alive:true, 
            type:arr[i][4], // particle,birth,death,misc,light
            color:arr[i][5],
            desc:arr[i][6],
            omni:arr[i][7]
        }
        this._data.push(d);
        if(arr[i][4]==="particle" ||arr[i][4]==="light"){
            this._data_particle.push(d);
        }
    }

    // Following D3 general update pattern
    // Data Join
    var events = this.eventsgroup.selectAll("circle").data(this._data);
    var worldlines = this.eventsgroup.selectAll("line").data(this._data_particle);
    // Update any existing data
    events
        .attr("cx",function(d,i){return that.xscale(d.x);})
        .attr("cy",function(d,i){return that.yscale(d.y);})
        .style("stroke-width",2)
        .style("stroke-dasharray",function(d){
            if (d.type==="birth" || d.type==="death") return "2,2";
            return;
        })
        .style("stroke",function(d) {
            if (d.type==="birth" || d.type==="death") return d.color;
            if (d.type==="particle" || d.type==="light") return "none";
            return "black";
        })
        .style("fill",function(d) {
            if (d.type==="particle" || d.type==="light") {
                return d.color;
            }
            if (d.type==="birth" || d.type==="death"){
                return "white";
            }
            return "purple";
        })
        .style("fill-opacity",function(d) {
             if (d.type==="particle" || d.type==="light") {
                return d.alive ? 1 : 0;
            }
            if (d.type==="birth" || d.type==="death"){
                return 0;
            }
        })
    // Add new data
    events.enter().append("circle")
        .attr("class",function(d) {return "event "+d.type;})
        .attr("r",this.event_marker_r)
        .on("click",function(d,i) {
            that.updateSelection(this,i);
        })
        .attr("cx",function(d){return that.xscale(d.x);})
        .attr("cy",function(d){return that.yscale(d.y);})
    worldlines.enter().append("line")
        .style("stroke",function(d) {return d.color})
        .style("opacity",0.5);
    worldlines
        .attr("x1",function(d) {
            return d.omni?that.xscale(d.xi-d.vx*d.yi):that.xscale(d.xi);
        })
        .attr("y1",function(d) {
            return d.omni?that.yscale(that.ymin):that.yscale(d.yi);
        })
        .attr("x2",function(d) {
            return that.xscale(d.xi+(d.lt>(that.ymax-d.yi)?(that.ymax-d.yi):d.lt)*d.vx);
        })
        .attr("y2",function(d) {
            return d.omni?that.yscale(that.ymax):
            that.yscale(d.yi+(d.lt>(that.ymax-d.yi)?(that.ymax-d.yi):d.lt));
        })
        .style("display",this.checkbox_world.property("checked")?"inline":"none");
    // Remove any no longer present data
    events.exit().remove();
};
SpacetimeDiagram.prototype.updateSelection = function(element,i) {
    // element: svg element representing the event
    // i: index of new selection
    if(this._mode!=="normal") return;
    if(this.eventselected){ // deselect previous
        d3.select(".selected")
            .classed("selected",false);
        
        if (this.selectedIndex === i) {
            // If clicked twice
            this.eventselected = false;
            this.hovertext.style("opacity",0);
            this.active_line.attr("display","none");
            this.updatePrimeAxes(this._data[i].vx);
            return;
        }
    }
    this.selectedIndex = i;
    this.eventselected = true;
    d3.select(element).classed("selected",true);
    this.updateSelectionInfo();
    this.updateConstructionLines();
};
SpacetimeDiagram.prototype.updateConstructionLines = function() {
    // if enabled...
    if(!this.checkbox_con.property("checked") || Math.abs(this.prime_vel)>=1){
        this.construct_t.attr("display","none");
        this.construct_x.attr("display","none");
        return;
    } 
    if(!this.eventselected) return;
    //(this.ymax-this.ymin)/((this.xmax-this.xmin))
    var e = this._data[this.selectedIndex];
    var ary = -Math.atan(this.prime_vel*(1)); // angle (rad) of y-axis rotation
    var arx = -Math.atan(this.prime_vel/(1)); // angle (rad) of x-axis rotation

    var g = 1/Math.sqrt(1-this.prime_vel*this.prime_vel); // lorentz factor
    var x = g*(e.x-this.prime_vel*e.y); // x' = g(x-vt)
    var y = g*(e.y-this.prime_vel*e.x); // t' = g(t-vx)

    this.construct_t
        .attr("x1",this.xscale(e.x))
        .attr("y1",this.yscale(e.y))
        .attr("x2",this.xscale(-y*Math.sin(ary)))
        .attr("y2",this.yscale(y*Math.cos(ary)))
        .attr("display","inline");
    this.construct_x
        .attr("x1",this.xscale(e.x))
        .attr("y1",this.yscale(e.y))
        .attr("x2",this.xscale(x*Math.cos(arx)))
        .attr("y2",this.yscale(-x*Math.sin(arx)))
        .attr("display","inline");
};
SpacetimeDiagram.prototype.user_AddParticle_Clicks = function(xb,tb,xd,td) {

    this.addParticle(xb,tb,(xd-xb)/(td-tb),false,td-tb);
};
SpacetimeDiagram.prototype.addParticle = function(xb,tb,u,omni,lt,desc,color) {
    // add a particle that will be born at xb,tb.
    // and travel in x with velocity u with a lifetime lt.
    // birth and death events will also be added.
    // if lt is set to Infinity, no death event will be added.
    // if omni == false, no birth or death event will be added.
    if (typeof lt === "undefined" || omni === true) lt = Infinity;
    if (lt<0) {console.log("cannot create particle with negative lifetime!"); return;}
    if (u>1 || u<-1) {console.log("cannot create faster than light particle!"); return;}
    if (typeof desc !== "string") desc="";

    var ptype;

    if (u===1 || u===-1) ptype = "light"; 
    else ptype = "particle"; 
    
    if (typeof color === "undefined"){
        if (ptype === "particle"){
            var c = this.particlecount;
            while(c>=this.colors.length)c-=this.colors.length;
            color = this.colors[c]
            this.particlecount++;
        }else{
            color = "#ffcc00";
        }
    }
    
    var new_events = [];

    if(!omni){
        new_events.push([ // Particle birth
            xb,tb,0,0,"birth",color,"",true
        ]);
    }
    if(lt!==Infinity){
        new_events.push([ // Particle death
            xb+u*lt,tb+lt,0,0,"death",color,"",true
        ]);
    }
    new_events.push([ // Particle
        xb,tb,u,lt,ptype,color,desc,omni
    ]);
    this._updateEvents(new_events,false);
};
SpacetimeDiagram.prototype.addEvent = function(x,t,desc,color) {
    if(typeof desc !== "string") desc = "";
    if(typeof color !== "string") color = "purple";
    this._updateEvents([[x,t,0,0,desc,color,desc]]
        ,false);
};
SpacetimeDiagram.prototype.animate = function() {
    var that = this;
    if(!this.waitframe){
        this.waitframe=true; // prevent overlapping animation calls.
        setTimeout(function(){
            that.waitframe=false;
            if (!that.animating) return;
            if(that.t>that.ymax-1){
                this.animating = false;
                return;
            }
            that.changeTime(that.t+that.tstep);
            that.animate();
        },this.framelength);
    }
};
SpacetimeDiagram.prototype.updateSelectionInfo = function() {
    // update lines which are following the selected event
    // called by both updateSelection and changeTime
    var  i = this.selectedIndex;
    if(this._data[i].alive === false){ // deselect the dead
        this.eventselected = false;
        this.hovertext.style("opacity",0);
        this.active_line.attr("display","none");
        return;
    }
    this.active_line
        .attr("x2",this.xscale(this._data[i].x))
        .attr("y2",this.yscale(this._data[i].y))
        .attr("display","inline");

    this.hovertext.style("opacity",1)
        .attr("x",this.xscale(this._data[i].x)+10)
        .attr("y",this.yscale(this._data[i].y)+30)
        .html([
            this._data[i].desc,
            " (",this._data[i].x.toFixed(2),
            ",",
            this._data[i].y.toFixed(2),
            ") s: ",
            (this._data[i].y*this._data[i].y
                -this._data[i].x*this._data[i].x).toFixed(2)
            ].join(""));
    this.updateConstructionLines();
};
SpacetimeDiagram.prototype.changeTime = function(t) {
    this.t = t;
    this.t_slider_txt.html(" t: "+t.toFixed(2));
    this.t_slider.property("value",t);

    for (var i=0; i<this._data.length; i++){
        if(!(this._data[i].type==="particle" || this._data[i].type==="light")) continue;
        var d = this._data[i];
        d.y = t;

        if(!d.omni){
            if(t < d.yi) {
                // particle remains at rest until born
                d.alive = false;
            }
            else if (t>d.yi+d.lt){
                // particle remains at position of death
                d.alive = false;
            }
            else{
                d.alive = true;
            }
        }
        d.x = d.xi+d.vx*(t-d.yi);
    }
    this._updateEvents([],false);
    if(this.eventselected)this.updateSelectionInfo();
};
SpacetimeDiagram.prototype.setLabVel = function(a) {
    // transfrom to a frame where lab frame travels at velocity a.
    if (this.newtonian) {
        alert("untested for newtonian frames...");
        // v = u - u' with u' = a
        this.transformFrame(this.lab_vel-a);
    }else{
        // v = (u-u')/(1-uu') with u' = a
        this.transformFrame((this.lab_vel-a)/(1-this.lab_vel*a));
    }
};
SpacetimeDiagram.prototype.transformFrame = function(v) {
    // Transforms events to a new frame using Lorentz transforms
    // v is the velocity of the new frame, relative to the *current* one.
    var data = [];
    if(this.newtonian){
        for (var i=0; i<this._data.length; i++){
            var d=this._data[i];
            data.push([
                d.xi-v*d.yi, // x' = x-vt
                d.yi, // t' = t
                (d.type==="particle"||d.type==="light")?d.vx-v:0, // u' = u-v or 0 for static events
                d.lt,d.type,d.color,d.desc,d.omni]);
        }
        this.lab_vel = this.lab_vel + v;
    }
    else{
        if(v>=1 || v<=-1){console.log("cannot move to FTL frame...");return;}
        var g = 1/Math.sqrt(1-v*v); // lorentz factor
        for (var i=0; i<this._data.length; i++){
            var d=this._data[i];
            data.push([
                g*(d.xi-v*d.yi), // x' = g(x-vt)
                g*(d.yi-v*d.xi), // t' = g(t-vx)
                (d.type==="particle"||d.type==="light")?(d.vx-v)/(1-d.vx*v):0, // u' = (u-v)/(1-uv) or 0 for static events
                g*d.lt*(1-(d.vx*v)), // t_death' - t_birth'
                d.type,d.color,d.desc,d.omni]);
        }
        this.lab_vel = (this.lab_vel-v)/(1-this.lab_vel*v);
    }
    this._updateEvents(data,true);
    this.changeTime(0);
    this.updatePrimeAxes(0); // reset prime axes
};
SpacetimeDiagram.prototype.setParticleFrame = function(event_index) {
    // update the frame velocity such that the given particle is at rest.
    if (this._data[event_index].type!=="particle") return;
    this.transformFrame(this._data[event_index].vx);
};