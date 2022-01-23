let vtkFullScreenRenderWindow = vtk.Rendering.Misc.vtkFullScreenRenderWindow;
let vtkImageData = vtk.Common.DataModel.vtkImageData;
let vtkDataArray = vtk.Common.Core.vtkDataArray;
let vtkVolume = vtk.Rendering.Core.vtkVolume;
let vtkVolumeMapper = vtk.Rendering.Core.vtkVolumeMapper;
let vtkColorTransferFunction = vtk.Rendering.Core.vtkColorTransferFunction;
let vtkPiecewiseFunction = vtk.Common.DataModel.vtkPiecewiseFunction;

// 5/16 add viewport
var vtkRenderWindow  =  vtk.Rendering.Core.vtkRenderWindow;
let vtkRenderer = vtk.Rendering.Core.vtkRenderer;
let vtkViewport = vtk.Rendering.Core.vtkViewport;
let vtkRenderWindowInteractor = vtk.Rendering.Core.vtkRenderWindowInteractor;
let vtkOpenGLRenderWindow = vtk.Rendering.OpenGL.vtkRenderWindow;
let vtkInteractorStyleTrackballCamera = vtk.Interaction.Style.vtkInteractorStyleTrackballCamera;

// iso-surface
let vtkImageMarchingCubes = vtk.Filters.General.vtkImageMarchingCubes;
let vtkSampleFunction = vtk.Imaging.Hybrid.vtkSampleFunction;
let vtkActor = vtk.Rendering.Core.vtkActor;
let vtkMapper = vtk.Rendering.Core.vtkMapper;
let vtkSphere = vtk.Common.DataModel.vtkSphere;
let VtkDataTypes = vtkDataArray.VtkDataTypes;



d3.select('.variableSelector')
.on('change', function(){

    let variableName = d3.select(".variableSelector").node().value; 
    
    let vtkVolume = getRequest('/getData', {'variable': variableName, 'data': d3.select('.renderingTarget').data()})['data'];


    var rw = renderWindows['view3d'];
    let numberOfParameters = rw.getRenderers().length;
    if (numberOfParameters > 1){
        d3.select('#sensitivity').text('Sensitivity: OFF');
        let volumeRenderer = rw.getRenderers()[0];
        volumeRenderer.setViewport(0, 0, 1, 1);
        for (let i =1; i < numberOfParameters; i++){
            renderWindows['view3d'].removeRenderer(renderWindows['view3d'].getRenderers()[1]);
        }
    }
    
    renderer = rw.getRenderers()[0]
    renderer.removeAllVolumes()
    renderer.removeAllActors()

    actor = setActor(vtkVolume)       
    
    renderer.addActor(actor)
    renderer.resetCamera()

    // rw.render()
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

let renderWindows = {}

renderWindows['view3d'] = renderViewInit('view3d')


d3.select('#contour')
    .on('click', function(){
        let selectedMember = d3.select('.renderingTarget').data()
        let variableName = d3.select(".variableSelector").node().value; 
        let vtkVolume = getRequest('/getData', {'variable': variableName, 'data': selectedMember})['data'];
        isoValue(vtkVolume);    
    })  
d3.select('#switchRnederIso')
    .on('change', function(){
        let selectedMember = d3.select('.renderingTarget').data()
        let renderSelect = d3.select("#switchRnederIso").node().value;
        let variableName = d3.select(".variableSelector").node().value; 
        let vtkVolume = getRequest('/getData', {'variable': variableName, 'data': selectedMember})['data'];
        
        // 沒時間改
        if (renderSelect == 'contour')
        {
            d3.select('.contour')
                .style('display', null)
            d3.select('.rendering')
                .style('display', 'none')
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
                .ticks(5)
                .tickFormat(d3.format('.2e'))
                .width(d3.select('.vtkView').style('width').slice(0, 3)-70)
                .default(currentIsovalue)
                .displayValue(false)

                
            
            svg.append('g')
                .attr('transform', 'translate(35,110)')
                .call(slider);

            isoValue(vtkVolume, slider);
        }
        else{
            d3.select('.contour')
                .style('display', 'none')
            d3.select('.rendering')
                .style('display', null)

                var rw = renderWindows['view3d'];
                if (rw.getRenderers().length != 0){
                    renderer = rw.getRenderers()[0]
                    renderer.removeAllVolumes()
                    renderer.removeAllActors()
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
            
                maxScientificNotation = Math.floor(Math.log10(Math.abs(d3.max(vtkVolume))))  
                vtkVolume = vtkVolume.map(d => d/(10**maxScientificNotation))
                minMax = [d3.min(vtkVolume), d3.max(vtkVolume)]
                const tfUI = new VTKjsTrasnferFunctionInterface("#transferFunction", d3.select('.vtkView').style('width').slice(0, 3), transferFunctionHeight, 0.8, renderWindows['view3d'].render, actor.getProperty, minMax, null, 10, d3.interpolateRdBu, true, 10**maxScientificNotation);
        }
        
    }) 

function toggle(button) {
    if(button.value=="OFF") {
        button.value="ON";
        button.innerHTML="Sensitivity: ON";
        
        let volumeRenderer = renderWindows['view3d'].getRenderers()[0];
        volumeRenderer.setViewport(0, 0, 0.7, 1);
        let camera = volumeRenderer.getActiveCamera();
        let selectedMember = d3.select('.renderingTarget').data();
        let variableName = d3.select(".variableSelector").node().value; 

        let vtkGradient = getRequest('/getVtkSensitivity',  {'data': selectedMember, 'divide':16, 'variable': variableName})['data'];
        
        var renderWindow = renderWindows['view3d'];

        xmins = [0.7 ,0.7, 0.7];
        xmaxs = [1   ,1  ,   1];
        ymins = [2/3, 1/3, 0];
        ymaxs = [1, 2/3, 1/3];
        
        allParameters.forEach((d, i)=>{
            
            renderer = vtkRenderer.newInstance({background: [51/255, 77/255, 70/255]});
            
            renderWindow.addRenderer(renderer);

            renderer.setViewport(xmins[i], ymins[i], xmaxs[i], ymaxs[i]);
            
            // Share the camera between viewports.
            renderer.setActiveCamera(camera);
            
            actor = setActor(vtkGradient[0][d]);  // Only One member here
            
            renderer.addActor(actor);
            renderer.resetCamera();
        })

        renderWindow.render();
        
    } else if(button.value=="ON") {
        button.value="OFF";
        button.innerHTML="Sensitivity: OFF"  ;
        
        let volumeRenderer = renderWindows['view3d'].getRenderers()[0];
        volumeRenderer.setViewport(0, 0, 1, 1);
        let numberOfParameters = renderWindows['view3d'].getRenderers().length;
        for (let i =1; i < numberOfParameters; i++){
            renderWindows['view3d'].removeRenderer(renderWindows['view3d'].getRenderers()[1]);  //每刪完一次 [1]所代表的renderer又變成下一個
        }
        renderWindows['view3d'].render();
    }
}
d3.select('#resetTransferFunction')
    .on('click', function(){
        let selectedMember = d3.select('.renderingTarget').data()
    
        let variableName = d3.select(".variableSelector").node().value; 
        let vtkVolume = getRequest('/getData', {'variable': variableName, 'data': selectedMember})['data'];

        var rw = renderWindows['view3d'];
        let renderer = rw.getRenderers()[0];
        renderer.removeAllVolumes();
        renderer.removeAllActors();
        actor = setActor(vtkVolume);       

        renderer.addActor(actor);
        renderer.resetCamera();
        let minMax = [d3.min(vtkVolume), d3.max(vtkVolume)]
        transferfunctionMinMwx = minMax
        let maxScientificNotation = Math.floor(Math.log10(Math.abs(d3.max(vtkVolume))))  
        vtkVolume = vtkVolume.map(d => d/(10**maxScientificNotation))
        const tfUI = new VTKjsTrasnferFunctionInterface("#transferFunction", d3.select('.vtkView').style('width').slice(0, 3), transferFunctionHeight, 0.8, renderWindows['view3d'].render, actor.getProperty, [transferfunctionMinMwx[0]/(10**maxScientificNotation), transferfunctionMinMwx[1]/(10**maxScientificNotation)], null, 10, d3.interpolateRdBu, true, 10**maxScientificNotation);
    })

    function renderViewInit(window){

        let fullScreenRenderer = vtkRenderWindow.newInstance();
    
        vtkOpenGlRenderWindow = vtkOpenGLRenderWindow.newInstance();
        vtkOpenGlRenderWindow.setSize(1000, 1000);
        fullScreenRenderer.addView(vtkOpenGlRenderWindow);
    
        
        vtkInteractor = vtkRenderWindowInteractor.newInstance();
        vtkInteractor.setView(vtkOpenGlRenderWindow);
        vtkInteractor.initialize();
    
        vtkContainer = document.getElementById(window);
        vtkOpenGLRenderWindow
        vtkOpenGlRenderWindow.setContainer(vtkContainer);
        vtkInteractor.bindEvents(vtkContainer);
        vtkInteractor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());
    
        return fullScreenRenderer
    }
    
    function setActor(input){
        // 這裡算出資料的最大值是10的幾次方，再將資料除以它
        //因為vtk.js在資料數字間距太大時會出錯，因此要將資料區間縮短
        maxScientificNotation = Math.floor(Math.log10(Math.abs(d3.max(input))))  
        input = input.map(d => d/(10**maxScientificNotation))
        
        //
        let width = 64, height = 64, depth = 64;
        
    
        let scalars = vtkDataArray.newInstance({
            values: input,
            numberOfComponents: 1, // number of channels 
            dataType: VtkDataTypes.FLOAT, // values encoding
            name: 'scalars'
            
        });
    
        let imageData = vtkImageData.newInstance();
        imageData.setOrigin(0, 0, 0);
        imageData.setSpacing(1, 1, 1);
        imageData.setExtent(0, width - 1, 0, height - 1, 0, depth - 1);
        imageData.getPointData().setScalars(scalars);
        
    
        let volumeMapper = vtkVolumeMapper.newInstance();
        volumeMapper.setInputData(imageData);
        let volumeActor = vtkVolume.newInstance();
        volumeActor.setMapper(volumeMapper);
    
        initProps(volumeActor.getProperty());
    
        function initProps(property) {
            function newColorFunction() {
                let fun = vtkColorTransferFunction.newInstance();
                if (d3.min(input) < 0 & d3.max(input) < 0){
                    fun.addRGBPoint(1, 0.231373, 0.298039, 0.752941);
                    fun.addRGBPoint(0, 0.865003, 0.865003, 0.865003);
                    fun.addRGBPoint(d3.min(input), 0.705882, 0.015863, 0.14902);
                }
                else if (d3.min(input) > 0 & d3.max(input) > 0){
                    fun.addRGBPoint(d3.max(input), 0.231373, 0.298039, 0.752941);
                    fun.addRGBPoint(0, 0.865003, 0.865003, 0.865003);
                    fun.addRGBPoint(-1, 0.705882, 0.015863, 0.14902);
                }
                else{
    
                    fun.addRGBPoint(d3.max(input), 0.231373, 0.298039, 0.752941);
                    fun.addRGBPoint(0, 0.865003, 0.865003, 0.865003);
                    fun.addRGBPoint(d3.min(input), 0.705882, 0.015863, 0.14902);
                }
                return fun;
            }
            function newOpacityFunction() {
                let fun = vtkPiecewiseFunction.newInstance();
                if (d3.min(input) < 0 & d3.max(input) < 0){
                    fun.addPoint(100, 0.3);
                    fun.addPoint(0, 0.01);
                    fun.addPoint(d3.min(input), 0.3);
                }
                else if (d3.min(input) > 0 & d3.max(input) > 0){
                    fun.addPoint(d3.max(input), 0.3);
                    fun.addPoint(0, 0.01);
                    fun.addPoint(-100, 0.3);
                }
                else{
                    fun.addPoint(d3.max(input), 0.3);
                    fun.addPoint(0, 0.01);
                    fun.addPoint(d3.min(input), 0.3);
                }
              
                return fun;
            }
            property.setRGBTransferFunction(0, newColorFunction());
            property.setScalarOpacity(0, newOpacityFunction());
            property.setScalarOpacityUnitDistance(0, 1.732050807568877);
        }
        
        return volumeActor
    }
    
    function isoValue(input, sliderBar){
        let minMax = [d3.min(input), d3.max(input)]
        let width = 64, height = 64, depth = 64;
        let scalars = vtkDataArray.newInstance({
            values: input,
            numberOfComponents: 1, // number of channels 
            dataType: VtkDataTypes.FLOAT, // values encoding
            name: 'scalars'
        });
    
        let imageData = vtkImageData.newInstance();
        imageData.setOrigin(0, 0, 0);
        imageData.setSpacing(1, 1, 1);
        imageData.setExtent(0, width - 1, 0, height - 1, 0, depth - 1);
        imageData.getPointData().setScalars(scalars);
        
        const marchingCube = vtk.Filters.General.vtkImageMarchingCubes.newInstance({
            contourValue: 0.0,
            computeNormals: true,
            mergePoints: true,
        });
        marchingCube.setInputData(imageData); //source -> filter
        const firstIsoValue = currentIsovalue;
        marchingCube.setContourValue(firstIsoValue);
    
        const mapper = vtkMapper.newInstance();
        mapper.setInputConnection(marchingCube.getOutputPort());  
    
        const actor = vtkActor.newInstance();    
        actor.setMapper(mapper);   //mapper -> acter
    
        renderer = renderWindows['view3d'].getRenderers()[0];
        renderer.removeAllVolumes()
        renderer.removeAllActors()
        renderer.addActor(actor);
        renderer.resetCamera();  //actor -> renderer
    
        var rw = renderWindows['view3d'];
    
    
        sliderBar.on('onchange', (val) => {
            currentIsovalue = val
            d3.select('#isoValu').text(val.toExponential(4)).style('font-size', '38px');
            marchingCube.setContourValue(val);
            rw.render();
        });
        // var rangeInput = document.getElementById("myRange");
        // rangeInput.addEventListener('change', function() {
        //     const isoValue = rangeInput.value/100.0 * (minMax[1] - minMax[0]) + minMax[0];
        //     marchingCube.setContourValue(isoValue);
        //     rw.render();
        // });
        // ask vtk to do the first render
        rw.render();
    }
    
    function setInterestActor(input){
        let width = 64, height = 64, depth = 64;
        let scalars = vtkDataArray.newInstance({
            values: input,
            numberOfComponents: 1, // number of channels (grayscale)
            dataType: VtkDataTypes.FLOAT, // values encoding
            name: 'scalars'
            
        });
    
        let imageData = vtkImageData.newInstance();
        imageData.setOrigin(0, 0, 0);
        imageData.setSpacing(1, 1, 1);
        imageData.setExtent(0, width - 1, 0, height - 1, 0, depth - 1);
        imageData.getPointData().setScalars(scalars);
        
        let volumeMapper = vtkVolumeMapper.newInstance();
        volumeMapper.setInputData(imageData);
    
        let volumeActor = vtkVolume.newInstance();
        volumeActor.setMapper(volumeMapper);
    
        initProps(volumeActor.getProperty());
    
        function initProps(property) {
            function newColorFunction() {
                let fun = vtkColorTransferFunction.newInstance();
                fun.addRGBPoint(d3.min(input), 0.231373, 0.298039, 0.752941);
                // fun.addRGBPoint(d3.median(input), 0.865003, 0.865003, 0.865003);
                fun.addRGBPoint(d3.max(input), 1, 0.98039, 0.803921);
                return fun;
            }
        
            function newOpacityFunction() {
                let fun = vtkPiecewiseFunction.newInstance();
                fun.addPoint(d3.min(input), 0);
                fun.addPoint(d3.max(input), 0.05);
                return fun;
            }
            property.setRGBTransferFunction(0, newColorFunction());
            property.setScalarOpacity(0, newOpacityFunction());
            property.setScalarOpacityUnitDistance(0, 1.732050807568877);
            
        }
        return volumeActor
    }