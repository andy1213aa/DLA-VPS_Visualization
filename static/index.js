let testData, pieChart;
function renameKey ( obj, oldKey, newKey ) {
  obj[newKey] = obj[oldKey];
  delete obj[oldKey];
}
let selectDataMean;
let allVariable = ['density', 'Temp', 'rho_e', 'phi_grav', 'xmom', 'ymom', 'zmom']
let allParameters = ['OmM', 'OmB', 'h']
let variable2color = {
    'density': d3.interpolate(d3.rgb(255, 255, 255), d3.rgb(0, 0, 255)),  
    'phi_grav': d3.interpolate(d3.rgb(255, 255, 255), d3.rgb(0, 0, 255)), 
    'rho_e': d3.interpolate(d3.rgb(255, 255, 255), d3.rgb(0, 0, 255)), 
    'Temp': d3.interpolate(d3.rgb(255, 255, 255), d3.rgb(0, 0, 255)), 
    'xmom': d3.interpolate(d3.rgb(255, 255, 255), d3.rgb(0, 0, 255)), 
    'ymom': d3.interpolate(d3.rgb(255, 255, 255), d3.rgb(0, 0, 255)), 
    'zmom': d3.interpolate(d3.rgb(255, 255, 255), d3.rgb(0, 0, 255)),  
}
let currentIsovalue = 0
let transferfunctionMinMwx = [1e+9, 1e+10]
function responsivefy(svg) {
  // get container + svg aspect ratio
  var container = d3.select(svg.node().parentNode),
      width = parseInt(svg.style("width")),
      height = parseInt(svg.style("height")),
      aspect = width / height;

  // add viewBox and preserveAspectRatio properties,
  // and call resize so that svg resizes on inital page load
  svg.attr("viewBox", "0 0 " + width + " " + height)
      .attr("perserveAspectRatio", "xMinYMid")
      .call(resize);

  // to register multiple listeners for same event type, 
  // you need to add namespace, i.e., 'click.foo'
  // necessary if you call invoke this function for multiple svgs
  // api docs: https://github.com/mbostock/d3/wiki/Selections#on
  d3.select(window).on("resize." + container.attr("id"), resize);

  // get width of container and resize svg to fit it
  function resize() {
      var targetWidth = parseInt(container.style("width"));
      svg.attr("width", targetWidth);
      svg.attr("height", Math.round(targetWidth / aspect));
  }
}
let transferFunctionHeight = 150
d3.select('#treeTag')
    .on('click', ()=>{
        d3.select("#sunbrustView")
            .style('display', null)

        d3.select('#listTable')
            .style('display', 'none')
    })

d3.select('#listTag')
    .on('click', ()=>{
        d3.select("#sunbrustView")
            .style('display', 'none')

        d3.select('#listTable')
            .style('display', null)
        tdHover()
    })


let tsneAndLatentVector = getRequest("/modelWork", { "question": "init" })['data'];
const projectionViewInterface = new projectionView('#umapPlot')

  