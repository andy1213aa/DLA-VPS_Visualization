d3.select('.candidate-button')
    .select('#ClearAll')
    .on('click', () => {
        projectionViewInterface.firedMember()
        d3.select('#condadidateBody')
            .selectAll('tr')
            .remove()
        d3.selectAll('.pie')
            .remove()

        var fullScreenRenderer = renderWindows['view3d'];

        fullScreenRenderer.getRenderers().forEach(d=>{
            fullScreenRenderer.removeRenderer(d)
        })
        renderer = vtkRenderer.newInstance({ background: [51/255, 77/255, 70/255] })
        
        fullScreenRenderer.addRenderer(renderer)

        camera = renderer.getActiveCamera()
        // camera.elevation(30)
        renderer.resetCamera()
        fullScreenRenderer.render()
        sunburstUI.unhightlight(this, []);
        
    })
d3.select('.candidate-button')
    .select('#Run')
    .on('click', () => {

        let parameterName = []
        d3.select('#condadidateHead')
            .selectAll('th')
            .each(function(){
                parameterName.push(d3.select(this)
                    .text())
            })
       
        let members = [];
        let rows = d3.select('#condadidateBody')
            .selectAll('tr')
            .each(function () {
                let member = {}
                d3.select(this)
                    .selectAll('td')
                    .each(function (d, i) {
                        member[parameterName[i]] = +d3.select(this).text()
                        // member.push(+d3.select(this).text())

                    })
                members.push(member)
            })
        
        let candidateData = getRequest("/runCandidate", {"members": members})['data'];
        projectionViewInterface.registMember(candidateData);
        sunburstUI.setVisitedSubspace(candidateData);
        // updateTreeColor(d3.select('#nodeGroup'))

    })

let tdHover = function(){
    
    d3.select('#condadidateBody')
    .selectAll('tr')
    .on('mouseover', d=>{
        
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
    })
    .on('mouseleave', d=>{
        
        d3.select('#umapPlot')
            .selectAll('.hover')
            .selectAll('path')
            .attr('d', d3.arc().innerRadius(0).outerRadius(8))
            .classed('hover', false)

    })
}

d3.select('.candidate-button')
    .select('#keyIN')
    .on('click', () => {
        let keyInBlock = d3.select('#condadidateBody')
            .append('tr')
            .attr('id', 'keyInTemp')
            .selectAll('td')
            .data(new Array(4))
            .enter()
            .append('td')

        let inputBlock = keyInBlock
            .selectAll('input')
            .data([1])
            .enter()
            .append('input')
            .style('width', '50px')
        
        inputBlock.on("keypress", function (d) {
            if (d3.event.keyCode === 13) {
                let tmp = []
                keyInBlock.selectAll('input').each(function(){
                    tmp.push(+this.value)
                })
                sunburstUI.setVisitedSubspace([{'OmM': tmp[1], 'OmB': tmp[2], 'h': tmp[3]}]);

                let newInPara = [{'ID': tmp[0], 'OmM': tmp[1], 'OmB': tmp[2], 'h': tmp[3]}];

                d3.select('#keyInTemp').remove();
                drawTable(newInPara);

                let newData = getRequest("/runCandidate", {"members": newInPara})['data'];
                projectionView.registMember(newData)
            }
        })

        tdHover()
    })

let click2RunVolume = function () {
    d3.select('#condadidateBody')
        .selectAll('tr')
        .classed('renderingTarget', false)
        .on('click', function(d){
            // reset All tr to be unselected
            d3.selectAll('.renderingTarget')
                .classed('renderingTarget', false)
            //-------------------------------

            d3.select(this).classed('renderingTarget', true);
            let variableName = d3.select(".variableSelector").node().value; 
            
            let vtkVolume = getRequest('/getData', {'variable': variableName, 'data': [d]})['data'];


            var rw = renderWindows['view3d'];
            
            if (rw.getRenderers().length != 0){
                renderer = rw.getRenderers()[0]
                renderer.removeAllVolumes()
            
                actor = setActor(vtkVolume)       

                renderer.addActor(actor)
                renderer.resetCamera() 
                // rw.render()
            }
            else{
                renderer = vtkRenderer.newInstance({ background: [51/255, 77/255, 70/255] })
            
                rw.addRenderer(renderer)

                renderer.setViewport(0, 0, 1, 1)
                camera = renderer.getActiveCamera()
                camera.elevation(30)


                actor = setActor(vtkVolume)       

                renderer.addActor(actor)
                renderer.resetCamera()

                // rw.render()
            }

            //transfer function
            $('#switchRnederIso').val('rendering');
                d3.select('.contour')
                    .style('display', 'none')
                d3.select('.rendering')
                    .style('display', null)

            maxScientificNotation = Math.floor(Math.log10(Math.abs(d3.max(vtkVolume))))  
            vtkVolume = vtkVolume.map(d => d/(10**maxScientificNotation))
            minMax = [d3.min(vtkVolume), d3.max(vtkVolume)]
            const tfUI = new VTKjsTrasnferFunctionInterface("#transferFunction", d3.select('.vtkView').style('width').slice(0, 3), transferFunctionHeight, 0.8, renderWindows['view3d'].render, actor.getProperty, minMax, null, 10, d3.interpolateRdBu, true, 10**maxScientificNotation);
        })
}


function readURL(input) {
    let inputParameter;
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {

            inputParameter = e.target.result.split('\r\n')//.replace(/(?:\r\n|\r|\n)/g, ' ');
            let keyVariable = inputParameter[0].split(" ");
            let valueCandidate = [];
            
            inputParameter.slice(1).forEach((d,i) =>{
                let valueTmp = d.split(" ");
                let candidateTmp = {}

                keyVariable.forEach((d, i)=>{
                    candidateTmp[d] = +((+valueTmp[i]).toFixed(4))
                })
                valueCandidate.push(candidateTmp)
            })
          
            drawTable(valueCandidate)
            tdHover()
            

            click2RunVolume()
            
        }

        reader.readAsText(input.files[0], "utf-8");

    }

}

$("#inputFile").change(function () {
    readURL(this);
});


function refreshTable(selectedItem) {   
    tmpSelect = []
    selectedItem.forEach(d=>{
        tmpSelect.push([d.OmM, d.OmB, d.h])
    })
    d3.select('#condadidateBody')
        .selectAll('tr')
        .classed('tableselected', false)
        .filter(d => {
            let tmpRow = [d.OmM, d.OmB, d.h]
            if (d3.set(tmpSelect).has(tmpRow)){
                return true
            }
            return false
        })
        .classed('tableselected', true)
}

function drawTable(members){
    let data = d3.select('#condadidateBody')
        .selectAll('tr').data()

    if (!("ID" in members[0])){
   
        let maxID = 0;
        if (data.length > 0){maxID = data.length-1}
        members.forEach((d,i)=>{
            d['ID'] = maxID + 1 + i;

        })
    }
    
    let concatData = data.concat(members)

    let  eachRow= d3.select('#condadidateBody')
        .selectAll('tr')
        .data(concatData)

    let eachRowEnter = eachRow
        .enter()
        .append('tr')

    let eachData = eachRowEnter.merge(eachRow)
        .selectAll('td')
        .data((d)=>{
            return [+d.ID, +(d.OmM.toFixed(4)), +(d.OmB).toFixed(4), +(d.h).toFixed(4)];
        })

    let eachDataEnter = eachData
        .enter()
        .append('td')

    eachDataEnter.merge(eachData)
    
        .text(d => d)

    let eachRowExit = eachRow.exit().remove()

    refreshTable(d3.selectAll(".pieSelected").data())
    click2RunVolume()
 
}

d3.select('#condadidateHead')
    .selectAll('th')
    .on('click', function(d){
        let tmpSortKey = d3.select(this).text()
        let tmpAllMember = d3.selectAll('#condadidateBody tr')
            .data()
        tmpAllMember.sort(function(x, y){
            return d3.ascending(+x[tmpSortKey], +y[tmpSortKey])
        })
       
        d3.select('#condadidateBody')
            .selectAll('tr')
            .remove()
        drawTable(tmpAllMember)
        tdHover()
        refreshTable(selectItem);
    })
