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

    this.div = div+" .st_diag"
    d3.select(div).append("div")
        .classed("st_diag",true)
        .style("position","relative")
        .style("width",w+"px"); 

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
    this.draw_worldlines = true;
    this.draw_constructionlines = true;
    this.ui_addP;
    this.ui_addE;
    // conventional d3 margin setup
    this.margin = {top: 20, right: 20, bottom: 50, left: 50};
    this.ctrl = {h:h/10,w:w,oy:h-h/10};
    this.width = w - this.margin.left - this.margin.right;
    this.height = h - this.margin.top - this.margin.bottom - this.ctrl.h;
    this.angle_scale = (this.ymax-this.ymin)/((this.xmax-this.xmin))
        *this.width/this.height; // for dealing with rotations.
    this.particlecount = 0;
    this.colors = ["red","orange","green","blue","cyan"];
    // 
    this._mode = "normal" // "normal", "addingBirth","addingDeath"
    // add svg object and translate group to top left margin
    this.svg = d3.select(this.div).append("svg")
        .classed("spacetime",true)
        .attr("width",w)
        .attr("height",h)
    .append("g")
        .attr("transform",
        "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.ctrldiv = d3.select(this.div).append("div").classed("st_controls",true)
        .style("position","relative")
        .style('border-style','solid')
        .style('border-width','5px')
        .style('border-radius','10px');
    
    // ---------- Set up axes ----------

    // scaling functions
    this.yscale = d3.scaleLinear()
        .domain([ymin,ymax])
        .range([this.height,0]);

    this.xscale = d3.scaleLinear()
        .domain([xmin,xmax])
        .range([0,this.width]);

    // set up gridlines (draw first so that they are behind everything)
    this.gridline_g = this.svg.append("g");

    for(var x=this.xmin; x<=this.xmax; x++){
        this.gridline_g.append("line")
            .attr("x1",this.xscale(x))
            .attr("y1",this.yscale(this.ymin))
            .attr("x2",this.xscale(x))
            .attr("y2",this.yscale(this.ymax))
            .style("stroke","blue")
            .style("opacity",0.2)
            .style("stroke-width","1px");
    }
    for(var y=this.ymin; y<=this.ymax; y++){
        this.gridline_g.append("line")
            .attr("x1",this.xscale(this.xmin))
            .attr("y1",this.yscale(y))
            .attr("x2",this.xscale(this.xmax))
            .attr("y2",this.yscale(y))
            .style("stroke","blue")
            .style("opacity",0.2)
            .style("stroke-width","1px");
    }

    // add x axis
    this.svg.append("g")
        .attr("transform", "translate(0," + this.yscale(0) + ")")
        .call(d3.axisBottom(this.xscale))

    this.svg.append("text")
        .attr("transform",
            "translate(" + (this.width/2) + " ," + 
                (this.height + this.margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("x");

    // add y axis
    this.svg.append("g")
        .call(d3.axisLeft(this.yscale)
            .ticks(this.ymin,this.ymax,3))
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

    this.lightline_g = this.svg.append("g");
    this.lightline_g.append("line") // light-like line seperating space-like and time-like
        .attr("x1",this.xscale(ymin))
        .attr("y1",this.yscale(ymin))
        .attr("x2",this.xscale(ymax))
        .attr("y2",this.yscale(ymax))
        .style("stroke","black")
        .style("stroke-dasharray","3,3");
    this.lightline_g.append("line") // light-like line seperating space-like and time-like
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

    this.construct_g = this.svg.append("g");

    this.construct_x = this.construct_g.append("line")
        .style("stroke","red")
        .style("stroke-dasharray","2,2");
    this.construct_t = this.construct_g.append("line")
        .style("stroke","blue")
        .style("stroke-dasharray","2,2");

    this.construct_x_mark = this.construct_g.append("circle")
        .style("fill","red")
        .style("r",3);
    this.construct_t_mark = this.construct_g.append("circle")
        .style("fill","blue")
        .style("r",3);

    this.play_sld;
    
    this.buildPlayUI();
    this.buildMenus();
    this.buildControls();

    this.updatePrimeAxes(0);
};
SpacetimeDiagram.prototype.buildControls = function(first_argument) {
    
    var that = this;
    var row;
    var td;
    var table=this.ctrldiv.append("table")
        .style("width","100%")
        .style("font-size","20px")

    row = table.append("tr");
    row.append("th").attr("colspan",3).html("Controls")
        .style("border-bottom","1pt solid black");
    
    row = table.append("tr"); // Checkbox row
    td = row.append("td");
    td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            if (d3.select(this).property("checked")){
                that.draw_worldlines = true;
            }else{
                that.draw_worldlines = false;
            }
        }); 
    td.append("span").html(" Draw Worldlines");

    td = row.append("td");
    td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            if (d3.select(this).property("checked")){
                that.draw_constructionlines = true;
            }else{
                that.draw_constructionlines = false;
            }
        });
    td.append("span").html(" Prime-frame lines");

    td = row.append("td");
    td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            if (d3.select(this).property("checked")){
                that.gridline_g.attr("display","inline");
            }else{
                that.gridline_g.attr("display","none");
            }
        });
    td.append("span").html(" Gridlines");
    
    row = table.append("tr"); // Checkbox row 2
    td = row.append("td");
    td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            if (d3.select(this).property("checked")){
                that.lightline_g.attr("display","inline");
            }else{
                that.lightline_g.attr("display","none");
            }
        });
    td.append("span").html("Light-line");

    row = table.append("tr"); // Add/Remove Controls
    td = row.append("td");
    td.append("input").attr("type","button").attr("value","Add Particle")
        .on("click",function() {
            if (that.ui_addP.style("display")!=="none"){
                that.ui_addP.style("display","none");
            } else{
                that.ui_addP.style("display","inline");
            }

        });
    td = row.append("td");
    td.append("input").attr("type","button").attr("value","Remove Particle/Event")
        .on("click",function() {
            that.removeSelected();
        });
    td = row.append("td");
    td.append("input").attr("type","button").attr("value","Add Event")
        .on("click",function() {
            if (that.ui_addE.style("display")!=="none"){
                that.ui_addE.style("display","none");
            } else{
                that.ui_addE.style("display","inline");
            }

        });
};
SpacetimeDiagram.prototype.buildPlayUI = function() {
    var oy = this.ctrl.oy; // "origin" of the UI (top left)
    var h = this.ctrl.h; // height of the UI
    var w = this.ctrl.w; // width of the UI
    var n = 2; // number of "rows"
    var rh = h/n;
    // group all the UI stuff together
    var g = d3.select(this.div+" svg").append("g");
    var st = this;

    var button = function(x,y,w,h,color,on_click) {
        g.append("rect")
            .attr("x",x)
            .attr("y",y)
            .attr("height",h)
            .attr("width",w)
            .style("fill",color)
            .on("click",on_click);
        return this;
    };
    var slider = function(x,y,w,h,min,max,initial,vstep,update_func) {
        this.update = update_func;
        this.w = w;
        this.h = h;
        this.ox = x;
        this.oy = y;
        this.min = min;
        this.max = max;
        this.vstep = vstep;
        this.value;

        this.v2x = d3.scaleLinear() // converting between values and x-position
            .domain([min,max])
            .range([x,x+w]);
            
        var that = this;
        g.append("rect")
            .attr("x",x)
            .attr("y",y)
            .attr("height",h)
            .attr("width",w)
            .style("fill","grey")
            .on("click",function() {
                that.moveSlider(d3.mouse(this)[0],true);
            });


        this.prog_pos = g.append("rect")
            .attr("x",this.v2x(0))
            .attr("y",y)
            .attr("height",h)
            .attr("width",this.v2x(max)-this.v2x(0))
            .style("fill","green")
            .style("pointer-events","none");

        this.prog_neg = g.append("rect")
            .attr("x",this.v2x(min))
            .attr("y",y)
            .attr("height",h)
            .attr("width",this.v2x(0)-this.v2x(min))
            .style("fill","red")
            .style("pointer-events","none");

        this.circle = g.append("circle")
            .attr("r",h/5)
            .attr("cy",y+h/2)
            .style("pointer-events","none").attr("display","none")
            .style("fill","black");

        this.setValue(initial,false);
    };
    slider.prototype.moveSlider = function(x,update) {
        // update the slider such that cx = x
        // if update===true then run update function
        this.value = this.vstep*Math.floor(this.v2x.invert(x)/this.vstep);
        this.setValue(this.value,update);
    };
    slider.prototype.setValue = function(v,update) {
        // update the slider to have a value v
        // if update===true then run update function
        
        if(v>this.max) v = this.max;
        else if (v<this.min) v = this.min;

        v = this.vstep*Math.floor(v/this.vstep); // round to the nearest step
        if(v>=0){
            this.prog_neg.attr("width",0)
            this.prog_pos.attr("width",this.v2x(v)-this.v2x(0));
        }else{
            this.prog_neg
                .attr("x",this.v2x(v))
                .attr("width",this.v2x(0)-this.v2x(v))
            this.prog_pos.attr("width",0);
        }
        this.value = v;
        if(update) this.update(v);
    };

    g.append("rect")
        .attr("x",0)
        .attr("y",oy)
        .attr("width",w)
        .attr("height",h)
        .style("fill","black")

    var play_w = 20;
    this.play_sld = new slider((play_w+10),oy,w-(play_w+10)*2,rh,st.ymin
        ,st.ymax,0,st.tstep,
        function(v) {
            st.changeTime(this.value,true);
        });
    new button(0,oy,play_w,rh,"orange",
        function() {
            st.animating = !st.animating;
            st.animate();
        });
    new button(w-play_w,oy,play_w,rh/2,"green",
        function() {
            st.changeTime(st.t+st.tstep);
        });
    new button(w-play_w,oy+rh/2,play_w,rh/2,"red",
        function() {
            st.changeTime(st.t-st.tstep);
        });
    // prime frame options
    this.prime_sld = new slider(w/4,(oy+rh)+rh/4,w/2,rh/2,-1
        ,1,st.prime_vel,0.01,function(v){
            st.updatePrimeAxes(v);
        });
    new button(13*w/16,(oy+rh)+rh/4,w/8,rh/2,"steelblue",
        function() {
            st.transformFrame(st.prime_vel);
        });
};
SpacetimeDiagram.prototype.buildMenus = function() {
    // Create visuals for adding particles
    var that = this;
    this.ui_addP = d3.select(this.div)
        .append("div").append("form")
        .attr("action","#")
        .style('position','absolute')
        .style('padding','10px 10px 10px 10px')
        .style('background','orange')
        .style('border-style','solid')
        .style('border-width','5px')
        .style('border-radius','20px')
        .style('left',10+'px')
        .style('top',10+'px')
        .style("width","40%")
        .style("display","none");

    var table=this.ui_addP.append("table")
        .style("width","100%")
        .style("font-size","20px");

    var row = table.append("tr");
    var inputs_addP = [];
    row.append("th").attr("colspan",2).html("<b>ADD PARTICLE</b>")
        .style("border-bottom","1pt solid black");

    row = table.append("tr");
    row.append("th").attr("colspan",2).html("You can press tab to move between fields")
        .style("font-style","italic")
        .style("font-size","14px")
        
    row = table.append("tr");
    row.append("td").append("span").html("Name:")
    inputs_addP.push( row.append("td").append("input").attr("type","text").attr("value",""));

    row = table.append("tr");
    row.append("th").attr("colspan",2).html("&nbsp");

    row = table.append("tr");
    row.append("td").append("span").html("Starting x:");
    inputs_addP.push(row.append("td").append("input").attr("type","number").attr("value",0));

    row = table.append("tr");
    row.append("td").append("span").html("Starting ct:");
    inputs_addP.push(row.append("td").append("input").attr("type","number").attr("value",0));

    row = table.append("tr");
    row.append("th").attr("colspan",2).html("&nbsp");

    row = table.append("tr");
    row.append("td").append("span").html("Velocity:");
    inputs_addP.push(row.append("td").append("input").attr("type","number").attr("value",0)
        .attr("min",-1).attr("max",1));

    row = table.append("tr");
    row.append("th").attr("colspan",2).html("&nbsp");

    row = table.append("tr");
    row.append("td").append("span").html("Lifetime:");
    inputs_addP.push(row.append("td").append("input").attr("type","number").attr("value",this.ymax)
        .attr("min",0));

    row = table.append("tr");
    row.append("td").append("span").html("Always exist:");
    inputs_addP.push(row.append("td").append("input").attr("type","checkbox").property("checked",false));

    row = table.append("tr");
    var addP_statustxt = row.append("th").attr("colspan",2);
    row = table.append("tr");
    var th = row.append("th").attr("colspan",2)
    th.append("input").attr("type","button").attr("value"," ADD ")
        .on("click",function() {
            if(Math.abs(parseFloat(inputs_addP[3].property("value")))>1){
                addP_statustxt.html("Invalid velocity");
                return;
            }
            else if (parseFloat(inputs_addP[4].property("value"))<0){
                addP_statustxt.html("Invalid lifetime");
                return;
            }
            addP_statustxt.html("");
            that.addParticle(
                parseFloat(inputs_addP[1].property("value")),
                parseFloat(inputs_addP[2].property("value")),
                parseFloat(inputs_addP[3].property("value")),
                inputs_addP[5].property("checked"),
                parseFloat(inputs_addP[4].property("value")) ,
                inputs_addP[0].property("value")
            );
            that.ui_addP.style("display","none");
        });
    th.append("input").attr("type","button").attr("value","CANCEL")
        .on("click",function() {
            that.ui_addP.style("display","none");
        })
    // Create visuals for adding events

    this.ui_addE = d3.select(this.div)
        .append("div").append("form")
        .attr("action","#")
        .style('position','absolute')
        .style('padding','10px 10px 10px 10px')
        .style('background','pink')
        .style('border-style','solid')
        .style('border-width','5px')
        .style('border-radius','20px')
        .style('left',10+'px')
        .style('top',10+'px')
        .style("width","40%")
        .style("display","none");

    table=this.ui_addE.append("table")
        .style("width","100%")
        .style("font-size","20px");

    row = table.append("tr");
    var inputs_addE = [];
    
    row.append("th").attr("colspan",2).html("ADD EVENT")
        .style("border-bottom","1pt solid black");

    row = table.append("tr");
    row.append("th").attr("colspan",2).html("You can press tab to move between fields")
        .style("font-style","italic")
        .style("font-size","14px")

    row = table.append("tr");
    row.append("td").append("span").html("Name:")
    inputs_addE.push( row.append("td").append("input").attr("type","text").attr("value",""));

    row = table.append("tr");
    row.append("th").attr("colspan",2).html("&nbsp");

    row = table.append("tr");
    row.append("td").append("span").html("x:");
    inputs_addE.push(row.append("td").append("input").attr("type","number").attr("value",0));

    row = table.append("tr");
    row.append("td").append("span").html("ct:");
    inputs_addE.push(row.append("td").append("input").attr("type","number").attr("value",0));

    row = table.append("tr");
    th = row.append("th").attr("colspan",2)
    th.append("input").attr("type","button").attr("value","ADD")
        .on("click",function() {
            that.addEvent(
                parseFloat(inputs_addE[1].property("value")),
                parseFloat(inputs_addE[2].property("value")),
                inputs_addE[0].property("value")
            );
            that.ui_addE.style("display","none");
        });
    th.append("input").attr("type","button").attr("value","CANCEL")
        .on("click",function() {
            that.ui_addE.style("display","none");
        })
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
    this.prime_sld.setValue(v);
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
SpacetimeDiagram.prototype.removeSelected = function(first_argument) {
    if (!this.eventselected || typeof this.selectedIndex!== "number") return;
    var data = [];
    var r = this._data[this.selectedIndex];

    if (r.type==="particle") this.particlecount--;

    for(var i=0; i<this._data.length; i++){
        var d = this._data[i];
        //remove birth event
        if(i===this.selectedIndex-2 && !r.omni) continue;
        //remove death event
        else if(i===this.selectedIndex-1 && !r.omni && r.lt<Infinity) continue;
        else if(i===this.selectedIndex) continue;
        data.push([d.xi,d.yi,d.vx,d.lt,d.type,d.color,d.desc,d.omni]);
    }
    this.eventselected = false;
    this._updateEvents(data,true);
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
        .style("stroke",function(d) {return d.color;})
        .style("opacity",0.5);
    worldlines
        .attr("x1",function(d) {
            return d.omni?that.xscale(d.xi+d.vx*(that.ymin-d.yi)):that.xscale(d.xi);
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
        .style("display",this.draw_worldlines?"inline":"none");
    // Remove any no longer present data
    events.exit().remove();
    worldlines.exit().remove();
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
    if(!this.eventselected||!this.draw_constructionlines || Math.abs(this.prime_vel)>=1){
        this.construct_g.attr("display","none");
        return;
    } 
    //(this.ymax-this.ymin)/((this.xmax-this.xmin))
    var e = this._data[this.selectedIndex];

    var ary = Math.atan(this.prime_vel*this.angle_scale); // angle (rad) of y-axis rotation
    var arx = Math.atan(this.prime_vel/this.angle_scale); // angle (rad) of x-axis rotation

    var g = 1/Math.sqrt(1-this.prime_vel*this.prime_vel); // lorentz factor
    var x = g*(e.x-this.prime_vel*e.y); // x' = g(x-vt)
    var y = g*(e.y-this.prime_vel*e.x); // t' = g(t-vx)

    var ly = (this.yscale(0)-this.yscale(y));
    var lx = (this.xscale(x)-this.xscale(0));

    this.construct_t
        .attr("x1",this.xscale(e.x))
        .attr("y1",this.yscale(e.y))
        .attr("x2",this.xscale(0)+ly*Math.sin(ary))
        .attr("y2",this.yscale(0)-ly*Math.cos(ary));
    this.construct_x
        .attr("x1",this.xscale(e.x))
        .attr("y1",this.yscale(e.y))
        .attr("x2",this.xscale(0)+lx*Math.cos(arx))
        .attr("y2",this.yscale(0)-lx*Math.sin(arx));
    this.construct_t_mark
        .attr("cx",this.xscale(0)+ly*Math.sin(ary))
        .attr("cy",this.yscale(0)-ly*Math.cos(ary));
    this.construct_x_mark
        .attr("cx",this.xscale(0)+lx*Math.cos(arx))
        .attr("cy",this.yscale(0)-lx*Math.sin(arx));

    this.construct_g.attr("display","inline");
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
    else {ptype = "particle"; this.particlecount++;}
    
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
        .text([
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
    if(t>this.ymax) t = this.ymax;
    else if (t<this.ymin) t = this.ymin;
    this.t = t;
    this.play_sld.setValue(t);
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
    if(t>=this.ymax) this.animating = false;
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