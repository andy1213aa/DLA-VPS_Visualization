

let umapSVG = d3
    .select('#umapPlot')
    .call(responsivefy);

let tooltip = umapSVG
        .append('g')
        .classed('tool-tip', true)
let tooltipWidth =  d3.select("#umapPlot").attr('width') / 3
let tooltipHeight =  d3.select("#umapPlot").attr('height') / 2

tooltip
    .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', tooltipHeight)
        .attr('width', tooltipWidth)
        .style('fill', 'green')
        .style('fill-opacity', 0.1)
        .attr('display', 'none')



tooltip
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

tooltip
    .selectAll('.value')
    .data(new Array(3))
    .enter()
    .append('text')
    .classed('value', true)
    .attr('x', 80)
    .attr('y', (d, i)=>{
        return (i+1)*20+10
    })
    
    .attr('display', 'none');



function drawUMAP(enterData) {

    data = d3.selectAll(".pie").data().concat(enterData)

    // data.forEach((member, i) => {
    //     if ('originX' in member == false || 'originY' in member == false) {
    //         member['originX'] = member['x']
    //         member['originY'] = member['y']
    //     }
    //     else {
         
    //         member['x'] = member['originX']
    //         member['y'] = member['originY']
           
    //     }
    // })

    xMax = 15.93244//d3.max(data, d => d['positionX'])
    xMin = -6.96694 //d3.min(data, d => d['positionX'])

    yMax = 20.11685 // d3.max(data, d => d['positionY'])
    yMin = -4.22038 // d3.min(data, d => d['positionY'])

    // Add X axis
    let x = d3.scaleLinear()
        .domain([xMin - 5, xMax + 5])
        .range([0, d3.select("#umapPlot").attr('width')]);
    // Add Y axis
    let y = d3.scaleLinear()
        .domain([yMin - 5, yMax + 5])
        .range([d3.select("#umapPlot").attr('height'), 0]);
   

    let pie = d3.pie();
    let pieRadius = d3.arc()
        .innerRadius(0)
        .outerRadius(8);

    let pieRadiusHover = d3.arc()
        .innerRadius(0)
        .outerRadius(70);

    pieChart = umapSVG
        .selectAll(".pie")
        .data(data)

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
        .on('mouseover', function(d, i){
            sunburstUI.hightlightOne(this, {'OmM': d.OmM, 'OmB': d.OmB, 'h': d.h}, d3.rgb(0, 0, 0))
            //Can not change attribute "d" after clone, so we modify "d" befor clone
            //and set display to none.
      
            let hoverPie = d3.select(this)
                .classed('hover', true)
                .attr('display', 'none')
            
            hoverPie.selectAll('path')
                .attr('d', pieRadiusHover)

            tooltip
                .append(function(){
                    
                    let clonehoverPie = hoverPie
                        .clone(true)
                            .attr('transform', `translate(${tooltipWidth/2}, ${(tooltipHeight/3)*2})`)
                            .attr('display', null)

                    return clonehoverPie.node();
            
                })
            hoverPie
                .attr('display', null)
                .selectAll('path')
                .attr('d', pieRadius)

            umapSVG.selectAll(".pie:not(.hover)")
                .selectAll('path')
                    .attr('fill-opacity', 0.2)
                    .attr('stroke-opacity', 0.2)


            tooltip.attr('transform', () =>{
                let mouseX = d3.mouse(umapSVG.node())[0];
                let mouseY = d3.mouse(umapSVG.node())[1];
                let tooltipX;
                let tooltipY;
                if (mouseX >= umapSVG.attr('width')/2){
                    if (mouseY >= umapSVG.attr('height')/2){
                        tooltipX = mouseX - tooltipWidth;
                        tooltipY = mouseY - tooltipHeight;
                    }
                    else{
                        tooltipX = mouseX - tooltipWidth;
                        tooltipY = mouseY - 5;
                    }
                }
                else{
                    if (mouseY >= umapSVG.attr('height')/2){
                        tooltipX = mouseX + 5;
                        tooltipY = mouseY - tooltipHeight;
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

            tooltip
                .selectAll('text')
                .attr('display', null)

            tooltip
                .selectAll('.value')
                .text((d, i)=>{
                    let variable = ['OmM', 'OmB', 'h'];
                    return `: ${hoverPie.data()[0][variable[i]].toFixed(4)}`
                })
                
                
                    

        })
        .on('mouseleave', function(){
            sunburstUI.unhightlightOne(this, {})
            d3.select(this)
                .selectAll('path')
                .attr('d', pieRadius)

            umapSVG.selectAll('.pie')
                .classed('hover', false)
                .selectAll('path')
                .attr('fill-opacity', 1)
                .attr('stroke-opacity', 1);

            tooltip
                .select('rect')
                .attr('display', 'none')

            tooltip
                .selectAll('.pie')
                .remove()

            tooltip
                .selectAll('text')
                .attr('display', 'none')
        })

    
    

    let simulation = d3.forceSimulation(data);

    simulation.force("collide", d3.forceCollide(d => 8)); // Force that avoids circle overlapping
    simulation.force("x", d3.forceX(d => x(d['positionX']))); // Each point attacted to its center x and y
    simulation.force("y", d3.forceY(d => y(d['positionY'])));

    simulation
        .on("tick", function () {
            pieChartUpdate
                .attr("transform", d => `translate(${d.x}, ${d.y})`);
        })

 
    
}



d3.select('#circleData')
    .on('click', function () {
        if (this.checked) {
            umapSVG.call(lassoActivate(d3.selectAll('.pie'), umapSVG));
        }
        else{
            umapSVG.on(".dragstart", null);
            umapSVG.on(".drag", null);
            umapSVG.on(".dragend", null);

            umapSVG
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
                        // minMax = [d3.min(vtkVolume), d3.max(vtkVolume)]
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
                    // rw.render();
                }
                else{
                    let renderer = vtkRenderer.newInstance({ background: [51/255, 77/255, 70/255] })
                
                    rw.addRenderer(renderer)

                    renderer.setViewport(0, 0, 1, 1)
                    camera = renderer.getActiveCamera()
                    camera.elevation(30)


                    actor = setActor(vtkVolume)       

                    renderer.addActor(actor)
                    renderer.resetCamera()
                    minMax = [d3.min(vtkVolume), d3.max(vtkVolume)]
                    transferfunctionMinMwx = minMax
                    maxScientificNotation = Math.floor(Math.log10(Math.abs(d3.max(vtkVolume))))  
                    vtkVolume = vtkVolume.map(d => d/(10**maxScientificNotation))
                    const tfUI = new VTKjsTrasnferFunctionInterface("#transferFunction", d3.select('.vtkView').style('width').slice(0, 3), transferFunctionHeight, 0.8, renderWindows['view3d'].render, actor.getProperty, [transferfunctionMinMwx[0]/(10**maxScientificNotation), transferfunctionMinMwx[1]/(10**maxScientificNotation)], null, 10, d3.interpolateRdBu, true, 10**maxScientificNotation);
                    // rw.render()
                }
                // $('#switchRnederIso').val('rendering');
                // d3.select('.contour')
                //     .style('display', 'none')
                // d3.select('.rendering')
                //     .style('display', null)
                
                

            })
        }
    })



// drawUMAP(tsneAndLatentVector)

