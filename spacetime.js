"use strict"
var SpacetimeDiagram = function(div,xmin,xmax,ymin,ymax,w,h,newtonian,gridline_sep,showcontrols,showplay,showprime) {
    // SVG diagram displaying ct against x
    // div is the html element id (#string) to which the svg is appended
    // xmax(ymax): max value for x(y) domain.
    // *****There should never be more than one SpacetimeDiagram per div!*****
    if(typeof newtonian === "undefined") newtonian = false;
    if(typeof gridline_sep !== "number") gridline_sep = 1;
    if(showcontrols !== false) showcontrols = true;
    if(showplay !== false) showplay = true;
    if(showprime !== false) showprime = true;
    if(xmin>0 || xmax<0 || ymin>0 || ymax<0){
        throw("Currently, rotations cannot be displayed without a 0,0 origin")
    }
    this.showplay = showplay;
    this.showprime = showprime;
    this.showcontrols = showcontrols;
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
    this.draw_particles = true;
    this.draw_birthdeath = true;
    this.draw_events = true;
    this.draw_primegrid = true;
    this.ui_addP;
    this.ui_addE;
    this.play_sld;
    this.ui_bottom;
    this.control_h = h/10; // height of the play/prime vel. UI
    this.checkboxes = {};

    if(!showplay && !showprime) this.control_h = 0;
    else if (!showplay || !showprime) this.control_h = this.control_h/2;
    // conventional d3 margin setup
    this.margin = {top: 50, right: 50, bottom: 50, left: 50};
    this.ctrl = {h:that.control_h,w:w,oy:h};
    this.width = w - this.margin.left - this.margin.right;
    this.height = h - this.margin.top - this.margin.bottom;
    this.angle_scale = (this.ymax-this.ymin)/((this.xmax-this.xmin))
        *this.width/this.height; // for dealing with rotations.
    this.particlecount = 0;
    this.colors = ["red","orange","green","blue","cyan"];
    // add svg object and translate group to top left margin
    this.svg = d3.select(this.div).append("svg")
        .classed("spacetime",true)
        .attr("width",w)
        .attr("height",h+this.control_h)
        .style("background",this.newtonian?"#eef":"white")
        .style("-webkit-user-select","none")
        .style("-moz-user-select","none")
        .style("-ms-user-select","none")
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
    this.gridtick_x = d3.range(xmin,xmax+gridline_sep,gridline_sep);
    this.gridtick_y = d3.range(ymin,ymax+gridline_sep,gridline_sep);

    this.gridline_x_g = this.svg.append("g");
        
    this.gridline_x_g.selectAll("line").data(this.gridtick_x)
    .enter().append("line")
        .attr("x1",function(d){return that.xscale(d);})
        .attr("y1",this.yscale(this.ymin))
        .attr("x2",function(d){return that.xscale(d);})
        .attr("y2",this.yscale(this.ymax))
        .style("stroke","blue")
        .style("opacity",0.2)
        .style("stroke-width","1px");

    this.gridline_y_g = this.svg.append("g");

    this.gridline_y_g.selectAll("line").data(this.gridtick_y)
    .enter().append("line")
        .attr("x1",this.xscale(this.xmin))
        .attr("y1",function(d){return that.yscale(d);})
        .attr("x2",this.xscale(this.xmax))
        .attr("y2",function(d){return that.yscale(d);})
        .style("stroke","blue")
        .style("opacity",0.2)
        .style("stroke-width","1px");

    // Prime grid built slightly differently to aid rotations later

    this.gridline_prime_x_g = this.svg.append("g");

    this.gridline_prime_x_g.selectAll("line").data(this.gridtick_x)
    .enter().append("line")
        .attr("x1",0)
        .attr("x2",0)
        .attr("y1",this.yscale(this.ymin))
        .attr("y2",this.yscale(this.ymax))
        .attr("transform",function(d){
            return ["translate(",that.xscale(d),",0) rotate(0)"].join("");
        })
        .style("stroke","red")
        .style("opacity",0.2)
        .style("stroke-width","1px");

    this.gridline_prime_y_g = this.svg.append("g");

    this.gridline_prime_y_g.selectAll("line").data(this.gridtick_y)
    .enter().append("line")
        .attr("x1",this.xscale(this.xmin))
        .attr("y1",0)
        .attr("x2",this.xscale(this.xmax))
        .attr("y2",0)
        .attr("transform",function(d) {
            return ["translate(0,",that.yscale(d),") rotate(0)"].join("");
        })
        .style("stroke","red")
        .style("opacity",0.2)
        .style("stroke-width","1px");


    // add x axis
    this.svg.append("g")
        .attr("transform", "translate(0," + this.yscale(0) + ")")
        .call(d3.axisBottom(this.xscale))

    this.svg.append("text")
        .attr("x",this.width+10)
        .attr("y",this.yscale(0))
        .attr("alignment-baseline","central")
        .text("x");

    // add y axis
    this.svg.append("g")
        .call(d3.axisLeft(this.yscale))
        .attr("transform","translate("+this.xscale(0)+",0)");
    this.svg.append("text")
        .attr("y", -20)
        .attr("x", this.xscale(0))
        .style("text-anchor", "middle")
        .attr("alignment-baseline","central")
        .text("ct");

    if (this.newtonian){
        // add x' axis
        this.axis_xprime=this.svg.append("g")
            .call(d3.axisBottom(this.xscale).ticks(0));

        // add y' axis
        this.axis_yprime=this.svg.append("g")
            .call(d3.axisLeft(this.yscale).ticks(0));


    } else{
        // add x' axis
        this.axis_xprime=this.svg.append("g")
            .call(d3.axisBottom(this.xscale));

        // add y' axis
        this.axis_yprime=this.svg.append("g")
            .call(d3.axisLeft(this.yscale));
        // ---------------------------------
    }

    this.svg.append("rect") // click on background to deselect. 
        .attr("x",0-this.margin.left)
        .attr("y",0-this.margin.top)
        .attr("width",w)
        .attr("height",h)
        .style("opacity","0")
        .on("click",function() {that.deselect();});

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
    this.buildPlayUI();
    this.buildMenus();
    this.buildControls();
    

    this.updatePrimeAxes(0);
};
SpacetimeDiagram.prototype.deselect = function() {
    this.eventselected = false;
    this.construct_g.attr("display","none");
    this.hovertext.style("opacity",0);
};
SpacetimeDiagram.prototype.buildControls = function() { 
    if (!this.showcontrols) this.ctrldiv.style("display","none");
    var that = this;
    var row;
    var td;
    var table=this.ctrldiv.append("table")
        .style("width","100%")
        .style("font-size","20px")

    row = table.append("tr");
    row.append("th").attr("colspan",3).html("Controls")
        .style("border-bottom","1pt solid black");

    row = table.append("tr");
    row.append("th").attr("colspan",3).html("Drawing")
        .style("border-bottom","1pt solid black");
    
    row = table.append("tr");
    td = row.append("td");
    this.checkboxes.showparticles = td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            that.cb_showparticles(d3.select(this).property("checked"));
        }); 
    td.append("span").html(" Particles");

    td = row.append("td");
    this.checkboxes.showbirthdeath = td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            that.cb_showbirthdeath(d3.select(this).property("checked"));
        });
    td.append("span").html(" Birth/Death");

    td = row.append("td");
    this.checkboxes.showevents =  td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            that.cb_showevents(d3.select(this).property("checked"));
        });
    td.append("span").html(" Other Events");
    row = table.append("tr");
    td = row.append("td");
    this.checkboxes.showworldlines = td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            that.cb_showworldlines(d3.select(this).property("checked"));
        }); 
    td.append("span").html(" Draw Worldlines");

    td = row.append("td");
    this.checkboxes.showprimeprojection =  td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            that.cb_showprimeprojection(d3.select(this).property("checked"));
        });
    td.append("span").html(" Prime-Projection lines");

    td = row.append("td");
    this.checkboxes.showgridlines =  td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            that.cb_showgridlines(d3.select(this).property("checked"));
        });
    td.append("span").html(" Gridlines");
    
    row = table.append("tr"); // Checkbox row 2
    td = row.append("td");
    this.checkboxes.showlightlines = td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            that.cb_showlightlines(d3.select(this).property("checked"));
        });
    td.append("span").html("Light-line");

    td = row.append("td");
    this.checkboxes.showprimegrid =  td.append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            that.cb_showprimegrid(d3.select(this).property("checked"));
        });
    td.append("span").html(" Prime Gridlines ");

    row = table.append("tr");
    row.append("th").attr("colspan",3).html("Events")
        .style("border-bottom","1pt solid black");

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
    td.append("input").attr("type","button").attr("value","Remove Selected ")
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
    var oy = this.height+this.margin.top+this.margin.bottom; // "origin" of the UI (top left)
    var h = this.control_h; // height of the UI
    var prime_y  = this.showplay?h/2:0; //offset of the prime group
    var prime_h  = this.showplay?h/4:h/2;
    var play_h = this.showprime?0.9*h/2:0.9*h;
    var w = this.width+this.margin.left+this.margin.top; // width of the UI
    var pad = w/90;
    var play_w = w/22.5;
    // group all the UI stuff together
    var st = this;

    this.ui_bottom = d3.select(this.div+" svg").append("g")
        .style("display",(!this.showplay && !this.showprime)?"none":"inline");

    var button = function(g,x,y,w,h,color,on_click,txt) {
        if(typeof txt === "undefined") txt = "";
        var that = this;
        this.group = g.append("g");
        this.group.append("rect")
            .attr("x",x)
            .attr("y",y)
            .attr("height",h)
            .attr("width",w)
            .style("fill",color)
            .on("click",on_click);
        this.txt = this.group.append("text").text(txt)
            .attr("x",x+w/2)
            .attr("y",y+h/2)
            .attr("text-anchor","middle")
            .attr("alignment-baseline","central")
            .attr("font-size",h+"px")
            .style("font-family","monospace")
            .style("pointer-events","none")
            .style("fill","#000");

        this.group
            .on("mouseenter",function() {   
                that.txt.style("fill","#fff");
            })
            .on("mouseout",function() {
                that.txt.style("fill","#000");
            });

        return this;
    };
    var slider = function(g,x,y,w,h,min,max,initial,vstep,update_func) {
        this.mouseisdown = false; // for dragging
        this.update = update_func;
        this.w = w;
        this.h = h;
        this.ox = x;
        this.oy = y;
        this.min = min;
        this.max = max;
        this.vstep = vstep;
        this.value;
        this.group = g.append("g");
        this.v2x = d3.scaleLinear() // converting between values and x-position
            .domain([min,max])
            .range([x,x+w]);
            
        var that = this;
        this.group.on("mousedown",function(){that.mouseisdown = true;})
        this.group.on("mouseup",function(){that.mouseisdown = false;})
        this.group.append("rect")
            .attr("x",x)
            .attr("y",y)
            .attr("height",h)
            .attr("width",w)
            .style("fill","grey")
            .on("click",function() {
                that.mouseisdown = false;
                that.moveSlider(d3.mouse(this)[0],true);
            });

        this.prog_pos = this.group.append("rect")
            .attr("x",this.v2x(0))
            .attr("y",y)
            .attr("height",h)
            .attr("width",this.v2x(max)-this.v2x(0))
            .style("fill","green")
            .style("pointer-events","none");

        this.prog_neg = this.group.append("rect")
            .attr("x",this.v2x(min))
            .attr("y",y)
            .attr("height",h)
            .attr("width",this.v2x(0)-this.v2x(min))
            .style("fill","red")
            .style("pointer-events","none");

        this.prog_pos_mouse = this.group.append("rect")
            .attr("x",this.v2x(0))
            .attr("y",y)
            .attr("height",h)
            .attr("width",this.v2x(max)-this.v2x(0))
            .style("fill","#333")
            .style("opacity",0.5)
            .style("pointer-events","none")
            .attr("display","none");

        this.prog_neg_mouse = this.group.append("rect")
            .attr("x",this.v2x(min))
            .attr("y",y)
            .attr("height",h)
            .attr("width",this.v2x(0)-this.v2x(min))
            .style("fill","#333")
            .style("opacity",0.5)
            .style("pointer-events","none")
            .attr("display","none");

        this.group.on("mousemove",function() {
            var v = that.v2x.invert(d3.mouse(this)[0]);
            if(v>=0){
                that.prog_pos_mouse.attr("display","inline");
                that.prog_neg_mouse.attr("display","none");
                that.prog_pos_mouse.attr("width",that.v2x(v)-that.v2x(0));
            }
            else{
                that.prog_neg_mouse.attr("display","inline");
                that.prog_pos_mouse.attr("display","none");
                that.prog_neg_mouse
                    .attr("x",that.v2x(v))
                    .attr("width",that.v2x(0)-that.v2x(v));

            }
            if(that.mouseisdown) that.moveSlider(d3.mouse(this)[0],true);
        })
        .on("mouseout",function() {
            that.prog_neg_mouse.attr("display","none");
            that.prog_pos_mouse.attr("display","none");
            that.mouseisdown = false;
        });

        this.circle = this.group.append("circle")
            .attr("r",h/5)
            .attr("cy",y+h/2)
            .style("pointer-events","none").attr("display","none")
            .style("fill","black");

        this.txt = this.group.append("text")
            .attr("x",x+w/2)
            .attr("y",y+h/2)
            .attr("text-anchor","middle")
            .attr("alignment-baseline","central")
            .attr("font-size",h+"px")
            .style("font-family","monospace")
            .style("pointer-events","none");

        this.setValue(initial,false);
    };
    slider.prototype.moveSlider = function(x,update) {
        // update the slider such that cx = x
        this.setValue(this.vstep*Math.floor(this.v2x.invert(x)/this.vstep),update);
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
        this.txt.text(v.toFixed(2));
        if(update) this.update(v);
    };

    var bw_gradient = this.ui_bottom.append("defs")
        .append("linearGradient")
        .attr("id", "bw_gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");

    bw_gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#aaa")
        .attr("stop-opacity", 1);
    bw_gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#fff")
        .attr("stop-opacity", 1);

    this.ui_bottom.append("rect")
        .attr("x",0)
        .attr("y",oy-pad)
        .attr("width",w)
        .attr("height",h+pad)
        .style("fill", "url(#bw_gradient)")
        .style("rx",3)
        .style("stroke-width","1px")
        .style("stroke","black");

    this.playgroup = this.ui_bottom.append("g").style("display",this.showplay?"inline":"none");

    this.play_sld = new slider(this.playgroup,(play_w),oy,w-(play_w)*2,play_h,st.ymin
        ,st.ymax,0,st.tstep,
        function(v) {
            st.changeTime(this.value,true);
        });
    new button(this.playgroup,pad,oy,play_w,play_h,"orange",
        function() {
            st.togglePlay();
        },"\u25B6");
    new button(this.playgroup,w-play_w-pad,oy,play_w,play_h/2,"green",
        function() {
            st.changeTime(st.t+st.tstep);
        },"+");
    new button(this.playgroup,w-play_w-pad,oy+play_h/2,play_w,play_h/2,"red",
        function() {
            st.changeTime(st.t-st.tstep);
        },"-");

    // prime frame options
    this.primegroup = this.ui_bottom.append("g").style("display",this.showprime?"inline":"none");

    this.prime_sld = new slider(this.primegroup,w/4,(oy+prime_y)+h/8,w/2,prime_h,-1
        ,1,st.prime_vel,0.01,function(v){
            st.updatePrimeAxes(v);
        });
    new button(this.primegroup,13*w/16,(oy+prime_y)+h/8,w/8,prime_h,"steelblue",
        function() {
            st.transformFrame(st.prime_vel);
        },"Transform");
    this.primegroup.append("text").text("Prime vel:")
            .attr("x",w/8)
            .attr("y",oy+h/4+prime_y)
            .attr("text-anchor","middle")
            .attr("alignment-baseline","central")
            .attr("font-size",prime_h+"px")
            .style("font-family","monospace")
            .style("pointer-events","none")
            .style("fill","#000");
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
    var row_lt = row.append("td").append("input").attr("type","number").attr("value",this.ymax)
        .attr("min",0);
    inputs_addP.push(row_lt);

    row = table.append("tr");
    row.append("td").append("span").html("Always exist:");
    inputs_addP.push(row.append("td").append("input").attr("type","checkbox").property("checked",false)
        .on("change",function() {
            row_lt.property("disabled",d3.select(this).property("checked"));
        }
    ));

    row = table.append("tr");
    row.append("td").append("span").html("Color (Hex RGB):");
    var row_color_p = row.append("td").append("input").attr("type","text").attr("value","#AAAAAA")
        .property("disabled","true");
    inputs_addP.push(row_color_p);

    row = table.append("tr");
    row.append("td").append("span").html("Auto Color:");
    inputs_addP.push(row.append("td").append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            row_color_p.property("disabled",d3.select(this).property("checked"));
        }
    ));
    row = table.append("tr");
    var addP_statustxt = row.append("th").attr("colspan",2);
    row = table.append("tr");
    var th = row.append("th").attr("colspan",2)
    th.append("input").attr("type","button").attr("value"," ADD ")
        .on("click",function() {
            var color;
            if(!that.newtonian && Math.abs(parseFloat(inputs_addP[3].property("value")))>1){
                addP_statustxt.html("FTL velocity");
                return;
            }
            else if (parseFloat(inputs_addP[4].property("value"))<0){
                addP_statustxt.html("Negative lifetime");
                return;
            }
            for (var i=0; i<inputs_addP.length; i++){ // Make sure valid number inputs
                if (inputs_addP[i].attr("type")==="number" && 
                    isNaN(parseFloat(inputs_addP[i].property("value")))){
                    addP_statustxt.html("Invalid Entry");
                    return;
                }
            }            
            if (!inputs_addP[7].property("checked") && 
                !/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(inputs_addP[6].property("value"))){
                addP_statustxt.html("Color must be of format: #xxxxxx where x is 0-9 or A-F");
                return;
            }else if (!inputs_addP[7].property("checked")){ // if not autocolor
                color = inputs_addP[6].property("value"); 
            }
            addP_statustxt.html("");
            that.addParticle(
                parseFloat(inputs_addP[1].property("value")),
                parseFloat(inputs_addP[2].property("value")),
                parseFloat(inputs_addP[3].property("value")),
                inputs_addP[5].property("checked"),
                parseFloat(inputs_addP[4].property("value")),
                inputs_addP[0].property("value"),
                color
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
    row.append("td").append("span").html("Color (Hex RGB):");
    var row_color_e = row.append("td").append("input").attr("type","text").attr("value","#AAAAAA")
        .property("disabled","true");
    inputs_addE.push(row_color_e);

    row = table.append("tr");
    row.append("td").append("span").html("Auto Color:");
    inputs_addE.push(row.append("td").append("input").attr("type","checkbox").property("checked",true)
        .on("change",function() {
            row_color_e.property("disabled",d3.select(this).property("checked"));
        }
    ));

    row = table.append("tr");
    var addE_statustxt = row.append("th").attr("colspan",2);

    row = table.append("tr");
    th = row.append("th").attr("colspan",2)
    th.append("input").attr("type","button").attr("value","ADD")
        .on("click",function() {
            var color;
            for (var i=0; i<inputs_addE.length; i++){ // Make sure valid number inputs
                if (inputs_addE[i].attr("type")==="number" && 
                    isNaN(parseFloat(inputs_addE[i].property("value")))){
                    addE_statustxt.html("Invalid Entry");
                    return;
                }
            }
            if (!inputs_addE[4].property("checked") && 
                !/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(inputs_addE[3].property("value"))){
                addE_statustxt.html("Color must be of format: #xxxxxx where x is 0-9 or A-F");
                return;
            }
            else if (!inputs_addE[4].property("checked")){ // if not autocolor
                color = inputs_addE[3].property("value"); 
            }
            that.addEvent(
                parseFloat(inputs_addE[1].property("value")),
                parseFloat(inputs_addE[2].property("value")),
                inputs_addE[0].property("value"),
                color
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
    var that = this;
    var ary = Math.atan(v*this.angle_scale); // angle (rad) to rotate y-axis
    var arx = this.newtonian?0:Math.atan(v/this.angle_scale); // angle (rad) to rotate x-axis
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

    if(this.draw_primegrid){
        this.gridline_prime_x_g.selectAll("line")
        .attr("transform",function(d) {
            return ["translate(",
                that.xscale(d)+yp*Math.sin(ary), // x translation
                ",",
                yp*(1-Math.cos(ary)), // y translation
                ") rotate(",
                ary*180/Math.PI, // rotate (deg)
                ")"].join("");
        })

        this.gridline_prime_y_g.selectAll("line")
        .attr("transform",function(d){
            return ["translate(",
                xm*(1-Math.cos(arx)), // x translation
                ",",that.yscale(d)+xm*Math.sin(arx), // y translation
                ") rotate(",-arx*180/Math.PI, // rotate (deg) 
                ")"].join("");
        })
    }
};
SpacetimeDiagram.prototype.removeSelected = function() {
    if (!this.eventselected || typeof this.selectedIndex!== "number") return;
    var data = [];
    var ind = this.selectedIndex;
    var r = this._data[ind];

    if (r.type === "birth") {ind +=2; r = this._data[ind];}
    else if (r.type === "death"){ind +=1; r = this._data[ind];}    

    if (r.type==="particle") this.particlecount--;

    for(var i=0; i<this._data.length; i++){
        var d = this._data[i];
        //remove birth event
        if((r.type==="particle" || r.type==="light") && i===ind-2 && !r.omni) continue;
        //remove death event
        else if((r.type==="particle" || r.type==="light") && i===ind-1 && !r.omni && r.lt<Infinity) continue;
        else if(i===ind) continue;
        data.push([d.xi,d.yi,d.vx,d.lt,d.type,d.color,d.name,d.omni]);
    }
    this.deselect();
    this._updateData(data,true);
    this.changeTime(this.t);
};
SpacetimeDiagram.prototype._updateData = function(arr,cleardata) {
    // ...
    // cleardata: are we overwriting any data?
    if(cleardata !== true) cleardata = false;
    if(cleardata) {
        this._data = [];
        this._data_particle = [];
    }    for(var i=0; i<arr.length; i++){
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
            name:arr[i][6],
            omni:arr[i][7],
            index:this._data.length
        }
        this._data.push(d);
        if(arr[i][4]==="particle" || arr[i][4]==="light"){
            this._data_particle.push(d);
        }
    }
    this._updateEvents();
};
SpacetimeDiagram.prototype._updateEvents = function() {
    var that = this;

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
            return d.color?d.color:"purple";
        })
        .style("fill-opacity",function(d) {
            if (d.type==="particle" || d.type==="light") {
                return d.alive ? 1 : 0;
            }
            if (d.type==="birth" || d.type==="death"){
                return 0;
            }
        })
        .style("display",function(d) {
            if ((d.type === "particle" || d.type === "light")){
                return that.draw_particles?"inline":"none";
            }
            if ((d.type==="birth" || d.type==="death")){
                return that.draw_birthdeath?"inline":"none";
            }
            return that.draw_events?"inline":"none";
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
        .style("opacity",0.5);
    worldlines
        .style("stroke",function(d) {return d.color;})
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
    if(this.eventselected){ // deselect previous
        if (this.selectedIndex === i) {
            // If clicked twice
            this.eventselected = false;
            this.hovertext.style("opacity",0);
            this.updatePrimeAxes(this._data[i].vx);
            return;
        }
    }
    this.selectedIndex = i;
    this.eventselected = true;
    this.updateSelectionInfo();
    this.updateConstructionLines();
};
SpacetimeDiagram.prototype.updateConstructionLines = function() {
    // if enabled...
    if(!this.eventselected||!this.draw_constructionlines || Math.abs(this.prime_vel)>=1){
        this.construct_g.attr("display","none");
        return;
    } 
    var e = this._data[this.selectedIndex];

    if(this.newtonian){ 
    // x' = x-vt
    // t' = t
    console.log(e);
    this.construct_t
        .attr("x1",this.xscale(e.x))
        .attr("y1",this.yscale(e.y))
        .attr("x2",this.xscale(0))
        .attr("y2",this.yscale(e.y));
    this.construct_t_mark
        .attr("cx",this.xscale(0))
        .attr("cy",this.yscale(e.y));
    this.construct_x
        .attr("x1",this.xscale(e.x))
        .attr("y1",this.yscale(e.y))
        .attr("x2",this.xscale(e.x-this.prime_vel*e.y))
        .attr("y2",this.yscale(0));
    this.construct_x_mark
        .attr("cx",this.xscale(e.x-this.prime_vel*e.y))
        .attr("cy",this.yscale(0));

    this.construct_g.attr("display","inline");
        return;
    }

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
    this.construct_t_mark
        .attr("cx",this.xscale(0)+ly*Math.sin(ary))
        .attr("cy",this.yscale(0)-ly*Math.cos(ary));
    this.construct_x
        .attr("x1",this.xscale(e.x))
        .attr("y1",this.yscale(e.y))
        .attr("x2",this.xscale(0)+lx*Math.cos(arx))
        .attr("y2",this.yscale(0)-lx*Math.sin(arx));
    this.construct_x_mark
        .attr("cx",this.xscale(0)+lx*Math.cos(arx))
        .attr("cy",this.yscale(0)-lx*Math.sin(arx));

    this.construct_g.attr("display","inline");
};
SpacetimeDiagram.prototype.addParticle = function(xb,tb,u,omni,lt,name,color) {
    // add a particle that will be born at xb,tb.
    // and travel in x with velocity u with a lifetime lt.
    // birth and death events will also be added.
    // if lt is set to Infinity, no death event will be added.
    // if omni == false, no birth or death event will be added.
    if (typeof lt === "undefined" || omni === true) lt = Infinity;
    if (lt<0) {throw("cannot create particle with negative lifetime!"); return;}
    if (!this.newtonian && (u>1 || u<-1)) {throw("cannot create faster than light particle!"); return;}
    if (typeof name !== "string") name="";

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
        xb,tb,u,lt,ptype,color,name,omni
    ]);
    this._updateData(new_events,false);
};
SpacetimeDiagram.prototype.addEvent = function(x,t,name,color) {
    if(typeof name !== "string") name = "";
    if(typeof color !== "string") color = "purple";
    this._updateData([[x,t,0,0,"event",color,name]]
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
        this.deselect();
        return;
    }
    this.hovertext.style("opacity",1)
        .attr("x",this.xscale(this._data[i].x)+10)
        .attr("y",this.yscale(this._data[i].y)+30)
        .text([
            this._data[i].name,
            " (",this._data[i].x.toFixed(2),
            ",",
            this._data[i].y.toFixed(2),
            ")"
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
    this._updateData([],false);
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
                d.lt,d.type,d.color,d.name,d.omni]);
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
                d.type,d.color,d.name,d.omni]);
        }
        this.lab_vel = (this.lab_vel-v)/(1-this.lab_vel*v);
    }
    this._updateData(data,true);
    this.changeTime(0);
    this.updatePrimeAxes(0); // reset prime axes
};
SpacetimeDiagram.prototype.setParticleFrame = function(event_index) {
    // update the frame velocity such that the given particle is at rest.
    if (this._data[event_index].type!=="particle") return;
    this.transformFrame(this._data[event_index].vx);
};
SpacetimeDiagram.prototype.togglePlay = function() {
    this.animating = !this.animating;
    this.animate();
};
SpacetimeDiagram.prototype.cb_showparticles = function(bool) {
    if (bool){
        this.draw_particles = true;
    }else{
        this.draw_particles = false;
    }
    this.checkboxes.showparticles.property("checked",bool);
    this._updateEvents();
};
SpacetimeDiagram.prototype.cb_showbirthdeath = function(bool) {
    if (bool){
        this.draw_birthdeath = true;
    }else{
        this.draw_birthdeath = false;
    }
    this.checkboxes.showbirthdeath.property("checked",bool);
    this._updateEvents();
};
SpacetimeDiagram.prototype.cb_showevents = function(bool) {
    if (bool){
        this.draw_events = true;
    }else{
        this.draw_events = false;
    }
    this.checkboxes.showevents.property("checked",bool);
    this._updateEvents();
};
SpacetimeDiagram.prototype.cb_showworldlines = function(bool) {
    if (bool){
        this.draw_worldlines = true;
    }else{
        this.draw_worldlines = false;
    }
    this.checkboxes.showworldlines.property("checked",bool);
    this._updateEvents();
};
SpacetimeDiagram.prototype.cb_showprimeprojection = function(bool) {
    if (bool){
        this.draw_constructionlines = true;
    }else{
        this.draw_constructionlines = false;
    }
    this.checkboxes.showprimeprojection.property("checked",bool);
    this.updateConstructionLines();
};
SpacetimeDiagram.prototype.cb_showgridlines = function(bool) {
    if (bool){
        this.gridline_x_g.attr("display","inline");
        this.gridline_y_g.attr("display","inline");
    }else{
        this.gridline_x_g.attr("display","none");
        this.gridline_y_g.attr("display","none");
    }
    this.checkboxes.showgridlines.property("checked",bool);
};
SpacetimeDiagram.prototype.cb_showlightlines = function(bool) {
    if (bool){
        this.lightline_g.attr("display","inline");
    }else{
        this.lightline_g.attr("display","none");
    }
    this.checkboxes.showlightlines.property("checked",bool);
};
SpacetimeDiagram.prototype.cb_showprimegrid = function(bool) {
    if (bool){
        this.gridline_prime_x_g.selectAll("line").style("display","inline");
        this.gridline_prime_y_g.selectAll("line").style("display","inline");
        this.draw_primegrid = true;
        this.updatePrimeAxes(this.prime_vel); // update grid positions
    }else{
        this.gridline_prime_x_g.selectAll("line").style("display","none");
        this.gridline_prime_y_g.selectAll("line").style("display","none");
        this.draw_primegrid = false;
    }
    this.checkboxes.showprimegrid.property("checked",bool);
};