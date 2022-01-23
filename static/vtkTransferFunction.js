class VTKjsTrasnferFunctionInterface {
    //need d3 and "d3.tip.js"
    
    // _parentElementID: ID (with #) of the html tag (usually a <div>) to contain this TF interface
    //_visWidth, _visHeight: width and height in pixel of this tf interface
    //_opacityViewPercentage: height percentage of opacity view [0 - 1], e.g. 0.8
    //_updateRenderFunc: function to call vtk.js to rerender the volume
    //_getVolumeActorPropertyFunc: function to get the volume actor from vtk.js
    //_minMax: min and max value of the volume, e.g. [-400.23, 200.12]
    //_initOpaCtrolPoint: array of opacity control point, each element is a opacity control point [dataValue, opacity(0-1)], 
    //                    the first and last data value should match min max value of the data, 
    //                    data value should be from small to large
    //                    e.g. [[-400.23, 0.12], [-200, 0.5], [200.12, 1.0]], can be arbitrary length
    //                    if this argument is "null", just setup [[min, 0], [max, 1]]
    //_initNumColorCtrlPoint: number of control point (this number is larger, the color map is more accurate)
    //                        if this argument is -1, _initColorCtrlPoint is an color control point array
    //                        otherwise, _initColorCtrlPoint is a d3 color map function, e.g. d3.interpolateRainbow
    //                                  and _initNumColorCtrlPoint should be greater than and equal to 2
    //_initColorCtrlPoint: array of color control point, each elememnt is a color control point [datavalue, R, G, B (0-1)]
    //                    the first and last data value should match min max value of the data, 
    //                    data value should be from small to large
    //                    e.g. [[-400.23, 1.0, 0.0, 0.0], [-100, 0.0, 0.0, 1.0], [200.12, 1.0, 1.0, 0.0]] , can be arbitrary length
    //                    if _initNumColorCtrlPoint == -1, _initColorCtrlPoint should be a d3 color map function
    //_renormalize: fixed vtk.js bug while data value is too large
    //_renormalizeValue: value to renormalize (only work if _renormalize if true)
    constructor(_parentElementID, _visWidth, _visHeight, _opacityViewPercentage, _updateRenderFunc, _getVolumeActorPropertyFunc, _minMax,
                _initOpaCtrolPoint, _initNumColorCtrlPoint, _initColorCtrlPoint, _renormalize, _renormalizeValue){
        this.parentElementID = _parentElementID;
        this.tfSvgWidth = _visWidth;
        this.tfSvgHeight = _visHeight;
        this.opacityViewPercentage = _opacityViewPercentage;
        this.updateRenderFunc = _updateRenderFunc;
        this.getVolumeActorPropertyFunc = _getVolumeActorPropertyFunc;
        this._renormalize = _renormalize
        this._renormalizeValue = _renormalizeValue
        this.minMax = _minMax;
        if( _initOpaCtrolPoint === null ){
            this.opaCtrlPoint = [[this.minMax[0], 0], [this.minMax[1], 1]];    
        }else{
            this.opaCtrlPoint = _initOpaCtrolPoint;
        }
        this.opacityFactor = 1.0;
        if( _initNumColorCtrlPoint == -1 ){
            this.colorCtrlPoint = _initColorCtrlPoint;
        }else{
            let step = 1 / (_initNumColorCtrlPoint-1);
            this.colorCtrlPoint = []
            let colorMapValue = 0
            for(let i = 0; i<_initNumColorCtrlPoint; i++){
                let rgb = _initColorCtrlPoint(colorMapValue).split('(')[1].split(',');
                let r = parseFloat(rgb[0])/255.0;
                let g = parseFloat(rgb[1])/255.0;
                let b = parseFloat(rgb[2].split(')')[0])/255.0;
                this.colorCtrlPoint.push([colorMapValue * (this.minMax[1] - this.minMax[0]) + this.minMax[0], r, g, b]);
                colorMapValue += step;
            }
        }

        this.initProps(this, this.getVolumeActorPropertyFunc()); //set the volume Actor property (TF)

        this.initVis();

        this.updateRenderFunc();
    }

    initVis(){
        const vis = this;

        ///// setup basic svg and g and margin
        let tfSvgWidth = this.tfSvgWidth, tfSvgHeight = this.tfSvgHeight;
        let tfMargin = {top: 20, right: 20, bottom: 25, left: 50};
        let tfWidth =  tfSvgWidth - tfMargin.left - tfMargin.right;
        let tfHeight = tfSvgHeight*this.opacityViewPercentage - tfMargin.top - tfMargin.bottom; 
        let colorMargin = {top: tfSvgHeight*this.opacityViewPercentage, right: tfMargin.right, bottom: 10, left: tfMargin.left};
        let colorWidth = tfWidth;
        let colorHeight = tfSvgHeight - tfSvgHeight*this.opacityViewPercentage - colorMargin.bottom;
        document.getElementById(this.parentElementID.slice(1, this.parentElementID.length)).innerHTML = "";  // clear all tag
        let g = d3.select(this.parentElementID).append("g");
        let svg = g.append("svg").attr("width", tfSvgWidth).attr("height", tfSvgHeight);

        ///// color function setup
        let defs = svg.append("defs");
        let gradient = defs.append("linearGradient").attr("id", "svgGradient");
        updateColorGradientDef();

        ///// create basic tf interface 
        let tfG = svg.append("g").attr("transform", `translate(${tfMargin.left}, ${tfMargin.top})`);
        let xScale = d3.scaleLinear().domain(vis.minMax).range([0, tfWidth]);
        if (this._renormalize == true){
            let renormalizeTicks = d3.scaleLinear().domain([vis.minMax[0]*this._renormalizeValue, vis.minMax[1]*this._renormalizeValue]).range([0, tfWidth]);
            var xAxis = d3.axisBottom(renormalizeTicks).ticks(5).tickFormat(d3.format('.2e'));
        }
        else{
            var xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.2e'));
        }
        let xAxisG = tfG.append('g').attr("transform", `translate(0, ${tfHeight})`).call(xAxis);
        let yScale = d3.scaleLinear().domain([1, 0]).range([0, tfHeight]);
        let yAxis = d3.axisLeft(yScale).ticks(5);
        let yAxisG = tfG.append('g').attr("transform", `translate(0, 0)`).call(yAxis);
        tfG.append("rect").attr("x", 0).attr("y", 0).attr("width", tfWidth).attr("height", tfHeight).attr("opacity", "0"); //just to on click
        let areaGenerator = d3.area().x(d => xScale(d[0])).y0(d=>yScale(d[1]*vis.opacityFactor)).y1(yScale(0));
        let opaAreaPath = tfG.append("path").attr("d", areaGenerator(vis.opaCtrlPoint)).attr("opacity", "1.0").style("fill", "url(#svgGradient)");
        let lineGenerator = d3.line().x(d => xScale(d[0])).y(d=>yScale(d[1]*vis.opacityFactor));
        let opaLinePath = tfG.append("path").attr("d", lineGenerator(vis.opaCtrlPoint)).attr("stroke", "black").attr("stroke-width", 2).attr("fill", "none");
        let circles = tfG.selectAll("circle").data(vis.opaCtrlPoint).enter().append("circle")
                        .attr("cx", d=>xScale(d[0])).attr("cy", d=>yScale(d[1])).attr("r", "6").attr("fill", "black");

        let colorAreaGenerator = d3.area().x(d => xScale(d[0])).y0(0).y1(colorHeight);
        let colorG = svg.append("g").attr("transform", `translate(${colorMargin.left}, ${colorMargin.top})`);
        colorG.append("path").attr("d", colorAreaGenerator(this.colorCtrlPoint)).attr("opacity", "1.0").style("fill", "url(#svgGradient)");
        let circlesColor = colorG.selectAll("circle").data(vis.colorCtrlPoint).enter().append("circle")
                                .attr("cx", d => xScale(d[0]) ).attr("cy", colorHeight/2 ).attr("r", "6").attr("fill", "black").attr("stroke", "white");
        
        ///// scroll to adjust opacity factor
        let zoom = d3.zoom().scaleExtent([0.001, 1]).on("zoom", function(){
            vis.opacityFactor = d3.event.transform.k;
            updateTFInterface();
        });
        svg.call(zoom);

        /////  click to add opacity control point
        tfG.on("click", function(){
            let mousePosX = d3.mouse(this)[0];
            let mousePosY = d3.mouse(this)[1];
            let newDataVale = xScale.invert(mousePosX);
            let newOpacity = yScale.invert(mousePosY)/vis.opacityFactor;
            let idx = vis.opaCtrlPoint.findIndex(d=>(d[0] > newDataVale));
            vis.opaCtrlPoint.splice(idx, 0, [newDataVale, newOpacity]);
            updateTFInterface();
        });

        colorG.on("click", function(){
            let mousePosX = d3.mouse(this)[0];
            let newDataVale = xScale.invert(mousePosX);
            let idx = vis.colorCtrlPoint.findIndex(d=>(d[0] > newDataVale));
            let prev = vis.colorCtrlPoint[idx-1];
            let next = vis.colorCtrlPoint[idx];
            let a = (newDataVale - prev[0]) / (next[0] - prev[0]);
            let newColorCtrlPoint = [newDataVale, (1-a)*prev[1] + a*next[1], (1-a)*prev[2] + a*next[2], (1-a)*prev[3] + a*next[3] ];
            vis.colorCtrlPoint.splice(idx, 0, newColorCtrlPoint);
            updateTFInterface();
        });

        ///// tool tip object (without enabling listerner)
        let tip = d3.tip().attr('class', 'd3-tip')
                    .html(d=>((d[0]*this._renormalizeValue).toFixed(2) + ": [" + (d[1]*vis.opacityFactor).toFixed(2) + "]"));    
        let tipColor = d3.tip().attr('class', 'd3-tip')
                        .html(d=>((d[0]*this._renormalizeValue).toFixed(2) + ": [" + Math.floor(d[1]*255) + ", " + Math.floor(d[2]*255) + ", " + Math.floor(d[3]*255) + "]"));    

        //// drag object for opctity ctrl point dragging (without enabling listerner)
        let drag = d3.drag().on("drag", function(){
            let mousePosX = d3.mouse(this)[0];
            let mousePosY = d3.mouse(this)[1];
            
            if( mousePosY > tfHeight ) mousePosY = tfHeight;
            
            if( mousePosY < 0 )mousePosY = 0;
            var circle = d3.select(this);
            let selectedIndex = 0

            circles.nodes().forEach(function(d, i){
                if( d === circle.nodes()[0])selectedIndex = i;
            });
     
            let prevPointX = (selectedIndex == 0) ? mousePosX : parseFloat(circles.filter((d,i)=>i==(selectedIndex-1)).attr("cx"));
            let nextPointX = (selectedIndex == vis.opaCtrlPoint.length-1) ? mousePosX : parseFloat(circles.filter((d,i)=>i==(selectedIndex+1)).attr("cx"));

            if( mousePosX < prevPointX &&  selectedIndex > 0 && selectedIndex < vis.opaCtrlPoint.length - 1) mousePosX = prevPointX + 0.0001;
            if( mousePosX > nextPointX &&  selectedIndex > 0 && selectedIndex < vis.opaCtrlPoint.length - 1) mousePosX = nextPointX - 0.0001;
            
            if( selectedIndex == 0 || selectedIndex == vis.opaCtrlPoint.length - 1 ){
                vis.opaCtrlPoint[selectedIndex][1] = yScale.invert(mousePosY)/vis.opacityFactor;
            }else{
                vis.opaCtrlPoint[selectedIndex][0] = xScale.invert(mousePosX);
                vis.opaCtrlPoint[selectedIndex][1] = yScale.invert(mousePosY)/vis.opacityFactor;
            }

            tip.show(vis.opaCtrlPoint[selectedIndex], this);

            updateTFInterface();
        });

        let dragColor = d3.drag().on("drag", function(){
            let mousePosX = d3.mouse(this)[0];
            
            let circle = d3.select(this);
            let selectedIndex = 0

            circlesColor.nodes().forEach(function(d, i){
                if( d === circle.nodes()[0])selectedIndex = i;
            });
     
            let prevPointX = (selectedIndex == 0) ? mousePosX : parseFloat(circlesColor.filter((d,i)=>i==(selectedIndex-1)).attr("cx"));
            let nextPointX = (selectedIndex == vis.colorCtrlPoint.length-1) ? mousePosX : parseFloat(circlesColor.filter((d,i)=>i==(selectedIndex+1)).attr("cx"));

            if( mousePosX < prevPointX &&  selectedIndex > 0 && selectedIndex < vis.colorCtrlPoint.length - 1) mousePosX = prevPointX + 0.0001;
            if( mousePosX > nextPointX &&  selectedIndex > 0 && selectedIndex < vis.colorCtrlPoint.length - 1) mousePosX = nextPointX - 0.0001;
            
            if( !(selectedIndex == 0 || selectedIndex == vis.colorCtrlPoint.length - 1) ){
                vis.colorCtrlPoint[selectedIndex][0] = xScale.invert(mousePosX);
            }

            tipColor.show(vis.colorCtrlPoint[selectedIndex], this);

            updateColorGradientDef();
            updateTFInterface();
        });

        setupCtrlPointEvent(); //initialization: first time, enable listerner on control points(circles)

        //// update the view of the tf interface (after opacity array and opacity facetor has been updated)
        function updateTFInterface(){ //all change share same update function is not an efficient implmentation (but clear)
            yScale = d3.scaleLinear().domain([vis.opacityFactor, 0]).range([0, tfHeight]);
            yAxis = d3.axisLeft(yScale).ticks(5);
            yAxisG.transition().duration(50).call(yAxis);

            let circlesUpdate = tfG.selectAll("circle").data(vis.opaCtrlPoint, d=>d);
            let circleEnter = circlesUpdate.enter().append("circle");
            let circleExit = circlesUpdate.exit().remove();
            circles = circleEnter.merge(circlesUpdate).attr("cx", d=>xScale(d[0])).attr("cy", d=>yScale(d[1]*vis.opacityFactor)).attr("r", "6").attr("fill", "black");
            opaAreaPath.attr("d", areaGenerator(vis.opaCtrlPoint));
            opaLinePath.attr("d", lineGenerator(vis.opaCtrlPoint));

            let circlesColorUpdate = colorG.selectAll("circle").data(vis.colorCtrlPoint, d=>d);
            let circleColorEnter = circlesColorUpdate.enter().append("circle");
            let circleColorExit = circlesColorUpdate.exit().remove();
            circlesColor = circleColorEnter.merge(circlesColorUpdate).attr("cx", d => xScale(d[0]) ).attr("cy", colorHeight/2 ).attr("r", "6").attr("fill", "black").attr("stroke", "white");

            setupCtrlPointEvent();

            vis.initProps(vis, vis.getVolumeActorPropertyFunc()); //change transfer function here
            vis.updateRenderFunc();
        }

        function updateColorGradientDef(){
            let gradient = d3.select("#svgGradient");
            d3.selectAll(".colorStop").remove();
            vis.colorCtrlPoint.forEach(d=>{
                gradient.append("stop").attr("offset", (((d[0]-vis.minMax[0])/(vis.minMax[1]-vis.minMax[0]))*100).toString() + "%" )
                                    .attr("stop-color", d3.rgb(d[1]*255, d[2]*255, d[3]*255)).attr("class", "colorStop");
            });
        }
        
        //// enable or reset listener on control points (circles)
        function setupCtrlPointEvent(){
            circles.call(tip);
            circles.on('mouseover', tip.show).on('mousemove', tip.show).on('mouseout', tip.hide);
            circles.call(drag);
            //// right click to remove a opacity control point
            circles.on('contextmenu', function(d,i){
                d3.event.preventDefault(); //disable default menu popout
                if( i > 0 && i < vis.opaCtrlPoint.length - 1) {
                    vis.opaCtrlPoint.splice(i, 1);
                    updateTFInterface();
                    tip.hide();
                }
            });

            circlesColor.call(tipColor);
            circlesColor.on('mouseover', tipColor.show).on('mousemove', tipColor.show).on('mouseout', tipColor.hide);
            circlesColor.call(dragColor);
            //// right click to remove a color control point
            circlesColor.on('contextmenu', function(d,i){
                d3.event.preventDefault(); //disable default menu popout
                if( i > 0 && i < vis.colorCtrlPoint.length - 1) {
                    vis.colorCtrlPoint.splice(i, 1);
                    updateColorGradientDef();
                    updateTFInterface();
                    tip.hide();
                }
            });
        }
    }
    

    initProps(vis, property) {
        function newColorFunction() {
            let fun = vtk.Rendering.Core.vtkColorTransferFunction.newInstance();
            vis.colorCtrlPoint.forEach(d=>fun.addRGBPoint(d[0], d[1], d[2], d[3]));
            return fun;
        }
    
        function newOpacityFunction() {
            let fun = vtk.Common.DataModel.vtkPiecewiseFunction.newInstance();
            vis.opaCtrlPoint.forEach(d=>fun.addPoint(d[0], d[1]*vis.opacityFactor));
            return fun;
        }
        property.setRGBTransferFunction(0, newColorFunction());
        property.setScalarOpacity(0, newOpacityFunction());
        property.setScalarOpacityUnitDistance(0, 1.732050807568877);
    }
}