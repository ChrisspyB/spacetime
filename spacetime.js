// (function() {
"use strict"

var width = 840; // width of containing div

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
    this.margin = {top: 20, right: 20, bottom: 50, left: 70},
    this.width = w - this.margin.left - this.margin.right,
    this.height = h - this.margin.top - this.margin.bottom;
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
    d3.select(this.div).append("button").html(" ZERO ")
        .on("click",function() {
            that.animating = false;
            that.changeTime(0);
        });
    d3.select(this.div).append("button").html(" ADD PARTICLE ")
        .on("click",function() {
            console.log("click to choose particle's birth");
            that.setMode("addingBirth");
        })

    d3.select(this.div).append("button").html(" CLEAR ALL ")
        .on("click",function() {
            alert("not yet implemented")
        })

    this.tempcone1 = this.svg.append("line")
        .style("stroke","black");
    this.tempcone2 = this.svg.append("line")
        .style("stroke","black");
    this.tempBirth = this.svg.append("circle")
        .classed("temp-marker",true)
        .style("fill","none")
        .style("stroke","red")
        .style("display","none")
        .attr("r",this.event_marker_r);

    this.tempDeath = this.svg.append("circle")
        .classed("temp-marker",true)
        .style("fill","none")
        .style("stroke","blue")
        .style("display","none")
        .attr("r",this.event_marker_r);

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
    // cleardata: should previous events be removed?
    if(cleardata !== true) cleardata = false;
    if(cleardata) this._data = [];

    var that = this;
    var backup = this._data.slice(); // in case invalid args have been use
    for(var i=0; i<arr.length; i++){
        if(arr[i][2]>1 && !this.newtonian){ 
            // * might this be triggered by floating point errors?
            console.log("WARNING: Faster than light particle created. Speed: "
                +arr[i][2] + " Time-stationary: "+arr[i][3]);
        }
        this._data.push({
            xi:arr[i][0], // starting x-position
            yi:arr[i][1], // time to start moving 
            vx:arr[i][2], // x-velocity
            lt:arr[i][3], // for how long does the particle travel
            x:arr[i][0],y:arr[i][1], // current position
            alive:true, 
            type:arr[i][4], // particle,birth,death,misc,
            color:arr[i][5]
        });
    }

    // Following D3 general update pattern
    // Data Join
    var events = this.eventsgroup.selectAll("circle").data(this._data);

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
        .classed("event_marker",true)
        .attr("r",this.event_marker_r)
        .on("click",function(d,i) {
            that.updateSelection(this,i);
        })
        .attr("cx",function(d,i){return that.xscale(d.x);})
        .attr("cy",function(d,i){return that.yscale(d.y);})

    // Remove any no longer present data
    events.exit().remove();
};
SpacetimeDiagram.prototype.updateSelection = function(e_marker,i) {
    //e_marker: 
    //i: index of new selection
    if(this._mode!=="normal") return;
    if(this.eventselected){ // deselect previous
        d3.select(".event_marker_selected")
            .classed("event_marker_selected",false);
        
        if (this.selectedIndex === i) {
            this.eventselected = false;
            this.hovertext.style("opacity",0);
            this.active_line.attr("display","none");
            this.selection_axes.attr("display","none");
            this.setReferenceEvent(i,this.newtonian);
            return;
        }
    }
    this.selectedIndex = i;
    this.eventselected = true;
    d3.select(e_marker).classed("event_marker_selected",true);
    this.moveSelectionLines();
};
SpacetimeDiagram.prototype.user_AddParticle_Clicks = function(xb,tb,xd,td) {
    this.addParticle(xb,tb,(xd-xb)/(td-tb),td-tb);
};
SpacetimeDiagram.prototype.addParticle = function(xb,tb,u,lt) {
    // add a particle that will be born at xb,tb.
    // and travel through x with velocity u with a lifetime lt.
    // birth and death events will also be added to the event list.
    // if lt is set to Infinity, no death event will be added.
    if (typeof lt === "undefined") lt = Infinity;
    if (lt<0) {console.log("particle with negative lifetime!"); return;}
    
    var ptype;
    if (u>1 || u<-1) {console.log("faster than light particle!"); return;}
    else if (u===1 || u===-1) ptype = "light"; 
    else ptype = "particle"; 
    
    if (ptype === "particle"){
        var c = this.particlecount;
        while(c>=this.colors.length)c-=this.colors.length;
        var color = this.colors[c]
        this.particlecount++;
    }else{
        var color = "yellow";
    }
    
    var new_events = [];
    new_events.push([ // Particle
        xb,tb,u,lt,ptype,color
    ]);
    new_events.push([ // Particle birth
        xb,tb,0,0,"birth",color
    ]);
    if(lt!==Infinity){
        new_events.push([ // Particle death
            xb+u*lt,tb+lt,0,0,"death",color
        ]);
    }
    this._updateEvents(new_events,false);
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
        if(!(this._data[i].type==="particle" || this._data[i].type==="light")) continue;

        this._data[i].y = t;

        if(t < this._data[i].yi) {
            // particle remains at rest until born
            this._data[i].alive = false;
        }
        else if (t>this._data[i].yi+this._data[i].lt){
            // particle remains at position of death
            this._data[i].alive = false;
        }
        else{
            this._data[i].alive = true;
        }
            this._data[i].x = this._data[i].xi+this._data[i].vx*(t-this._data[i].yi);
    }
    this._updateEvents([],false);
    if(this.eventselected)this.moveSelectionLines();
};
SpacetimeDiagram.prototype.setReferenceEvent = function(event_index,newtonian) {
    // change event from which event are we viewing from.
    // via Lorentz transformations
    this.newtonian = newtonian;
    var data = [];
    var ref = Object.assign({},this._data[event_index]);
    if (ref.type!=="particle") return;
    if(newtonian){
        console.log("new newtonian frame");
        for (var i=0; i<this._data.length; i++){
            var p={};
            var d=this._data[i];
            p.xi=d.xi-ref.vx*d.yi; // x'=(x-vt)
            p.yi=d.yi; // t'=t
            p.vx=d.vx-ref.vx; // u'=u-v
            p.lt = d.lt;
            data.push([p.xi,p.yi,p.vx,p.lt,d.type,d.color]);
        }
    }
    else{
        console.log("new relativistic frame");
        var g = 1/Math.sqrt(1-ref.vx*ref.vx); // gamma value for the current particle
        for (var i=0; i<this._data.length; i++){
            var p={};
            var d=this._data[i];
            p.xi=g*(d.xi-ref.vx*d.yi); // x'=g(x-vt)
            p.yi=g*(d.yi-ref.vx*d.xi); // t'=g(t-vx)
            p.vx=(d.vx-ref.vx)/(1-(d.vx*ref.vx)), // u'=(u-v)/(1-uv)
            p.lt = g*d.lt*(1-(d.vx*ref.vx))

            data.push([p.xi,p.yi,p.vx,p.lt,d.type,d.color]);
        }
    }
    this._updateEvents(data,true);
    this.changeTime(0);
};

// })();