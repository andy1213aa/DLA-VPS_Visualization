class SunburstParameterInterface
{
    static subSpaceData = [];

    // _parentElementID: ID (with #) of the html tag (usually a <div>) to contain this TF interface
    //_visWidth: width in pixel of this interface
    //_sunburstRadius: the sunburst radius
    //_parameterInfo: simulation parameter information, min max range and its name, colormap, number of intervals
    //                Example:  _parameterInfo = [{"start": 0, "end": 1, "name": "A", "intervals": 5, "colormap": d3.interpolateReds}, 
    //                                           {"start": 0.05, "end": 0.07, "name": "B", "intervals": 5, "colormap": d3.interpolateBlues}, 
    //                                             {"start": 1.8, "end": 2.5, "name": "C", "intervals": 5, "colormap": d3.interpolateGreens} ];
    //_headRatio: the ratio of head of each arc, example: 0.2
    //_selectArcEventFunc: invoke this function when user clicks on a arc
    constructor(_parentElementID, _visWidth, _sunburstRadius, _sunburstDataInfoRadius,
                _parameterInfo, _dataInfoNameColormap, _dataInfo,
                _headRatio, _selectArcEventFunc, _selectParaTextEventFunc){
        const vis = this;
        this.parentElementID = _parentElementID;
        this.svgWidth = _visWidth;
        this.sunburstRadius = _sunburstRadius;
        this.sunburstDataInfoRadius = _sunburstDataInfoRadius;
        this.parameterInfo = _parameterInfo;
        this.dataInfoNameColormap = _dataInfoNameColormap;
        this.dataInfo = _dataInfo;
        this.headRatio = _headRatio;
        this.selectArcEventFunc = _selectArcEventFunc;
        this.selectParaTextEventFunc = _selectParaTextEventFunc;

        this.selectedDataInfo = {...this.dataInfoNameColormap};
        Object.keys(this.selectedDataInfo).forEach(d=>this.selectedDataInfo[d]=true);
        this.enalbeDataInfo = [];
        Object.keys(this.selectedDataInfo).forEach(d=>{
            if( this.selectedDataInfo[d])this.enalbeDataInfo.push(d);
        });

        this.paraOrderForSubspace = [];
        this.parameterInfo.forEach(function(d,i){
            let dic = {};
            dic['name'] = d.name;
            dic['start'] = d.start;
            dic['nIntervals'] = d.subSpaceIntervals;
            dic['interval'] = (d.end - d.start) / d.subSpaceIntervals;
            vis.paraOrderForSubspace.push(dic);
        });
        
        SunburstParameterInterface.subSpaceData = [];
        SunburstParameterInterface.createSubspaceList(this.parameterInfo, {}, 0);
        SunburstParameterInterface.subSpaceData.forEach((d, i)=>d.dataInfo = this.dataInfo[i]); //merge SunburstParameterInterface.subSpaceData, this.dataInfo

        this.legendWholeWidth = this.sunburstRadius*2, 
        this.legendWholeHeight = 150;
        this.legendMargin = {top: 20, right: 10, bottom: 10, left: 10};
        this.legendWidth =  this.legendWholeWidth - this.legendMargin.left - this.legendMargin.right;
        this.legendHeight = this.legendWholeHeight - this.legendMargin.top - this.legendMargin.bottom;

        // this.svg = d3.select(this.parentElementID).append('g').append('svg').attr('width', this.svgWidth).attr('height', this.svgHeight);
        // this.legendG = this.svg.append('g').attr('transform', `translate(20, 20)` );
        // this.sunburstG = this.svg.append('g').attr('transform', `translate(${this.sunburstRadius}, ${this.sunburstRadius+this.legendWholeHeight})` );
        // this.textG = this.svg.append('g').attr('transform', `translate(0, ${this.sunburstRadius*2+this.legendWholeHeight + 30})` );
        this.tableLayout = d3.select(this.parentElementID).append('table')//.attr('border', 1);
        this.legendTr = this.tableLayout.append("tr");
        this.dataInfoSelectTable = this.tableLayout.append("tr").append("td").append("table")//.attr('border', 1);
        let currentTr;
        Object.keys(this.dataInfoNameColormap).forEach((d,i)=>{
            if( i% 5 == 0 )currentTr = this.dataInfoSelectTable.append("tr");
            let td = currentTr.append("td").attr('width', 100);
            let dataInfoSelection = td.append("input")
                        .attr("checked", true)
                        .attr("id", "CheckBox-"+d)
                        .attr("type", "checkbox");
            dataInfoSelection.on('click', clickCheckBox);
            td.append('text').text(" " + d);
        });

        function clickCheckBox(){
            let checkStatus = d3.select(this).property("checked");
            console.log( d3.select(this).attr("id"));
            let dataInfoName = d3.select(this).attr("id").split("-")[1];
            vis.selectedDataInfo[dataInfoName] = checkStatus;
            vis.enalbeDataInfo = [];
            Object.keys(vis.selectedDataInfo).forEach(d=>{
                if( vis.selectedDataInfo[d])vis.enalbeDataInfo.push(d);
            });
            vis.dataInfoG.selectAll("*").remove();
            vis.buildDataInfoAroundSunburst();
        }
        
        this.sunburstTr = this.tableLayout.append("tr");
        this.textTd = this.tableLayout.append("tr").append("td");
        this.legendG = this.legendTr.append('svg').attr('width', this.svgWidth).attr('height', this.legendWholeHeight).append('g').attr('transform', `translate(20, 20)` );;
        this.sunburstG = this.sunburstTr.append('svg').attr('width', this.svgWidth).attr('height', this.sunburstRadius*2+this.sunburstDataInfoRadius*2)
                                    .append('g').attr('transform', `translate(${this.sunburstRadius+this.sunburstDataInfoRadius}, ${this.sunburstRadius+this.sunburstDataInfoRadius})` );

        this.legendSubG = null;

        this.tableTdWidth = 70;
        this.ratioDatInfoRadius = 0.07;

        this.initVis();
    }

    static GetSubspaceSetting(_parameterInfo){
        SunburstParameterInterface.subSpaceData = [];
        SunburstParameterInterface.createSubspaceList(_parameterInfo, {}, 0);
        return SunburstParameterInterface.subSpaceData;
    }

    initVis(){
        const vis = this;
        
        this.buildLegent();
        this.buildSunburst(false);
        this.initTable();
    }

    buildLegent(){
        const vis = this;
        let legendWholeWidth = vis.legendWholeWidth;
        let legendWholeHeight = vis.legendWholeHeight;
        let legendMargin = vis.legendMargin;
        let legendWidth = vis.legendWidth;
        let legendHeight = vis.legendHeight;
        let paraNameWidth = 80;
        let colorSegmentWidth = 80;
        vis.colorSegmentHeight = 13;

        calculateColormapInfo();
        function calculateColormapInfo(){ //update information to draw color map legend into this.parameterInfo
            vis.parameterInfo.forEach(function(d, i){
                let paraInterval = (vis.parameterInfo[i].end - vis.parameterInfo[i].start) / vis.parameterInfo[i].intervals;
                let colorInterval = 1.0 / vis.parameterInfo[i].intervals;
                let paraColorMap = [];
                for( let k = 0; k < vis.parameterInfo[i].intervals; k++) paraColorMap.push([vis.parameterInfo[i].start + k*paraInterval, (k+1)*colorInterval ]);
                d['paraColorMap'] = paraColorMap;
            });
        }

        //add <g>s to contains legend for each parameters
        let legendTextYScaleBand = d3.scaleBand().domain(vis.parameterInfo.map(d=>d.name)).range([0, legendHeight]).paddingInner(0.1).paddingOuter(0.05);
        vis.legendSubG = vis.legendG.selectAll("g").data(vis.parameterInfo).enter().append("g").attr('transform', d=>`translate(0, ${legendTextYScaleBand(d.name)})` );

        //draw the text (parameter name) and arrows at the left hand side
        vis.legendSubG.selectAll("text").data(d=>[d.name]).enter().append("text").text(d=>d+":").attr("y", 18).attr('font-size', 15);
        vis.increaseButton = vis.legendSubG.selectAll(".increase").data(d=>[d.name]).enter().append("path").attr("d", d3.symbol().type(d3.symbolTriangle).size("80")()).attr("transform", "translate(25,-5), rotate(90)");
        vis.decreaseButton = vis.legendSubG.selectAll(".decrease").data(d=>[d.name]).enter().append("path").attr("d", d3.symbol().type(d3.symbolTriangle).size("80")()).attr("transform", "translate(10,-5), rotate(-90)");
        vis.increaseButton.on("click", d=>{
            let idx = vis.parameterInfo.findIndex(p=>p.name===d);
            vis.parameterInfo[idx].intervals ++;
            calculateColormapInfo();
            vis.buildSunburst( true );
            buiildColormapLegend();
        });
        vis.decreaseButton.on("click", d=>{
            let idx = vis.parameterInfo.findIndex(p=>p.name===d);
            vis.parameterInfo[idx].intervals --;
            calculateColormapInfo();
            vis.buildSunburst( true );
            buiildColormapLegend();
        });
       
        //add color maps
        buiildColormapLegend();
        function buiildColormapLegend(){
            //recalculate color map width (per segment)
            let maxInterval = vis.parameterInfo.reduce(function(acc, currentValue){
                if(currentValue.intervals > acc) return currentValue.intervals;
                return acc;
            }, 0);
            colorSegmentWidth = Math.floor( (vis.svgWidth - paraNameWidth ) / maxInterval );
            if( colorSegmentWidth > 80 )colorSegmentWidth = 80;
        
            //update color map rects
            let rects = vis.legendSubG.selectAll("rect").data(d=>d.paraColorMap.map(dd=>({'paraColorMap': dd, 'colormap':d.colormap, 'name': d.name})));
            rects.exit().remove();
            let rectsEnter = rects.enter().append('rect');
            rects = rects.merge(rectsEnter);
            rects.attr("width", colorSegmentWidth).attr("height", vis.colorSegmentHeight).attr("x", (d,i)=>i*colorSegmentWidth+paraNameWidth-20).attr("y", 0).attr('fill', d=>d.colormap(d.paraColorMap[1]));
        
            //update texts on the color map
            let texts = vis.legendSubG.selectAll(".legendParameterText").data(d=>
                {
                    let ret = d.paraColorMap.map(dd=>({'paraColorMap': dd, 'colormap':d.colormap}))
                    ret.push( {'paraColorMap': [2 * d.paraColorMap[d.paraColorMap.length-1][0] - d.paraColorMap[d.paraColorMap.length-2][0] , -1], 'colormap':d.colormap} )
                    return ret;
                }
            );
            texts.exit().remove();
            let textsEnter = texts.enter().append('text');
            texts = texts.merge(textsEnter);
            texts.attr("x", (d,i)=>i*colorSegmentWidth+paraNameWidth-15-20).attr("y", -2).text(d=>(d.paraColorMap[0].toFixed(3))).attr('font-size', 12).attr("class", "legendParameterText");
        }

        // add drag functions to enagle color map order dragging
        let drag = d3.drag().on("start", started).on("drag", dragged).on("end", end);
        let startMouseY, oldYTranslate, selectedParaName, paraNameList, paraNameListOld, oldIdx;
        function started(d){
            paraNameList = vis.parameterInfo.map(d=>d.name);
            paraNameListOld = vis.parameterInfo.map(d=>d.name);
            startMouseY = d3.event.y;
            oldYTranslate = parseFloat( d3.select(this).attr("transform").split(",")[1].split(")")[0] );
            selectedParaName = d3.select(this).data()[0].name;
            oldIdx = paraNameListOld.findIndex(d=>d===selectedParaName);
        }
        function dragged(d){
            let g = d3.select(this);
            let currentMouseY = d3.event.y;
            if(currentMouseY < legendMargin.top )currentMouseY = 0 + legendMargin.top - 15;
            if(currentMouseY > legendHeight)currentMouseY = legendHeight - 10;
            let dy = currentMouseY - startMouseY;
            g.attr('transform', `translate(0, ${oldYTranslate + dy})`);
            let bandwidth = legendTextYScaleBand.bandwidth();
            let newIdxDx = dy>0 ? Math.floor(dy/bandwidth) : Math.ceil(dy/bandwidth);
            let newIdx = oldIdx + newIdxDx;
            if( newIdx < 0 )newIdx = 0;
            if( newIdx >= paraNameListOld.length )newIdx = paraNameListOld.length-1;
            paraNameList = paraNameListOld.map(d=>d);
            let element = paraNameList[oldIdx];
            paraNameList.splice(oldIdx, 1);
            paraNameList.splice(newIdx, 0, element);
            let legendTextYScaleBandNew = d3.scaleBand().domain(paraNameList).range([0, legendHeight]).paddingInner(0.1).paddingOuter(0.05);
            vis.legendSubG.transition().duration("50").attr('transform', function(d){
                if(d.name === selectedParaName)return `translate(0, ${oldYTranslate + dy})`;
                return `translate(0, ${legendTextYScaleBandNew(d.name)})`;
            });
        }
        function end(d){
            let changed = false;

            vis.parameterInfo.forEach((d,i)=>{
                if( !(d.name === paraNameList[i]) )changed = true;
            })

            legendTextYScaleBand = d3.scaleBand().domain(paraNameList).range([0, legendHeight]).paddingInner(0.1).paddingOuter(0.05);
            vis.legendSubG.transition().duration("50").attr('transform', function(d){
                return `translate(0, ${legendTextYScaleBand(d.name)})`;
            });

            if(changed){
                //Update what we have to update when the order of parameter change and recreate the sunburst
                let parameterInfoDic = {};
                vis.parameterInfo.forEach(d=>parameterInfoDic[d.name]=d);
                vis.parameterInfo = [];
                paraNameList.forEach(d=>vis.parameterInfo.push(parameterInfoDic[d]));
                vis.buildSunburst( true );
            }
        }
        vis.legendSubG.call(drag);

    }

    buildSunburst( remove ){
        const vis = this;

        if(remove) vis.sunburstG.selectAll("*").remove();

        this.treeData = [{'name': 'root', 'parent': ""}];
        this.createTree(this.parameterInfo, "root", 0, {}, {});
        

        let root = d3.stratify()
              .id(d=>d.name)
              .parentId(d=>d.parent);

              
        let rootNode = root(this.treeData);
        rootNode.sum(function(d) {
            return d.value;
        });

        let partitionLayout = d3.partition().size([2 * Math.PI, this.sunburstRadius]);
        partitionLayout(rootNode);

        this.arcGeneratorBackground = d3.arc()
                                .startAngle(function(d) { return d.x0; })
                                .endAngle(function(d) { return d.x1; })
                                .innerRadius(function(d) { 
                                    if(d.id === "root") return 0;
                                    else return d.y0; 
                                })
                                .outerRadius(function(d) { 
                                    if(d.id === "root") return 0;
                                    else return d.y1; 
                                });

        this.arcGeneratorTopHightlight = d3.arc()
                                .startAngle(function(d) { return d.x0; })
                                .endAngle(function(d) { return d.x1; })
                                .innerRadius(function(d) { 
                                    if(d.id === "root") return 0;
                                    else return d.y0; 
                                })
                                .outerRadius(function(d) { 
                                    if(d.id === "root") return 0;
                                    else return d.y1; 
                                });

        this.arcGeneratorMain = d3.arc()
                                .startAngle(function(d) { return d.x0; })
                                .endAngle(function(d) { return d.x1; })
                                .innerRadius(function(d) { 
                                    if(d.id === "root")return 0;
                                    else{
                                        let arcLen = (d.y1 - d.y0) * (1-vis.headRatio);
                                        let visitCount = vis.countVisitedSubspace(d.data.subSpaceIndexInfo);
                                        d.data['visitedSubspace'] = visitCount;
                                        let visitRatio = ( visitCount/ d.data.totalSubspace );
                                        let arcModify = (1 - visitRatio) * arcLen;
                                        return (d.y1 - d.y0) * vis.headRatio + d.y0 + arcModify; 
                                    }
                                })
                                .outerRadius(function(d) { 
                                    if(d.id === "root") return 0;
                                    else return d.y1; 
                                });

        this.arcGeneratorHead = d3.arc()
                                    .startAngle(function(d) { return d.x0; })
                                    .endAngle(function(d) { return d.x1; })
                                    .innerRadius(function(d) { 
                                        if(d.id === "root") return 0;
                                        else return d.y0; 
                                    })
                                    .outerRadius(function(d) { 
                                        if(d.id === "root") return 0;
                                        else return (d.y1 - d.y0) * vis.headRatio + d.y0; 
                                    });

        let allNodes = rootNode.descendants();
        this.nodes = this.sunburstG
                        .selectAll('g')
                        .data(allNodes)
                        .enter()
                        .append('g').attr('id', "sunburstGNode");
        this.nodes.attr('transform', 'scale(0.1)');

        //calculate total subspace belong to each node (include non-leaf node)
        this.treeData.forEach((d)=>{
            if(d.name === "root")return;
            let allDimension = {}
            vis.paraOrderForSubspace.forEach(d=>allDimension[d.name]=d.nIntervals);
            Object.keys( d.subSpaceIndexInfo ).forEach(k=>allDimension[k] = d.subSpaceIndexInfo[k][1] - d.subSpaceIndexInfo[k][0] + 1);
            let totalCount = 1;
            Object.keys(allDimension).forEach(k=>totalCount = allDimension[k]*totalCount);
            d['totalSubspace'] = totalCount;
        });

        this.pathBackground = this.nodes.append('path')
                            .attr('d', vis.arcGeneratorBackground)
                            .attr('fill', function(d){
                                return 'gray'
                                })
                            .attr('opacity', 1.0)
                            .attr('stroke', 'white')
                            .attr('stroke-width', 0.1);

        this.pathMain = this.nodes.append('path')
                            .attr('d', vis.arcGeneratorMain)
                            .attr('fill', function(d){
                                if( d.id === "root") return;
                                let idx = 0;
                                vis.parameterInfo.forEach( function(dPara, i){
                                                                if(d.data.paraName === dPara.name) idx = i;
                                                            });
                                let value2Colormap = vis.parameterInfo[idx]['paraColorMap'][d.data.paraIndex][1];
                                return vis.parameterInfo[idx]['colormap'](value2Colormap);                                
                            })
                            .attr('opacity', 1.0)
                            .attr('stroke', 'white')
                            .attr('stroke-width', 0.1);

        this.pathHead = this.nodes.append('path')
                            .attr('d', vis.arcGeneratorHead)
                            .attr('fill', function(d){
                                if( d.id === "root") return;
                                let idx = 0;
                                vis.parameterInfo.forEach( function(dPara, i){
                                                                if(d.data.paraName === dPara.name) idx = i;
                                                            });
                                let value2Colormap = vis.parameterInfo[idx]['paraColorMap'][d.data.paraIndex][1];
                                return vis.parameterInfo[idx]['colormap'](value2Colormap);                                
                            })
                            .attr('stroke', 'white')
                            .attr('stroke-width', 0.0);

        this.pathTopHightlighgt = this.nodes.append('path')
                                        .attr('d', vis.arcGeneratorTopHightlight)
                                        .attr('fill', 'none')
                                        .attr('stroke-width', 3.0)
                                        .attr('display', 'none');

        this.pathTopHightlighgtOne = this.nodes.append('path')
                                        .attr('d', vis.arcGeneratorTopHightlight)
                                        .attr('fill', 'none')
                                        .attr('stroke-width', 3.0)
                                        .attr('display', 'none');

        this.dataInfoG = this.nodes.append('g');
        this.buildDataInfoAroundSunburst();
        
        this.pathHead.on("click", vis.selectArcEventFunc);

        this.pathHead.on("mouseover", function(){
                                                let arc = d3.select(this);
                                                arc.attr('stroke', 'red').attr('stroke-width', 2);
                                                let arcData = arc.data()[0].data.nodeInfo;
                                                // vis.legendSubG.selectAll('rect').attr('stroke', function(d){
                                                //     if( (d.name in arcData) && Math.abs( arcData[d.name][0] - d.paraColorMap[0] ) < 0.00001 ) return 'magenta';
                                                //     else return 'white';
                                                // }).attr('stroke-width', function(d){
                                                //     if( (d.name in arcData) && Math.abs( arcData[d.name][0] - d.paraColorMap[0] ) < 0.00001 ) return 3;
                                                //     else return 0;
                                                // })
                                                vis.legendSubG.selectAll('rect').attr('height', function(d){
                                                    if( (d.name in arcData) && Math.abs( arcData[d.name][0] - d.paraColorMap[0] ) < 0.00001 ) return vis.colorSegmentHeight*2;
                                                    else return vis.colorSegmentHeight;
                                                })
                                        })
                        .on("mouseleave", function(){
                            let arc = d3.select(this);
                            arc.attr('stroke', 'white').attr('stroke-width', 0);
                            // vis.legendSubG.selectAll('rect').attr('stroke', 'white').attr('stroke-width',0);
                            vis.legendSubG.selectAll('rect').attr('height', vis.colorSegmentHeight);
                        })
        
        // this.pathBackground.on('click', showSubspaceText);
        // this.pathMain.on('click', showSubspaceText);
        this.pathBackground.on('click', updateParameterTextTable);
        this.pathMain.on('click', updateParameterTextTable);
        function updateParameterTextTable(d){
            if( Object.keys(d.data.nodeInfo).length === vis.parameterInfo.length ){ //this function only works on leaf
                let ret = [];
                let dic = d.data.subSpaceIndexInfo;
                vis.listCombinationSubspacesIndex(ret, Object.keys(dic), dic, 0, {});
                
                let nonVisitedPara = [];
                let visitedPara = [];
                ret.forEach(function(d){
                    let idx1D =vis.subspacIdxDicToSubspace1DIndex(d);
                    if(!SunburstParameterInterface.subSpaceData[idx1D].visit) nonVisitedPara.push( SunburstParameterInterface.subSpaceData[idx1D] );
                    else visitedPara.push( SunburstParameterInterface.subSpaceData[idx1D] );
                });

                nonVisitedPara.forEach(d=>(d.selected=false));

                let trs = vis.scrollTableNonVisit.selectAll('tr').data(nonVisitedPara);
                trs.exit().remove();
                let trEnter = trs.enter().append('tr');
                trs = trs.merge(trEnter);
                trs.attr('bgcolor', '#e3fff6');

                trs.on('click', function(d){
                    if(d.selected == false) d3.select(this).attr('bgcolor', 'yellow');
                    else d3.select(this).attr('bgcolor', '#e3fff');
                    d.selected = !d.selected;
                    
                });

                // enlarge the pie in umap
                trs.on('mouseover', function(d){
                    let para = {};
                    paraOrderName.forEach(pName=>para[pName] = (+d[pName][0].toFixed(3)));
                    
                    let filter = d3.select('#umapPlot')
                            .selectAll('.pie')
                            .filter(pieData=>{
                                return para['OmM'] == pieData['OmM'] && para['OmB'] == pieData['OmB'] && para['h'] == pieData['h']
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
                //
                let paraOrderName = vis.paraOrderForSubspace.map(d=>d.name);
                let tds = trs.selectAll("td").data(d=>{
                    let para = [];
                    // paraOrderName.forEach(pName=>para.push(d[pName][0]-d[pName][1]));
                    paraOrderName.forEach(pName=>para.push(d[pName][0]));
                    return para;
                });
                tds.exit().remove();
                let tdEnter = tds.enter().append('td');
                tds = tds.merge(tdEnter);
                tds.text(d=>d.toFixed(3)).attr('width', vis.tableTdWidth);
                
                vis.runButton.on('click', function(){
                    vis.selectParaTextEventFunc( nonVisitedPara.filter(d=>d.selected) );
                });
                
                // texts.on('click', vis.selectParaTextEventFunc);

                let trsVisit = vis.scrollTableVisit.selectAll('tr').data(visitedPara);
                trsVisit.exit().remove();
                let trEnterVisit = trsVisit.enter().append('tr');
                trsVisit = trsVisit.merge(trEnterVisit);
                // enlarge the pie in umap
                trsVisit.on('mouseover', function(d){
                    let para = {};
                    paraOrderName.forEach(pName=>para[pName] = (+d[pName][0].toFixed(3)));
                    
                    let filter = d3.select('#umapPlot')
                            .selectAll('.pie')
                            .filter(pieData=>{
                                return para['OmM'] == pieData['OmM'] && para['OmB'] == pieData['OmB'] && para['h'] == pieData['h']
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
                //
                let tdsVisit = trsVisit.selectAll("td").data(d=>{
                    let para = [];
                    // paraOrderName.forEach(pName=>para.push(d[pName][0] - d[pName][1]));
                    paraOrderName.forEach(pName=>para.push(d[pName][0]));
                    return para;
                });
                tdsVisit.exit().remove();
                let tdEnterVisit = tdsVisit.enter().append('td');
                tdsVisit = tdsVisit.merge(tdEnterVisit);
                tdsVisit.text(d=>d.toFixed(3)).attr('width', vis.tableTdWidth);
                
                // texts.on('click', vis.selectParaTextEventFunc);
            }
        }

        let tip = d3.tip().attr('class', 'd3-tip')
                        .html(function(d){
                            return ((d.data.visitedSubspace/d.data.totalSubspace)*100).toFixed(2) + "%";
                        });    
        
        this.pathMain.call(tip);
        this.pathMain.on('mouseover', tip.show).on('mouseout', tip.hide);
        this.pathBackground.call(tip);
        this.pathBackground.on('mouseover', tip.show).on('mouseout', tip.hide);
        //// calculate visited ratio of all subspaces
        let nVisitedSubspace = SunburstParameterInterface.subSpaceData.reduce((acc, currentValue)=>{
            if(currentValue.visit)acc++;
            return acc;
        }, 0)
        let totalVisitRatio = nVisitedSubspace / SunburstParameterInterface.subSpaceData.length;
        this.totalSubSpaceRatioText = this.nodes.append("text").attr("x",0).attr("y",0).text((totalVisitRatio*100).toFixed(2) + "%").attr('font-size', 25).attr('text-anchor', 'middle').attr('dx',5).attr('dy', 5);

        ////// donut chart: sensitivity, uncertainty, value of each varialbe.
        // let nCombInterval

        this.nodes.transition().ease(d3.easeExp).duration(1000).attr('transform', 'scale(1)');
    }

    buildDataInfoAroundSunburst(){
        const vis = this;
        
        this.enalbeDataInfo.forEach((dInfoName, dInfoNameIdx)=>{
            this.arcGeneratorDataInfo = d3.arc()
                                        .startAngle(function(d) { return d.x0; })
                                        .endAngle(function(d) { return d.x1; })
                                        .innerRadius(function(d) { 
                                            if(d.id === "root" || Object.keys(d.data.nodeInfo).length < vis.parameterInfo.length) return 0;
                                            else return d.y1 + ((d.y1 - d.y0)*vis.ratioDatInfoRadius * dInfoNameIdx); 
                                            
                                        })
                                        .outerRadius(function(d) { 
                                            if(d.id === "root" || Object.keys(d.data.nodeInfo).length < vis.parameterInfo.length) return 0;
                                            else return d.y1  + ((d.y1 - d.y0)*vis.ratioDatInfoRadius * ( dInfoNameIdx + 1 )); 
                                        });
            let maxSectorValues = this.dataInfoG.data().map(d=>{
                if( d.id ==="root" || Object.keys(d.data.nodeInfo).length < vis.parameterInfo.length )return -1*Math.pow(10, 20);//what it return does not matter
                else{
                    return vis.computeSubspaceDataInfo(d.data.subSpaceIndexInfo, dInfoName);
                }
            }).filter(d=>d>-1*Math.pow(10, 20));
            
            // make sure the value in array are greater then 0
            // let minValue = d3.min(maxSectorValues);
            // let dInfoMin = {};
            // dInfoMin[dInfoName] = minValue;
            // if (minValue <= 0){
            //     maxSectorValues.forEach((d, i)=>maxSectorValues[i]=Math.log10(maxSectorValues[i]+Math.abs(minValue)+1));
            // }
            // else{
            //     maxSectorValues.forEach((d, i)=>maxSectorValues[i]=Math.log10(maxSectorValues[i]));
            // }
            //

            let vExtent = d3.extent(maxSectorValues);
            
            // Andy:  0 -> white, negative -> red , positive -> blue
            if (vExtent[0] > 0 & vExtent[1] > 0) {
                var colorScale = d3.scaleLinear().domain([0, vExtent[1]]).range([0.5,1]);
            }
            else if (vExtent[0] < 0 & vExtent[1] < 0){
                var colorScale = d3.scaleLinear().domain([vExtent[0], 0]).range([0,0.5]);
            }
            else{
                var colorScale = d3.scaleLinear().domain([vExtent[0], 0, vExtent[1]]).range([0, 0.5, 1]);
            }
            // Andy

            // let colorScale = d3.scaleLinear().domain(vExtent).range([0,1]);

            let tip = d3.tip().attr('class', 'd3-tip')
                        .html(function(d){
                         
                            let value = vis.computeSubspaceDataInfo(d.data.subSpaceIndexInfo, dInfoName);
                            // make sure the value in array are greater then 0
                            // if (dInfoMin[dInfoName] < 0) {value = value + Math.abs(dInfoMin[dInfoName])+1;}
                            // value = Math.log10(value);
                            
                            // //
                            return dInfoName + ": " + value.toExponential(3);
                        }); 
            let path = this.dataInfoG.append('path')
                    .attr('d', vis.arcGeneratorDataInfo )
                    .attr('fill', function(d){
                        
                        if( d.id ==="root" || Object.keys(d.data.nodeInfo).length < vis.parameterInfo.length )return '';//what it return does not matter
                        else{
                            
                            let value = vis.computeSubspaceDataInfo(d.data.subSpaceIndexInfo, dInfoName);
                            // //make sure the value in array are greater then 0
                            // if (dInfoMin[dInfoName] < 0) {value = value + Math.abs(dInfoMin[dInfoName])+1;}
                            // value = Math.log10(value);
                         
                            // //
                            return vis.dataInfoNameColormap[dInfoName](colorScale(value));
                        }
                    })
                    .attr('stroke', 'white');
            path.call(tip);
            path.on('mouseover', tip.show).on('mouseout', tip.hide);
        });
    }

    initTable(){
        const vis = this;

        let textTdTableTr = this.textTd.append("table").append('tr');
        this.VisitTable = textTdTableTr.append('td').append('table');
        this.nonVisitTable = textTdTableTr.append('td').append('table');

        this.scrollTheadVisit = this.VisitTable.append("thead");
        this.scrollTheadVisit.append("tr").append("th").attr('colspan', vis.parameterInfo.length).text('Visited Parameters');
        this.scrollHeadTrVisit = this.scrollTheadVisit.append("tr");
        this.scrollHeadTrVisit.selectAll("th").data(this.paraOrderForSubspace).enter().append("th").attr('width', vis.tableTdWidth).text(d=>d.name);
        this.scrollTableVisit = this.VisitTable.append("tbody").append('tr').append('td').attr('colspan', 3).append('div').attr('class', 'scrollable').append('table');
        this.VisitTable.append('tfoot').append('tr').append('td').text("&nbsp;").style('opacity', 0);

        this.scrollTheadNonVisit = this.nonVisitTable.append("thead");
        this.scrollTheadNonVisit.append("tr").append("th").attr('colspan', vis.parameterInfo.length).text('Non-Visited Parameters')
        this.scrollHeadTrNonVisit = this.scrollTheadNonVisit.append("tr");
        this.scrollHeadTrNonVisit.selectAll("th").data(this.paraOrderForSubspace).enter().append("th").attr('width', vis.tableTdWidth).text(d=>d.name);
        this.scrollTableNonVisit = this.nonVisitTable.append("tbody").append('tr').append('td').attr('colspan', 3).append('div').attr('class', 'scrollable').append('table');
        this.runButton = this.nonVisitTable.append('tfoot').append('tr').append('td').append('button').text('Run');
    }

    createTree(paraRange, parent, paraIndex, nodeInfo, subSpaceIndexInfo){
        let interval = (paraRange[paraIndex].end - paraRange[paraIndex].start) / paraRange[paraIndex].intervals;
        
        for( let i = 0; i < paraRange[paraIndex].intervals; i ++){
            let start = paraRange[paraIndex].start + i * interval;
            let end = paraRange[paraIndex].start + (i+1) * interval;
            let paraName =  paraRange[paraIndex].name;
        
            let nodeName = parent + "_" + i;
            let newNodeInfo = {...nodeInfo};
            newNodeInfo[paraName] = [start, end];

            let newSubSpaceIndexInfo = {...subSpaceIndexInfo};
            let subspaceIdx = this.paraOrderForSubspace.findIndex(d=>d.name===paraName);
            let oneSubSpaceInfo = this.paraOrderForSubspace[subspaceIdx];
            let subSpaceStartIndex = Math.floor((start - oneSubSpaceInfo['start'])/oneSubSpaceInfo['interval']);
            let subSpaceEndIndex = Math.floor((end-0.000001 - oneSubSpaceInfo['start'])/oneSubSpaceInfo['interval']);//0.000001 avoid the last (not existing) index
            newSubSpaceIndexInfo[paraName] = [subSpaceStartIndex, subSpaceEndIndex];//include subSpaceEndIndex
            let node = {"name": nodeName, "parent": parent, "nodeInfo": newNodeInfo, "paraIndex": i, "paraName": paraRange[paraIndex].name, "subSpaceIndexInfo": newSubSpaceIndexInfo};
        
            if( paraIndex === paraRange.length - 1 ){//leaf node
                node['value'] = 1;
                this.treeData.push(node);
            }else{
                this.treeData.push(node);
                this.createTree(paraRange, nodeName, paraIndex+1, newNodeInfo, newSubSpaceIndexInfo);
            }
        }
    }

    static createSubspaceList(paraRange, parents, paraIndex){
        let interval = (paraRange[paraIndex].end - paraRange[paraIndex].start) / paraRange[paraIndex].subSpaceIntervals;
        
        for( let i = 0; i < paraRange[paraIndex].subSpaceIntervals; i ++){
            let start = paraRange[paraIndex].start + i * interval;
            let end = paraRange[paraIndex].start + (i+1) * interval;
            let paraName =  paraRange[paraIndex].name;

            let currentNodeInfo = {...parents};
            currentNodeInfo[paraName] = [(start+end)/2, interval/2];
            // currentNodeInfo[paraName] = [start, interval];

            if( paraIndex === paraRange.length - 1 ){//leaf node
                currentNodeInfo['visit'] = false;
                SunburstParameterInterface.subSpaceData.push(currentNodeInfo);
            }else{
                SunburstParameterInterface.createSubspaceList(paraRange, currentNodeInfo, paraIndex+1);
            }
        }
    }

    

    listCombinationSubspacesIndex(ret, keys, dic, idx, local){
        let nPara = keys.length;
        let paraName = keys[idx];
        let startIdx = dic[paraName][0];
        let endIdx = dic[paraName][1];

        for( let i = startIdx; i<=endIdx; i++ ){
            let newLocal = {...local};
            newLocal[paraName] = i;
            if( idx === nPara - 1){//leaf node
                ret.push(newLocal);
            }else{
                this.listCombinationSubspacesIndex(ret, keys, dic, idx + 1, newLocal);
            }
        }
    }

    paraDictionaryToSubspaceIndex(dic){
        let idx1D = 0;
        this.paraOrderForSubspace.forEach(function(d,i){
            let pName = d['name'];
            let nInterval = d['nIntervals'];
            let interval = d['interval'];
            let start = d['start'];
            let value = dic[pName] + 0.001;
            let idx = Math.floor((value-start)/interval);
            idx1D = idx1D*nInterval + idx;
        });
        return idx1D; //use this.subSpaceData[idx1D] to access the corresponding subspace 
    }

    subspacIdxDicToSubspace1DIndex(dic){
        let idx1D = 0;
        this.paraOrderForSubspace.forEach(function(d,i){
            let pName = d['name'];
            let nInterval = d['nIntervals'];
            let idx = dic[pName];
            idx1D = idx1D*nInterval + idx;
        });
        return idx1D; //use this.subSpaceData[idx1D] to access the corresponding subspace 
    }

    countVisitedSubspace(dic){
        //dic example: let dic = {"AAA": [2, 5], "B": [1, 3], "C": [5, 8]};
        this.paraOrderForSubspace.forEach(function(d){
            if( !(d.name in dic ) ){
                dic[d.name] = [0, d.nIntervals-1];
            }
        });
        let ret = [];
        this.listCombinationSubspacesIndex(ret, Object.keys(dic), dic, 0, {});
        let visitCount = 0;
        ret.forEach((d)=>{
            let idx1D = this.subspacIdxDicToSubspace1DIndex(d);
            if( SunburstParameterInterface.subSpaceData[idx1D].visit === true)visitCount++;
        });
        return visitCount;
    }

    computeSubspaceDataInfo(dic, dataName){
        //dic example: let dic = {"AAA": [2, 5], "B": [1, 3], "C": [5, 8]};
        this.paraOrderForSubspace.forEach(function(d){
            if( !(d.name in dic ) ){
                dic[d.name] = [0, d.nIntervals-1];
            }
        });
        let ret = [];
        this.listCombinationSubspacesIndex(ret, Object.keys(dic), dic, 0, {});
        let max = -1*Math.pow(10, 20);
        let min = 1*Math.pow(10, 20);
        let sum = 0
        ret.forEach((d)=>{
            let idx1D = this.subspacIdxDicToSubspace1DIndex(d);
            let v = SunburstParameterInterface.subSpaceData[idx1D]['dataInfo'][dataName];
            // if( v > max ) max = v;
            // if( v < min ) min = v;

            sum += v
        });
        sum = sum / ret.length
        // return (max-min)/2
        // return max
        return sum;
    }

    hightlight( element, selected, highlightColor ){
        const vis = this;

        vis.pathTopHightlighgt.attr("stroke", highlightColor);
        vis.pathTopHightlighgt.attr("display", function(d){
            if( d.data.name === "root") return;
            let arcDt = d.data.nodeInfo;
            let keys = Object.keys(arcDt);
            for(let i=0; i<selected.length; i++){
                let b = true;
                keys.forEach(d => b = b && (arcDt[d][0] <= selected[i][d] && selected[i][d] < arcDt[d][1] ) );
                if(b) return '';
            }
            
            return 'none';
        });
    }

    unhightlight( element, selected ){
        const vis = this;
        vis.pathTopHightlighgt.attr("display", 'none' );
    }

    hightlightOne( element, selected, highlightColor ){
        const vis = this;

        vis.pathTopHightlighgtOne.attr("stroke", highlightColor);
        vis.pathTopHightlighgtOne.attr("display", function(d, i, n){
            if( d.data.name === "root") return;
            let arcDt = d.data.nodeInfo;
            let keys = Object.keys(arcDt);

            let b = true;
            keys.forEach(d => b = b && (arcDt[d][0] <= selected[d] && selected[d] < arcDt[d][1] ) );
            if(b) return '';
            else return 'none';
        });
    }

    unhightlightOne( element, selected ){
        const vis = this;
        vis.pathTopHightlighgtOne.attr("display", 'none' );
    }



    setVisitedSubspace( visitParas ){
        const vis = this;
        visitParas.forEach(d=>{
            console.log(d);
            let idx1D = this.paraDictionaryToSubspaceIndex(d);
            console.log(idx1D);
            console.log(SunburstParameterInterface.subSpaceData.length);
            SunburstParameterInterface.subSpaceData[idx1D].visit = true;
        })

        //// calculate visited ratio of all subspaces
        let nVisitedSubspace = SunburstParameterInterface.subSpaceData.reduce((acc, currentValue)=>{
            if(currentValue.visit)acc++;
            return acc;
        }, 0)
        let totalVisitRatio = nVisitedSubspace / SunburstParameterInterface.subSpaceData.length;
        vis.totalSubSpaceRatioText.text((totalVisitRatio*100).toFixed(2) + "%");
        vis.pathMain.attr('d', vis.arcGeneratorMain); 
    }
}