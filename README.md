# spacetime.js

Programmable spacetime diagrams for simulating problems in special relativity.
Suggestions and feedback greatly appreciated.

##Installation

Near the bottom of your HTML file, somewhere before the `</body>` put the following code:
```
<script type="text/javascript" src="d3.v4.min.js"></script>
<script type="text/javascript" src="https://chrisspyb.github.io/spacetime/spacetime.js"></script>
```
followed by your own scripts, which must appear after this code.

##Usage

###Making a new diagram
```
var foo = new SpacetimeDiagram(#div,xmin,xmax,tmin,tmax,w,h,newtonian,gridline_sep,showcontrols,showplay,showprime);
```
- #div (string) : # + **id** of div element into which the diagram will be placed e.g. "#my-div-id".
- xmin : minimum x-value on the axes.
- xmax : maximum x-value on the axes.
  - Note: the range [xmin,xmax] MUST include zero. 
- tmin : minimum ct-value on the axes.
- tmax : maximum ct-value on the axes.
  - Note: the range [tmin,tmax] MUST include zero. 
- w : width of svg (pixels).
- h : height of svg (pixels).
  - Note: Things tend do look nicer on a square grid, with w == h. In testing I used mostly used w=h=900.
  
Optional:
- newtonian (default: false): if true, diagram will use newtonian relativity instead of special relativity.
- gridline_sep (default: ): separation of gridlines.
- showcontrols (default: true): if true, a div with controls for adding events and hiding parts of the diagram will be added.
- showplay (default: true): if true, a play button will be created below the graph for incrementing through time.
- showprime (default: true): if true, a slider for changing the prime frame velocity will be added.

###Adding events
```
foo.addEvent(x,ct,name,color)
```
- x: x coordinate of event.
- ct: ct coordinate of event.

Optional:
- name (default: ""): name of event, to be shown on selection.
- color (default: "#800080"): hexidecimal color code for drawing event.

###Adding particles
```
foo.addParticle(xb,tb,v,omni,lt,name,color);
```
- xb: x coordinate of particle's birth event.
- tb: ct coordinate of particle's birth event.
- v: velocity of particle in the frame it is being added to.
- omni: if true, particle lives for ever and has no birth or death event.In this case (xb,tb) can be any point on the particle's path.
- lt: lifetime of particle. Determines position of death event. Set to **Infinity** to have no death event.

Optional:
- name (default: ""): name of particle, to be shown on selection.
- color (default: auto-choose a color based on number of particles): hexidecimal color code for drawing particle.

More to come...
