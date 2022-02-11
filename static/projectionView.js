class projectionView{

    constructor(_parentElementID){
        // this.xExtend = _xExtend;
        // this.yExtend = _yExtend;
        this.register = []
        this.umapSVG = d3.select(_parentElementID).call(responsivefy);
        this.svgWidth = d3.select(_parentElementID).attr('width')
        this.svgHeight = d3.select(_parentElementID).attr('height')
        this.tooltip = d3.select(_parentElementID).append('g').classed('tool-tip', true)
        this.tooltipWidth = this.umapSVG.attr('width') / 3
        this.tooltipHeight = this.umapSVG .attr('height') / 2

        this.tooltip
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', this.tooltipHeight)
            .attr('width', this.tooltipWidth)
            .style('fill', 'green')
            .style('fill-opacity', 0.1)
            .attr('display', 'none')

        this.tooltip
            .selectAll('text')
            .data(['OmM', 'OmB', 'h'])
            .enter()
            .append('text')
            .attr('x', 40)
            .attr('y', (d, i)=>{
                return (i+1)*20+10
            })
            .text(d=>d)
            .attr('text-anchor', 'middle')
            .attr('display', 'none');

        this.tooltip
            .selectAll('.value')
            .data(new Array(3))
            .enter()
            .append('text')
            .classed('value', true)
            .attr('x', 80)
            .attr('y', (d, i)=>{
                return (i+1)*20+10})
            .attr('display', 'none');
    }
    
    registMember(newData){
        const vis = this;
        vis.register = vis.register.concat(newData);
        drawUmap();
        clickEvent();
       
        function drawUmap(){
            let xMax = 15.93244//d3.max(data, d => d['positionX'])
            let xMin = -6.96694 //d3.min(data, d => d['positionX'])
    
            let yMax = 20.11685 // d3.max(data, d => d['positionY'])
            let yMin = -4.22038 // d3.min(data, d => d['positionY'])
    
            // Add X axis
            let x = d3.scaleLinear()
                .domain([xMin - 1, xMax + 1])
                .range([0, vis.svgWidth]);
            // Add Y axis
            let y = d3.scaleLinear()
                .domain([yMin - 1, yMax + 1])
                .range([vis.svgHeight, 0]);
        
    
            let pie = d3.pie();
    
            let pieRadius = d3.arc()
                .innerRadius(0)
                .outerRadius(8);
    
            let pieRadiusHover = d3.arc()
                .innerRadius(0)
                .outerRadius(70);
    
            let pieChart = vis.umapSVG
                .selectAll(".pie")
                .data(vis.register)
            
            let pieChartEnter = pieChart
                .enter()
                .append("g")
                .classed('pie', true)
                .each(function (d) {
                    let tmp = d3.select(this);
                    if (d['state'] === 0) {
                        tmp.classed('test', true)
                    }
                    else {
                        tmp.classed('candidate', true)
                    }
                });
            
            let pieChartUpdate = pieChartEnter.merge(pieChart);
            let pieChartExit = pieChart.exit().remove();
    
            pieChartEnter.attr("transform", d => `translate(${x(d['positionX'])}, ${y(d['positionY'])})`);
    
            let arc = pieChartEnter
                .selectAll('g')
                .data(pie(new Array(7).fill(1)))
                .enter()
                .append("g")
                
            arc
                .append("path")
                .attr('stroke', 'black')
                .attr('stroke-width', 0.3)
                .attr("class", (d, i) => `${allVariable[i]}PieChart`)
                .attr('fill', 'rgb(200, 200, 200)')
                .attr('d', pieRadius);
        
            pieChartUpdate
                .on('mouseover', pieTooltipMouseover)
                .on('mouseleave', pieTooltipMouseleave)
    
            let simulation = d3.forceSimulation(vis.register);
    
            simulation.force("collide", d3.forceCollide(d => 9)); // Force that avoids circle overlapping
            simulation.force("x", d3.forceX(d => x(d['positionX']))); // Each point attacted to its center x and y
            simulation.force("y", d3.forceY(d => y(d['positionY'])));
    
            simulation
                .on("tick", function () {
                    pieChartUpdate
                        .attr("transform", d => `translate(${d.x}, ${d.y})`);
                })
    
            function pieTooltipMouseover (d, i){
                sunburstUI.hightlightOne(this, {'OmM': d.OmM, 'OmB': d.OmB, 'h': d.h}, d3.rgb(0, 0, 0))
                    //Can not change attribute "d" after clone, so we modify "d" befor clone
                    //and set display to none.
                
                let hoverPie = d3.select(this)
                    .classed('hover', true)
                    .attr('display', 'none')
                
                hoverPie.selectAll('path')
                    .attr('d', pieRadiusHover)
    
                vis.tooltip
                    .append(function(){
                        
                        let clonehoverPie = hoverPie
                            .clone(true)
                                .attr('transform', `translate(${vis.tooltipWidth/2}, ${(vis.tooltipHeight/3)*2})`)
                                .attr('display', null)
    
                        return clonehoverPie.node();
                    })
                hoverPie
                    .attr('display', null)
                    .selectAll('path')
                    .attr('d', pieRadius)
    
                vis.umapSVG.selectAll(".pie:not(.hover)")
                    .selectAll('path')
                        .attr('fill-opacity', 0.2)
                        .attr('stroke-opacity', 0.2)
    
    
                vis.tooltip.attr('transform', () =>{
                    let mouseX = d3.mouse(vis.umapSVG.node())[0];
                    let mouseY = d3.mouse(vis.umapSVG.node())[1];
                    let tooltipX;
                    let tooltipY;
                    if (mouseX >= vis.umapSVG.attr('width')/2){
                        if (mouseY >= vis.umapSVG.attr('height')/2){
                            tooltipX = mouseX - vis.tooltipWidth;
                            tooltipY = mouseY - vis.tooltipHeight;
                        }
                        else{
                            tooltipX = mouseX - vis.tooltipWidth;
                            tooltipY = mouseY - 5;
                        }
                    }
                    else{
                        if (mouseY >= vis.umapSVG.attr('height')/2){
                            tooltipX = mouseX + 5;
                            tooltipY = mouseY - vis.tooltipHeight;
                        }
                        else{
                            tooltipX = mouseX +5;
                            tooltipY = mouseY +5;
                        }
                    }
                    return `translate( ${tooltipX} , ${tooltipY} )`;
                }
                )
                    .select('rect')
                    .attr('display', null)
    
                vis.tooltip
                    .selectAll('text')
                    .attr('display', null)
    
                vis.tooltip
                    .selectAll('.value')
                    .text((d, i)=>{
                        let variable = ['OmM', 'OmB', 'h'];
                        return `: ${hoverPie.data()[0][variable[i]].toFixed(4)}`
                    })   
    
            }    
            function pieTooltipMouseleave(){
                sunburstUI.unhightlightOne(this, {})
                    d3.select(this)
                        .selectAll('path')
                        .attr('d', pieRadius)
    
                    vis.umapSVG.selectAll('.pie')
                        .classed('hover', false)
                        .selectAll('path')
                        .attr('fill-opacity', 1)
                        .attr('stroke-opacity', 1);
    
                    vis.tooltip
                        .select('rect')
                        .attr('display', 'none')
    
                    vis.tooltip
                        .selectAll('.pie')
                        .remove()
    
                    vis.tooltip
                        .selectAll('text')
                        .attr('display', 'none')
            }
    
        }
        function clickEvent(){
            d3.select('#circleData')
                .on('click', function () {
                if (this.checked) {
                    vis.umapSVG.call(lassoActivate(vis.umapSVG.selectAll('.pie'), vis.umapSVG));
                }
                else{
                    vis.umapSVG.on(".dragstart", null);
                    vis.umapSVG.on(".drag", null);
                    vis.umapSVG.on(".dragend", null);
    
                    
                }
            })
            vis.umapSVG
                        .selectAll('.pie')
                        .on('click', function(d){
                        
                        // reset All tr to be unselected
                        d3.selectAll('.renderingTarget')
                            .classed('renderingTarget', false);
                        //-------------------------------
    
                        d3.select(this).classed('renderingTarget', true);
                        let variableName = d3.select(".variableSelector").node().value; 
                        
                        let vtkVolume = getRequest('/getData', {'variable': variableName, 'data': [d]})['data'];
                    
                        
                        var rw = renderWindows['view3d'];
                        if (rw.getRenderers().length != 0){
                            let renderSelect = d3.select("#switchRnederIso").node().value;
                            if (renderSelect == 'rendering'){
                                let renderer = rw.getRenderers()[0];
                                renderer.removeAllVolumes();
                                renderer.removeAllActors();
                                actor = setActor(vtkVolume);       
                
                                renderer.addActor(actor);
                                renderer.resetCamera();
                                maxScientificNotation = Math.floor(Math.log10(Math.abs(transferfunctionMinMwx[1])))  
                                vtkVolume = vtkVolume.map(d => d/(10**maxScientificNotation))
                                const tfUI = new VTKjsTrasnferFunctionInterface("#transferFunction", d3.select('.vtkView').style('width').slice(0, 3), transferFunctionHeight, 0.8, renderWindows['view3d'].render, actor.getProperty, [transferfunctionMinMwx[0]/(10**maxScientificNotation), transferfunctionMinMwx[1]/(10**maxScientificNotation)], null, 10, d3.interpolateRdBu, true, 10**maxScientificNotation);
                            }
                            else if (renderSelect == 'contour'){
    
                                minMax = [d3.min(vtkVolume), d3.max(vtkVolume)]
                                let svg = d3.select('.contour')
                                    .select('svg')
                                svg.html("");
    
                                svg.append('text')
                                    .attr('id', 'isoValu')
                                    .attr('transform', 'translate(30,60)')
                                    .text(currentIsovalue.toExponential(4))
                                    .style('font-size', '38px')
                                    
                                let slider = d3.sliderHorizontal()
                                    .min(minMax[0])
                                    .max(minMax[1])
                                    .tickFormat(d3.format('.2e'))
                                    .width(d3.select('.vtkView').style('width').slice(0, 3)-70)
                                    .default(currentIsovalue)
                                    .displayValue(false)
                                
                                svg.append('g')
                                    .attr('transform', 'translate(35,110)')
                                    .call(slider);
    
                                isoValue(vtkVolume, slider);
                                
                            }
                        }
                        else{
                            let renderer = vtkRenderer.newInstance({ background: [51/255, 77/255, 70/255] })
                        
                            rw.addRenderer(renderer)
    
                            renderer.setViewport(0, 0, 1, 1)
                            let camera = renderer.getActiveCamera()
                            camera.elevation(30)
    
    
                            let actor = setActor(vtkVolume)       
    
                            renderer.addActor(actor)
                            renderer.resetCamera()
                            let minMax = [d3.min(vtkVolume), d3.max(vtkVolume)]
                            transferfunctionMinMwx = minMax
                            maxScientificNotation = Math.floor(Math.log10(Math.abs(d3.max(vtkVolume))))  
                            vtkVolume = vtkVolume.map(d => d/(10**maxScientificNotation))
                            const tfUI = new VTKjsTrasnferFunctionInterface("#transferFunction", d3.select('.vtkView').style('width').slice(0, 3), transferFunctionHeight, 0.8, renderWindows['view3d'].render, actor.getProperty, [transferfunctionMinMwx[0]/(10**maxScientificNotation), transferfunctionMinMwx[1]/(10**maxScientificNotation)], null, 10, d3.interpolateRdBu, true, 10**maxScientificNotation);
                        }
                        
    
                    })
            function lassoActivate(data, area) {
                // Lasso functions
                let lasso_start = function() {
                    
                    lasso.items()
                        .classed("not_possible", true)
                        .classed("pieSelected", false);
            
                    d3.select('#nodeGroup')
                        .selectAll('.node')
                        .selectAll('rect')
                        .classed('nodeSelected', false);
            
                };
            
                let lasso_draw = function() {
            
                    // Style the possible dots
                    lasso.possibleItems()
                        .classed("not_possible", false)
                        .classed("possible", true);
            
            
                    // Style the not possible dot
                    lasso.notPossibleItems()
                        .classed("not_possible", true)
                        .classed("possible", false);
                };
            
                let lasso_end = function() {
                    // Reset the color of all dots
                    lasso.items()
                        .classed("not_possible", false)
                        .classed("possible", false);
            
                    // Style the selected dots
                    lasso.selectedItems()
                        .classed("pieSelected", true)
            
                    // Reset the style of the not selected dots
                    lasso.notSelectedItems()
                        .classed('unselected', true)
            
                    sunburstUI.unhightlight(this, []);
                    let selectItem = _.map(d3.selectAll(".pieSelected").data(), function(o) { return _.pick(o, 'OmM','OmB', 'h'); });
                    
                    sunburstUI.hightlight(this, selectItem, d3.rgb(255, 128, 128) );
            
                        // selectData = getRequest("/modelWork", {"question": 'getData', "data": selectItem})['data']
                    let drawL2color = function(variable, allL2) {
                        let variableLatentVector = d3.selectAll(".pieSelected").data();
            
                        if (variableLatentVector.length == 0) {
                            d3.selectAll(`.${variable}PieChart`)
                                .attr('fill', d3.rgb(200, 200, 200));
                            return
                        } else {
                            
                            let L2norm = allL2[variable]
                            let L2_2_color = d3.scaleLinear()
                                .domain([d3.min(L2norm), d3.max(L2norm)])
                                .range([0, 1]);
            
                            d3.selectAll(`.${variable}PieChart`)
                                .attr('fill', (d, i) => variable2color[variable](L2_2_color(L2norm[i])))
                        }
                    }
            
                    allVariable.forEach(vari => {
                        let allL2 = getRequest("/L2Calculate", { "selectParameter": d3.selectAll(".pieSelected").data(), 'variable': vari, 'totalParameter': d3.selectAll(".pie").data()});
                        drawL2color(vari, allL2);
                    });
                    refreshTable(selectItem);
                };
                
                let lasso = d3.lasso()
                        .closePathSelect(true)
                        .closePathDistance(100)
                        .items(data)
                        .targetArea(area)
                        .on("start", lasso_start)
                        .on("draw", lasso_draw)
                        .on("end", lasso_end);
                return lasso
            }
        }
    }
    firedMember(){
        this.register=[]
    }
}