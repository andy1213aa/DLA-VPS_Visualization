d3.select('#comparisonView')
    .selectAll('svg') //there are eight svgs inside the div '#comparisonView'.
    .style('background-color', '#FFFACD')
    .call(responsivefy)  //viewbox

function drawDataStripes(selected){

   //----- Save their original order for later sorting.
   selected.forEach((d, i)=>{
    if (!('order' in d)){
        d['order'] = i;
    }
    })
    //------------------------------------
    /*
    [    {
            OmB: 0.05629
            OmM: 0.35039
            block0: 7512899447.5
            block1: 7278210037.875
            block2: 7046811217.1875
            block3: 7480154822.75
            block4: 6827010222              ------> member 1
            block5: 6306549781.3125
            block6: 6316711531.5625
            block7: 6440574679.8125
            h: 0.63154
            order: 0
        }, 

        {
            OmB: 0.04228
            OmM: 0.23868
            block0: 8314946330.125
            block1: 8052094509.375
            block2: 7790641612.875
            block3: 8275331116.5625         ------> member 2
            block4: 7548837472.0625
            block5: 6974030524.5
            block6: 6977874610.0625
            block7: 7116187823.875
            h: 0.76119
            order: 1
        }

        ...

    ]
    */
    console.log(selected);
    let scaleY = d3.scaleBand()
        .domain(d3.keys(selected).map(Number))
        .range([0, +d3.select('#block1').attr('height')-50]);   // There are eight svgs  with same height, so random choose one of those svgs as the height value. (25 for axis)
    
    // v----------------- There must be an elegant way to get total max and total min 5/14
    let blockID = [...Array(8).keys()]
    let tmpMax = []
    let tmpMin = []
    blockID.forEach((d, i)=>{
        tmpMax.push(d3.max(selected, d=>d[`block${i}`]))
        tmpMin.push(d3.min(selected, d=>d[`block${i}`]))
    })
    let totalMax = d3.max(tmpMax)
    let totalMin = d3.min(tmpMin)
    // ^-----------------------------------------------------------------------------------

    let colormapping = d3.scaleLinear()
        .domain([totalMin, totalMax])
        .range([0, 1])

    
    // save each scalelinear of X-axis
    // It may look like {block1: f, block2: f, ...}
    let scaleX = {}
    new Array(8).fill(1).forEach((d,i)=>{
        
        let maxValue = d3.max(selected, d => d[`block${i}`])
        let minValue = d3.min(selected, d => d[`block${i}`])

        let tmpScaleX = d3.scaleLinear()
            .domain([minValue, maxValue])
            .range([1, +d3.select('#block1').attr('width')-15])

        scaleX[`block${i}`] = tmpScaleX
    })

    /* Initialize tooltip */
    tip = d3.tip()
        .attr('class', 'd3-tip')
        .html(function(d) { return `OmM: ${d.OmM}, OmB: ${d.OmB}, h: ${d.h}`});


    /* Invoke the tip in the context of your visualization */
    d3.selectAll('.dataStripes')
        .call(tip)

   
    bar = d3.selectAll('.dataStripes')  // i.e. eight svgs
        .datum(selected) 
        .selectAll('rect')
        .data((d, i)=>{
            return d.map(d=>{return {'value': d[`block${i}`], 'order':d['order'], 'OmM':d['OmM'], 'OmB': d['OmB'], 'h': d['h']}}) 
        }) 
    
    let barEnter = bar.enter()
        .append('rect')

    let barUpdate = barEnter.merge(bar)
    
    
    barUpdate
        .attr('y', (d, i)=>scaleY(d['order']))
        .style('margin', '0.5px')
        .attr('height', ()=>{
            if (scaleY.bandwidth() > +d3.select('#block1').attr('height')/20)
                return +d3.select('#block1').attr('height')/20
            else
                return scaleY.bandwidth()
        })
        .attr('x', 0)
        .on('mouseover', function(d){
            let filter = d3.select('#umapPlot')
                .selectAll('.pie')
                .filter(pieData=>{
                    return d['OmM'] == pieData['OmM'] && d['OmB'] == pieData['OmB'] && d['h'] == pieData['h']
                })
                .classed('hover', true)

            filter
                .raise()
                .selectAll('path')
                .attr('d', d3.arc().innerRadius(0).outerRadius(50))
            
            tip.show(d)
            sunburstUI.hightlightOne(this, {'OmM': d.OmM, 'OmB': d.OmB, 'h': d.h}, d3.rgb(0, 0, 0))
        })
        .on('mouseout', function(d){
            d3.select('#umapPlot')
                .selectAll('.hover')
                .selectAll('path')
                .attr('d', d3.arc().innerRadius(0).outerRadius(8))
                .classed('hover', false)
            
            tip.hide(d)
            sunburstUI.unhightlightOne(this, {})
        })
        .transition(d3.transition().duration(800))
            .attr('width', function(d){
                return scaleX[d3.select(this.parentNode).attr('id')](d['value'])  // parentNode is the svg which id is blockX. For example, <svg id='block1'>, <svg id='block2'>
            })
            .style('fill', d => {
                return d3.interpolateBuPu(colormapping(d['value']))
            })

    let barExit = bar.exit().remove()

    //axis
    new Array(8).fill(1).forEach((d, i)=>{
  
        let xAxis = d3.axisBottom(scaleX[`block${i}`])
            .tickFormat(d3.format('.2e'))
            .ticks(3)
            .tickSize(5);
            
        d3.select(`#block${i}`)
            .selectAll('g')
            .remove()

        d3.select(`#block${i}`)
            .append('g')
            .attr('classed', 'dataStripesAxis')
            .attr('transform', `translate(0, 355)`)
            .call(xAxis)
            .selectAll('text')  
            .style('font-size', 9)
            .style("text-anchor", "end")
            // .attr("dx", "-.8em")
            // .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");
    })


    }

function sortHist(sortKey){

    // sortKey, such as 'block1', 'OmM', etc.
    let tmpSortData = d3.select(`.dataStripes`)
            .datum()

        tmpSortData
            .sort(function(x, y){
                return d3.ascending(x[sortKey], y[sortKey])
            })

        let SortScaleY = d3.scaleBand()
            .domain(tmpSortData.map(d=>d['order']))
            .range([0, +d3.select('#block1').attr('height')-50]); // There are eight svgs  with same height, so random choose one of those svgs as the height value.
    

        d3.selectAll('.dataStripes')
            .selectAll('rect')
            .transition(d3.transition().duration(800))
            .attr('y', d=>SortScaleY(d['order']))
}


d3.select('#OctTreeView')
    .selectAll('p')
    .on('click', function(){sortHist(d3.select(this).text())})
    // .on('mouseover', function(){
    //     block = d3.select(this).text()
    //     ID = block.charAt(block.length-1)
    //     divide = 2
    //     zmin = ( parseInt(ID / (divide*divide) ))
    //     zmax = ( parseInt(ID / (divide*divide) ) + 1) 

    //     ymin = ( parseInt((ID % (divide*divide)) / divide) )
    //     ymax = (parseInt((ID % (divide*divide)) / divide)) +1
        
    //     xmin = ((ID % (divide*divide)) % divide)
    //     xmax = ((ID % (divide*divide)) % divide)+1



    // })

    
d3.select('#comparisonViewOrder')
    .on('change', function(){    
        let parameter = d3.select("#comparisonViewOrder").node().value;
        console.log(parameter);
        sortHist(parameter);
    })

d3.select('#comparisonViewButton')
    .on('change', function(){    
        let statics = d3.select("#comparisonViewButton").node().value;
        let variableName = d3.select(".variableSelector").node().value; 
        let startPosition = [
            $( "#slider-range1" ).slider( "values", 0 ), 
            $( "#slider-range2" ).slider( "values", 0 ),
            $( "#slider-range3" ).slider( "values", 0 )
        ]
        let size = [
            $( "#slider-range1" ).slider( "values", 1 )+1, 
            $( "#slider-range2" ).slider( "values", 1 )+1, 
            $( "#slider-range3" ).slider( "values", 1 )+1
        ]
        divide = [
            ($( "#slider-range1" ).slider( "values", 1 ) - $( "#slider-range1" ).slider( "values", 0 ) +1)/2,
            ($( "#slider-range2" ).slider( "values", 1 ) - $( "#slider-range2" ).slider( "values", 0 ) +1)/2,
            ($( "#slider-range3" ).slider( "values", 1 ) - $( "#slider-range3" ).slider( "values", 0 ) +1)/2

        ]
        
        if (allParameters.includes(statics)) {
            let gradient = getRequest('/getSensitivity', {'variable': variableName, 'data': d3.selectAll(".tableselected").data(), 'divide':divide, 'size': size, 'startPosition' : startPosition})
            let barGradient = gradient['barGrad'].map(d =>{
                return d[statics]
            })
            drawDataStripes(barGradient)
        }
        else{
            drawDataStripes(getRequest('/calculateBlock', {'variable': variableName, 'data': d3.selectAll(".tableselected").data(), 'divide':divide, 'statistics': statics, 'size': size, 'startPosition' : startPosition})['hist'])
        }
        
    })
// d3.select('#comparisonViewButton')
//     .selectAll('button') //The button here is 'mean' and 'variance'
//     .on('click', function(d){
//         let statics = d3.select(this).text()
//         let variableName = d3.select(".variableSelector").node().value;
        
//         //v--It should add some button for the users to choose the startPosition and the size, but not implement yet.
//         let startPosition = [0, 0, 0]
//         let size = [64, 64, 64]
//         //^----------------------------------------

//         drawDataStripes(getRequest('/calculateBlock', {'variable': variableName, 'data': d3.selectAll(".tableselected").data(), 'divide':32, 'statistics': statics, 'size': size, 'startPosition' : startPosition})['hist'])
//     })

// Calculate the sensitivity.
d3.select('#sensitivitySelector')
    .on('change', function(){        
        let variableName = d3.select(".variableSelector").node().value; 
        let gradient = getRequest('/getSensitivity', {'data': d3.selectAll(".pieSelected").data(), 'divide':32, 'variable': variableName}) 
        let parameter = d3.select("#sensitivitySelector").node().value; 
        let barGradient = gradient['barGrad'].map(d =>{
            return d[parameter]
        })
        drawDataStripes(barGradient)
    })

// Draw the sub-volume they select on renderWindow.
d3.selectAll('.dataStripes')
    .on('click', function(d, i){
        var fullScreenRenderer = renderWindows['view3d'];
        let volumeRenderer = fullScreenRenderer.getRenderers()[0] //Get vtkVolume renderer
        if (volumeRenderer.getVolumes().length > 1)
            volumeRenderer.removeVolume(volumeRenderer.getVolumes()[1])
     
        let blockID = d3.select(this).attr('id').slice(d3.select(this).attr('id').length-1) // get blockID: int

        let startPosition = [
            $( "#slider-range1" ).slider( "values", 0 ), 
            $( "#slider-range2" ).slider( "values", 0 ),
            $( "#slider-range3" ).slider( "values", 0 )
        ]
        let size = [
            $( "#slider-range1" ).slider( "values", 1 )+1, 
            $( "#slider-range2" ).slider( "values", 1 )+1, 
            $( "#slider-range3" ).slider( "values", 1 )+1
        ]

        let interestingRegion = getRequest('/getVtkInterestingRegion', { 'divide':2, 'size':size, 'blockID': +blockID, 'startPosition': startPosition})['data'] 
        let interstActor = setInterestActor(interestingRegion)
        volumeRenderer.addActor(interstActor)
        volumeRenderer.resetCamera()
        fullScreenRenderer.render()
    })

// 時間不夠 暴力增加
$( function() {
    $( "#slider-range1" ).slider({
        range: true,
        min: 0,
        max: 63,
        values: [ 0, 63 ],
        slide: function( event, ui ) {
        $( "#xRange" ).val(ui.values[ 0 ] + " - " + ui.values[ 1 ] );
        }
    });
    $( "#xRange" ).val( $( "#slider-range1" ).slider( "values", 0 ) +
        " - " + $( "#slider-range1" ).slider( "values", 1 ) );
    } );

$( function() {
    $( "#slider-range2" ).slider({
        range: true,
        min: 0,
        max: 63,
        values: [ 0, 63 ],
        slide: function( event, ui ) {
        $( "#yRange" ).val(ui.values[ 0 ] + " - " + ui.values[ 1 ] );
        }
    });
    $( "#yRange" ).val( $( "#slider-range2" ).slider( "values", 0 ) +
        " - " + $( "#slider-range2" ).slider( "values", 1 ) );
    } );  

$( function() {
    $( "#slider-range3" ).slider({
        range: true,
        min: 0,
        max: 63,
        values: [ 0, 63],
        slide: function( event, ui ) {
        $( "#zRange" ).val(ui.values[ 0 ] + " - " + ui.values[ 1 ] );
        }
    });
    $( "#zRange" ).val( $( "#slider-range3" ).slider( "values", 0 ) +
        " - " + $( "#slider-range3" ).slider( "values", 1 ) );
    } );
//