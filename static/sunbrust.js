

let paraRange = [{"start": 0.17, "end": 0.5, "name": "OmM", "intervals": 5, "colormap": d3.interpolateReds, "subSpaceIntervals": 18}, 
                  {"start": 0.03, "end": 0.08, "name": "OmB", "intervals": 4, "colormap": d3.interpolateBlues, "subSpaceIntervals": 12}, 
                  {"start": 0.55, "end": 0.85, "name": "h", "intervals": 6, "colormap": d3.interpolateGreens, "subSpaceIntervals": 20} ];

let selectArcEventFunc = function(d){
  console.log("Click on arc:", d.data.nodeInfo);
};

let selectParameterTextEventFunc = function(d){
  let invokePara = [];
  let paraName = [];
  paraRange.forEach(function(p){
    paraName.push( p.name );
  });
  d.forEach(p=>{
    let para = {};
    paraName.forEach(pname=>para[pname]=+p[pname][0].toFixed(3));
    invokePara.push(para);

  });
  sunburstUI.setVisitedSubspace(invokePara)
  let newData = getRequest("/runCandidate", {"members": invokePara})['data'];
  drawTable(invokePara);
  projectionViewInterface.registMember(newData)
 
  
};


//create simulation data information
//interpolateRdBu (red-white-blue)
//interpolateBlues
//interpolateReds
let dataInfoNameColormap = {
                            'density': d3.interpolateRdBu,
                            'Temp': d3.interpolateRdBu,
                            'rho_e': d3.interpolateRdBu,
                            'phi_grav': d3.interpolateRdBu,
                            'xmom': d3.interpolateRdBu,
                            'ymom': d3.interpolateRdBu,
                            'zmom': d3.interpolateRdBu 
};
                     
// let dataInfo = [];
let subspaceInfo = SunburstParameterInterface.GetSubspaceSetting(paraRange);

let sensitivity = getRequest('/sunbrustInit', {'parameter': 'h'})['data']
// let sensitivity = getRequest('/sunbrustInit', {'parameter': 'OmB', 'data': subspaceInfo})['data']

// subspaceInfo.forEach(d=>{
//   let dtInfo = {};
//   Object.keys(dataInfoNameColormap).forEach(k=>{
//     dtInfo[k] = 1//sensitivity//Math.random() * d['OmB'][0];
//   });
//   dataInfo.push( dtInfo );
// });

//create the UI object
const sunburstUI = new SunburstParameterInterface("#sunbrustView", 620, 230, 50,
                                                  paraRange, dataInfoNameColormap, sensitivity, 
                                                  0.15, selectArcEventFunc, selectParameterTextEventFunc);

// //// test for mouse over the small circle
// let selected = [{"OmM": 0.5, "OmB": 0.06, "h":2}, {"OmM": 0.8, "OmB": 0.06, "h":2}];
// d3.select('#sunbrustView').append('svg').attr('width', '100').attr('height', '100').append('circle').attr('cx',50).attr('cy',50).attr('r', 10)
//     .on('mouseover', function(){
//       sunburstUI.hightlight(this, selected);
//     } )
//     .on('mouseout', function(){
//       sunburstUI.unhightlight(this, selected);
//     } );

//   d3.select('#sunbrustView').append('svg').attr('width', '100').attr('height', '100').append('circle').attr('cx',70).attr('cy',50).attr('r', 30).attr('fill','red')
//   .on('mouseover', function(){
//     let selected = []
//     for( let i=0; i<100;i++){
//       let s = {};
//       for(let len = 0; len < paraRange.length; len++){
//         s[paraRange[len].name] = Math.random()*(paraRange[len].end - paraRange[len].start) + paraRange[len].start;
//       }
//       selected.push(s);
//     }
//     sunburstUI.setVisitedSubspace(selected);
//   })

d3.select('#backdoor')
.on('mouseover', function(){
  let selected = []
  for( let i=0; i<100;i++){
    let s = {};
    for(let len = 0; len < paraRange.length; len++){
      s[paraRange[len].name] = Math.random()*(paraRange[len].end - paraRange[len].start) + paraRange[len].start;
    }
    selected.push(s);
  }
  sunburstUI.setVisitedSubspace(selected);
})