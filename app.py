from flask import Flask, render_template
from flask import request

import tensorflow as tf
import numpy as np
from tensorflow import keras

import json
import os
from sklearn import manifold
from sklearn import preprocessing
import umap
from modelEvaluate import evaluate
import time
app = Flask(__name__)

class eachModel():
    def __init__(self, variable):
        
        self.variable = variable

    def loadModel(self, filename, size, variable):
        modelEvaluator = evaluate( modelDir = filename, dataSize = size, variable = self.variable)
        modelEvaluator.loadGenModel()
        self.mini = modelEvaluator.mini
        self.maxi = modelEvaluator.maxi
        self.gen = modelEvaluator.gen

    def getEncodingOutput(self, totalParameters):
        #totalParameters shape should be (X, 3)
        # Not sure should parallel predict or not
        g = keras.models.Model(inputs = self.gen.input, outputs = self.gen.layers[20].output)
        self.encodingDim = g.output.shape[-1]
        encodingOutput = np.zeros(( totalParameters.shape[0], g.output.shape[-1])) #g.output.shape[0] is None

        for i in range(totalParameters.shape[0]):
            if self.variable == 'ymom' or self.variable == 'density':
                encodingOutput[i] = g(totalParameters[i].reshape(1, 1, 3))
            else:    
                encodingOutput[i] = g(totalParameters[i].reshape(1, 3))
        self.encodingOutput = encodingOutput #record in each variable model
        return encodingOutput  #In our case is (X, 4096)
        
        

    def getVolumeOutput(self, totalParameters):
        #totalParameters shape should be (X, 3)
        # Not sure should parallel predict or not
        volumeOutput = np.zeros((totalParameters.shape[0], self.gen.output.shape[1], self.gen.output.shape[2], self.gen.output.shape[3], self.gen.output.shape[4]))
        for i in range(totalParameters.shape[0]):
            if self.variable == 'ymom':
                volumeOutput[i] = ((self.gen(totalParameters[i].reshape(1, 1, 3))+1)/2) * (self.maxi-self.mini) + self.mini
            else:  
                volumeOutput[i] = self.gen(totalParameters[i].reshape(1, 3)) * (self.maxi-self.mini) + self.mini
            
                
        return volumeOutput
    
class backend():
    def __init__(self, logdir):
        logfile = os.listdir(logdir)
       
        self.models = {}
        for i in range(len(logfile)):
         
            model = eachModel(logfile[i]) #filename is equal to variable name.
            model.loadModel(logdir+'/'+logfile[i], (64, 64, 64), logfile[i])
            self.models[logfile[i]] = model

        self.testParameter = []
        with open('testParameter.txt') as f:
            for line in f.readlines():
                tmp = []
                s = line.split(' ')
                for i in s:
                    tmp.append(float(i))
                self.testParameter.append(tmp)
        self.testParameter = np.array(self.testParameter).reshape((len(self.testParameter), 3))  # used to fit umap first

        seenParameter = self.testParameter.copy()
        self.seenData = {}
        for variable in self.models.keys():
            tmpVariableData = {}
            for p in seenParameter:
                tmpVariableData[np.array2string(p, precision=5, separator=',')] = {'volume': "", 'PSE':"", 'PME':"", 'sensitivity': "", 'vtkSensitivity': ""}
            
            self.seenData[variable] = tmpVariableData

    def addNewParameter(self, newParameters):

        for variable in self.models.keys():
          
            for newP in newParameters:

                newpIndex = np.array2string(newP, precision=5, separator=',')
                if newpIndex not in self.seenData[variable].keys():
                   
                    self.seenData[variable][newpIndex] = {'volume': "", 'PSE':"", 'PME':"", 'sensitivity': "", 'vtkSensitivity': ""}
                    

    def getAllModelEncoding(self, totalParameters):
        result = {}
        for model in self.models.values():
           result[model.variable] = model.getEncodingOutput(totalParameters)
        return result 

    # def getMixEncoding(self, seperateEncode):

    #     mixEncoding = np.zeros((next(iter(seperateEncode.values())).shape[0], 1))
    #     for eachEncoding in seperateEncode.values():
    #         mixEncoding = np.concatenate((mixEncoding, eachEncoding), axis = 1)
    #     return mixEncoding[:, 1:]

    def fitUmapByTestParameter(self):
        PME = np.zeros((self.testParameter.shape[0], 4096*len(self.seenData.keys())))

        for i in range(self.testParameter.shape[0]):
            pIndex = np.array2string(self.testParameter[i], precision=5, separator=',')
            PME[i] = self.seenData['density'][pIndex]['PME']
            
        self.dimensionReductor = umap.UMAP(n_neighbors=5, random_state=5, metric='euclidean').fit(PME)
    
    def setPME(self, paramters): #PME =  Parameter Mix Encoding
        for i in range(paramters.shape[0]):
            pIndex = np.array2string(paramters[i], precision=5, separator=',')
            PME = np.zeros((1, ))
            for variable in self.models.keys():
                PME = np.concatenate([PME, self.seenData[variable][pIndex]['PSE']], axis=0)

            for variable in self.models.keys():
                self.seenData[variable][pIndex]['PME'] = PME[1:] #remove initial dimsnsion

    def setPSE(self, paramters): #PSE = Parameter Seperate Encoding
        PSE = self.getAllModelEncoding(paramters)  #return is a dict, ex. {'density', [[]], 'Temp': [[]] }
        for variable in self.models.keys():
            for i in range(paramters.shape[0]):
                pIndex = np.array2string(paramters[i], precision=5, separator=',')
               
                self.seenData[variable][pIndex]['PSE'] = PSE[variable][i]

    def getUmapXY(self, vec):
        return self.dimensionReductor.transform(vec)

    def addPSEData(self, encodeDict):
        for variable in dict.keys(self.PSE):
            self.PSE[variable] = np.concatenate((self.PSE[variable], encodeDict[variable]), axis= 0)

    def addNewData2PME(self, vec):
        self.PME = np.concatenate((self.PME, vec), axis= 0)
    
    def getSeenParameter(self):
        seenParameters = list(self.seenData['density'].keys())    #random give a variable because we only need the totalParameters.
        result = np.zeros((len(seenParameters), 3))
        for i in range(len(seenParameters)):   
            result[i] = np.array(seenParameters[i].replace('[', '').replace(']', '').split(',')).astype(np.float32).reshape(1, 3)
        return result.round(5)

    def addPredictedData(self,variable, p, newPredictData):
        for eachVariable in self.models.keys():
            for i in range(p.shape[0]):
                pIndex = np.array2string(p[i], precision=5, separator=',')
                if eachVariable == variable:
                    self.seenData[eachVariable][pIndex]['volume'] = newPredictData[i]
                else:
                    if pIndex not in self.seenData[eachVariable]:
                        self.seenData[eachVariable][pIndex]['volume'] = "" #Just initial seen parameter, later predict if user needed.

    def getModel(self, variable):
        return self.models[variable]

    def addSensitivityData(self,variable, p, newSensitivity):
        for eachVariable in self.models.keys():
            for i in range(p.shape[0]):
                pIndex = np.array2string(p[i], precision=5, separator=',')
                if eachVariable == variable:
                    self.seenData[eachVariable][pIndex]['sensitivity'] = newSensitivity[i]
                else:
                    if pIndex not in self.seenData[eachVariable]:
                        self.seenData[eachVariable][pIndex]['sensitivity'] = "" #Just initial seen parameter, later predict if user needed.

    def addVtkSensitivityData(self,variable, p, newVtkSensitivity):
        for eachVariable in self.models.keys():
            for i in range(p.shape[0]):
                pIndex = np.array2string(p[i], precision=5, separator=',')
                if eachVariable == variable:
                    self.seenData[eachVariable][pIndex]['vtkSensitivity'] = newVtkSensitivity[i]
                else:
                    if pIndex not in self.seenData[eachVariable]:
                        self.seenData[eachVariable][pIndex]['vtkSensitivity'] = "" #Just initial seen parameter, later predict if user needed.



NyxBackend = backend('model/wgan')

@app.route("/")
def index():
    return render_template('templateEx.html')

@app.route("/L2Calculate", methods=['POST'])
def L2Calculate():   #need {variable, selectParamter, TotalParameter}
    
    jsonData = request.get_json()
    totalParameters = np.array([[member['OmM'], member['OmB'], member['h']] for member in jsonData['totalParameter']])
    targetParameters = np.array([[member['OmM'], member['OmB'], member['h']] for member in jsonData['selectParameter']])
    variable = jsonData['variable']

 
    L2Norm = {variable: []}

    targetPSE = np.zeros((targetParameters.shape[0], 4096))
    totalPSE = np.zeros((totalParameters.shape[0], 4096))

    for p in range(totalParameters.shape[0]):
        pIndex = np.array2string(totalParameters[p], precision=5, separator=',')
        totalPSE[p] = NyxBackend.seenData[variable][pIndex]['PSE']
      

    for p in range(targetParameters.shape[0]):
        pIndex = np.array2string(targetParameters[p], precision=5, separator=',')
        targetPSE[p] = NyxBackend.seenData[variable][pIndex]['PSE']
    
    meanBase = np.mean(targetPSE, axis=0, keepdims=True)
    
    meanBaseL2Norm = np.sqrt(np.sum((totalPSE - meanBase)**2, axis=1))
    mean = np.mean(meanBaseL2Norm)
    std = np.std(meanBaseL2Norm)
    meanBaseL2NormNormalize = (meanBaseL2Norm-mean)/std

    L2Norm[variable] = meanBaseL2NormNormalize.tolist()

    
    return L2Norm

@app.route("/sunbrustInit", methods=['POST'])
def sunbrustInit(): # member, divide, variable

    jsonData = request.get_json()
    filename = f'sensitivity{jsonData["parameter"]}.json'
    with open(filename) as f:
        data = json.load(f)
  
    '''
    Below code is to calculate the sensitivity value that draw on sunburst chart.
    To improve the efficient, we pre-calculate the value and save as the .json file.
    '''
    # variables = ['density', 'Temp', 'rho_e', 'phi_grav', 'xmom', 'ymom', 'zmom']
    # members = np.array([[member['OmM'][0], member['OmB'][0], member['h'][0]] for member in jsonData['data']]).reshape((len(jsonData['data']), 3))
    # parallel = 10
 
    # result = np.zeros((members.shape[0], len(variables), members.shape[-1]))

    

    # @tf.function
    # def calculateGradient(totalParameters, model): 
    #     with tf.GradientTape() as t:
    #         t.watch(totalParameters)
    #         data = model.gen(totalParameters)
    #         data = (data*(model.maxi-model.mini)) + model.mini
    #         mean = tf.reduce_mean(data)
   
    #     return t.gradient(mean, totalParameters)
    # @tf.function
    # def calculateYmomGradient(totalParameters, model):  # ymom used tanh as last layer
    #     with tf.GradientTape() as t:
    #         t.watch(totalParameters)
    #         data = model.gen(totalParameters)
    #         data = (((data+1)/2)*(model.maxi-model.mini)) + model.mini
    #         mean = tf.reduce_mean(data)
    #     return t.gradient(mean, totalParameters)

    # for v in range(len(variables)):
    #     model = NyxBackend.getModel(variables[v])
    #     if v == 'ymom':
    #         for i in range(0, members.shape[0], parallel):
    #             print(f"variable:{v} iter:{i}")
    #             result[i:i+parallel, v] = calculateYmomGradient(members[i:i+parallel], model).numpy()
                
    #     else:
    #         for i in range(0, members.shape[0], parallel):
    #             print(f"variable:{v} iter:{i}")
    #             result[i:i+parallel, v] = calculateGradient(members[i:i+parallel], model).numpy()

    # dictResult = []
    # for row in range(result.shape[0]):
    #     dictResult.append(dict(zip(variables, result[row, :].tolist())))
    # with open('sensitivityMean.json', 'w') as fp:
    #     json.dump(dictResult, fp)
    
    return {'data': data}

    
         

@app.route("/modelWork", methods=['POST'])
def modelWork(): #init no need input

    NyxBackend.setPSE(NyxBackend.testParameter)
    NyxBackend.setPME(NyxBackend.testParameter)
   
    NyxBackend.fitUmapByTestParameter()

    keys = ['OmM', 'OmB','h', 'positionX', 'positionY', 'state']
    
    umap_result = np.concatenate([NyxBackend.testParameter, NyxBackend.dimensionReductor.embedding_, np.zeros((NyxBackend.testParameter.shape[0], 1))], axis=1)
    umap_result = np.around(umap_result, decimals=5)
    print('xmax: ', np.max(umap_result[:, 3]))
    print('xmin: ', np.min(umap_result[:, 3]))
    print('ymax: ', np.max(umap_result[:, 4]))
    print('ymin: ', np.min(umap_result[:, 4]))
    
    umapResult = [dict(zip(keys, umap_result[i].tolist())) for i in range(umap_result.shape[0])]
    return {'data': umapResult}



@app.route("/getData", methods=['POST'])
def getData(): #need {variable, data}

    jsonData = request.get_json()

    tmpVariable = jsonData['variable']
    print('# of selectData: ', len(jsonData['data']))
    
    start = time.time()

    totalParameters = np.array([[member['OmM'], member['OmB'], member['h']] for member in jsonData['data']])
    
    #Check if the volume was predicted before or not.
    # There must be a best way to check. 5/12
    #------------------------------------------------
  
    volumePredict = np.zeros((totalParameters.shape[0], 64, 64, 64))
    
    for i in range(totalParameters.shape[0]):
        pIndex = np.array2string(totalParameters[i], precision=5, separator=',')
        print(pIndex)
        if NyxBackend.seenData[tmpVariable][pIndex]['volume'] != "":
            print('predicted before')
            volumePredict[i] = NyxBackend.seenData[tmpVariable][pIndex]['volume']
        else:
            volumePredict[i] = NyxBackend.getModel(tmpVariable).getVolumeOutput(totalParameters[i].reshape(1, 1, 3)).reshape((64, 64, 64))
    # volumePredict = NyxBackend.models[tmpVariable].getVolumeOutput(totalParameters)
    #------------------------------------------------

    volumePredictMean = np.mean(volumePredict, axis=0 , keepdims=True)
    volumePredict = np.concatenate([volumePredict, volumePredictMean], axis=0)
    NyxBackend.addPredictedData(tmpVariable, totalParameters, volumePredict)
    
    endPredict = time.time()
    print("執行時間：%f 秒" % (endPredict - start))

    return {"data": volumePredictMean.reshape((64*64*64) , order='F').tolist()}

@app.route("/calculateBlock", methods=['POST'])
def calculateBlock(): #need {variable, data, divide, statistics, size, startposition}

    jsonData = request.get_json()
    totalParameters = totalParameters = np.array([[member['OmM'], member['OmB'], member['h']] for member in jsonData['data']])
    variable = jsonData['variable']
    divide = [int(i) for i in jsonData['divide']]
    size = jsonData['size']
    startPosition = jsonData['startPosition'] #[x:int, y:int, z:int]
    statistics = jsonData['statistics']
    statisticsFunction = {'mean': np.mean, 'standard deviation': np.std, 'max': np.max}
    #startPosition[0]+size, startPosition[1]+size, startPosition[2]+size
    volumePredict = np.zeros((len(totalParameters), 64, 64, 64))
    
    for i in range(totalParameters.shape[0]):
        pIndex = np.array2string(totalParameters[i], precision=5, separator=',')
        if NyxBackend.seenData[variable][pIndex]['volume'] != "":
            print('predicted before')
            volumePredict[i] = NyxBackend.seenData[variable][pIndex]['volume']
        else:
            volumePredict[i] = NyxBackend.getModel(variable).getVolumeOutput(totalParameters[i].reshape(1, 1, 3)).reshape((64, 64, 64))

    NyxBackend.addPredictedData(variable, totalParameters, volumePredict)
    

    calculateHist = np.zeros((volumePredict.shape[0], 8))
    
    for i in range(volumePredict.shape[0]):
        blockID = 0
        for z in range(startPosition[2], startPosition[2]+size[2],divide[2]):
            for y in range(startPosition[1], startPosition[1]+size[1], divide[1]):
                for x in range(startPosition[0], startPosition[0]+size[0], divide[0]):
                    calculateHist[i][blockID] =  statisticsFunction[statistics](volumePredict[i][z: z + divide[2], y: y+divide[1], x: x+divide[0]])
                    blockID +=1
    keys = [f'block{i}' for i in range(8)] + ['OmM', 'OmB', 'h']
    
    return {"hist":[dict(zip(keys, calculateHist[i].tolist() + [totalParameters[i][0], totalParameters[i][1], totalParameters[i][2]])) for i in range(calculateHist.shape[0])]}

@app.route("/getVolume", methods=['POST'])


@app.route("/runCandidate", methods=['POST'])
def runCandidate(): # need {data}
    jsonData = request.get_json()
    totalParameters = np.array([[member['OmM'], member['OmB'], member['h']] for member in jsonData['members']]).reshape((len(jsonData['members']), 3))
    NyxBackend.addNewParameter(totalParameters) 

    selectedPME = np.zeros((totalParameters.shape[0], len(NyxBackend.seenData.keys())*4096))

    for i in range(totalParameters.shape[0]):
        pIndex = np.array2string(totalParameters[i], precision=5, separator=',')
        # print(pIndex)
        if NyxBackend.seenData['density'][pIndex]['PME'] != "":
            print('predicted before')
            selectedPME[i] = NyxBackend.seenData['density'][pIndex]['PME']    ##PME of all variables are the same, so we random choose density here. 
        else:
            NyxBackend.setPSE(totalParameters[i].reshape(1, 3))
            NyxBackend.setPME(totalParameters[i].reshape(1, 3))
            selectedPME[i] =  NyxBackend.seenData['density'][pIndex]['PME']

    keys = ['OmM', 'OmB','h', 'positionX', 'positionY', 'state'] #state => 0: test parameter, 1: candidate parameter
    umap_result = np.concatenate([totalParameters, NyxBackend.getUmapXY(selectedPME), np.ones((totalParameters.shape[0], 1))], axis=1)
    umapResult = [dict(zip(keys, umap_result[i].tolist())) for i in range(umap_result.shape[0])]

    return {'data': umapResult}   

@app.route("/getSeenParameter", methods=['POST'])
def getSeenParameter(): # no need
    targetAttribute = NyxBackend.getSeenParameter()
    keys = ['OmM', 'OmB','h']
    targetAttribute = [dict(zip(keys, targetAttribute[i].tolist())) for i in range(targetAttribute.shape[0])]

    return {"data": targetAttribute}

@app.route("/getSensitivity", methods=['POST'])
def getBarSensitivity(): #need {variable, data, divide, size, startposition}

    jsonData = request.get_json()
    variable = jsonData['variable']

    divide = [int(i) for i in jsonData['divide']]
    size = jsonData['size']
    startPosition = jsonData['startPosition'] #[x:int, y:int, z:int]

    # divide = jsonData['divide']
    members = np.array([[member['OmM'], member['OmB'], member['h']] for member in jsonData['data']]).reshape((len(jsonData['data']), 3))
    
    # vtkVolumeGradTotal = np.ones((3, members.shape[0], 64, 64, 64)) #three parameter & # of p & gradient volume
    barGradTotal = []
    blockKeys = [f'block{i}' for i in range(8)] # 8 blocks ... should be able to let users to interact to choose the amount of the block.
    parameterKeys = ['OmM', 'OmB', 'h']

    @tf.function
    def calculateGradient_eachBlock(totalParameters, divide):
        model = NyxBackend.getModel(variable)

        with tf.GradientTape() as t:
            subVolume_L1 = tf.ones([1,1])
            t.watch(totalParameters)
            data = tf.reshape(model.gen(totalParameters), (64, 64, 64))
            data = (data * (model.maxi-model.mini)) + model.mini   #ymom should userd other renormalize way, but we only care about the relativily change...so we ignore here.
           
            for z in range(startPosition[2], startPosition[2]+size[2],divide[2]):
                for y in range(startPosition[1], startPosition[1]+size[1], divide[1]):
                    for x in range(startPosition[0], startPosition[0]+size[0], divide[0]):
                        subVolume_predict = data[z: z + divide[2], y: y+divide[1], x: x+divide[0]]
                        L1 = tf.reshape(tf.reduce_sum(tf.math.abs(subVolume_predict), axis = (0, 1, 2)), [1, 1])
                        # L1 = tf.reshape(tf.reduce_mean(subVolume_predict, axis=(0, 1, 2)), [1, 1])
                        subVolume_L1 = tf.concat([subVolume_L1, L1], axis=0)
                        
        result = t.jacobian(subVolume_L1, totalParameters, experimental_use_pfor=False, parallel_iterations=5)
        print(result)
        return tf.reshape(result[1:], [8, 3])  # 8 blocks ... should be able to let users to interact to choose the amount of the block.

   
    
    for i in range(members.shape[0]):
        barGrad = {}
        pIndex = np.array2string(members[i], precision=5, separator=',')
        # 每次範圍不同，不可用記憶法
        # if NyxBackend.seenData[variable][pIndex]['sensitivity'] != "":         
        #     print('predicted before')
        #     barGradTotal.append(NyxBackend.seenData[variable][pIndex]['sensitivity'])

        # else:
        grad = calculateGradient_eachBlock(tf.constant(members[i], dtype=np.float32, shape=(1, 3)), divide) #output gradients consist all totalParameters.
        for p in range(3): # Three totalParameters in our work.
            # vtkVolumeGrad = np.ones((64, 64, 64))#未來要改成可以fit octree 現在先寫死 5/14
            eachParameterGrad = grad[:, p]
            # for x in range(0, 64, divide):
            #     for y in range(0, 64, divide):
            #         for z in range(0, 64, divide):
            #             blockID = x//divide*(64//divide)**2 + (y//divide)*64//divide + z//divide
                        # vtkVolumeGrad[x:x+divide, y:y+divide, z:z+divide] = np.full((divide, divide, divide),eachParameterGrad[blockID]) # Fill whole block to help us use vtk to show it.
            # vtkVolumeGradTotal[p, i] = vtkVolumeGrad 
            
            singlParameterblockGrade = {blockKeys[i]:eachParameterGrad[i].numpy().tolist() for i in range(eachParameterGrad.shape[0])} #give every block grade a key as value "blockX".
            singlParameterblockGrade = {**singlParameterblockGrade, **{parameterKeys[pp]: members[i][pp] for pp in range(3)}} #combin parameter information for later sorting in js.
            barGrad[parameterKeys[p]] = singlParameterblockGrade #Add into upper level dict with parameter keys. ex. {'OmM': {'block1':1, 'block2': 2}}
        barGradTotal.append(barGrad) #ex. [{'OmM': {'block1':1, 'block2': 2}, 'OmB': {'block1':3, 'block2': 4}]

    NyxBackend.addSensitivityData(variable, members, barGradTotal)
    return {"barGrad": barGradTotal}

@app.route("/getVtkSensitivity", methods=['POST'])
def getVtkSensitivity(): #need {variable, divide, data}

    jsonData = request.get_json()
    variable = jsonData['variable']
    divide = jsonData['divide']
    members = np.array([[member['OmM'], member['OmB'], member['h']] for member in jsonData['data']]).reshape((len(jsonData['data']), 3))

    vtkVolumeGradTotal = [] # we want [{'OmM': volume, 'OmB': volume, 'h': volume}, {'OmM': volume, 'OmB': volume, 'h': volume}, ...]
    parameterKeys = ['OmM', 'OmB', 'h']

    @tf.function
    def calculateGradient_eachBlock(totalParameters, divide):
        model = NyxBackend.getModel(variable)

        with tf.GradientTape() as t:
            subVolume_L1 = tf.ones([1,1])
            t.watch(totalParameters)
            data = tf.reshape(model.gen(totalParameters), (64, 64, 64))
            data = (data * (model.maxi-model.mini)) + model.mini
            for z in range(0,  64, divide):
                for y in range(0,  64, divide):
                    for x in range(0,  64, divide):
                        subVolume_predict = data[z:z+divide, y:y+divide,  x:x+divide, ]
                        L1 = tf.reshape(tf.reduce_sum(tf.math.abs(subVolume_predict), axis = (0, 1, 2)), [1, 1])
                        subVolume_L1 = tf.concat([subVolume_L1, L1], axis=0)
        result = t.jacobian(subVolume_L1, totalParameters, experimental_use_pfor=False, parallel_iterations=5)
    
        return tf.reshape(result[1:], [(64//divide)**3, 3])

   
    for i in range(members.shape[0]):
        pIndex = np.array2string(members[i], precision=5, separator=',')
        if NyxBackend.seenData[variable][pIndex]['vtkSensitivity'] != "":
            print('predicted before')
            vtkVolumeGradTotal.append(NyxBackend.seenData[variable][pIndex]['vtkSensitivity'])
        else:
            grad = calculateGradient_eachBlock(tf.constant(members[i], dtype=np.float32, shape=(1, 3)), divide) #output gradients consist all totalParameters.
            singleParameterVtkGrad = {}
            for p in range(3): # Three totalParameters in our work.
                vtkVolumeGrad = np.ones((64, 64, 64))#未來要改成可以fit octree 現在先寫死 5/14
                eachParameterGrad = grad[:, p]
                for z in range(0, 64, divide):
                    for y in range(0, 64, divide):
                        for x in range(0, 64, divide):
                            blockID = x//divide*(64//divide)**2 + (y//divide)*64//divide + z//divide
                            vtkVolumeGrad[z:z+divide, y:y+divide, x:x+divide,] = np.full((divide, divide, divide),eachParameterGrad[blockID]) # Fill whole block to help us use vtk to show it.
                # vtkVolumeGrad.tofile('0515test.bin')
                singleParameterVtkGrad[parameterKeys[p]] = vtkVolumeGrad.reshape(64*64*64).tolist()
                # vtkVolumeGradTotal[p, i] = vtkVolumeGrad 
                
            vtkVolumeGradTotal.append(singleParameterVtkGrad)  #[{'OmM': volume, 'OmB': volume, 'h': volume}, {'OmM': volume, 'OmB': volume, 'h': volume}, ...]
    NyxBackend.addVtkSensitivityData(variable, members, vtkVolumeGradTotal)
    return {"data": vtkVolumeGradTotal}

@app.route("/getVtkInterestingRegion", methods=['POST'])
def getVtkInterestingRegion(): #need {blockID: float or int, size:int}
    ## 5/17
    ## I use a single way to show selected region
    ## Create a array, size is equal to original volume (ex. 64x64x64)
    ## And only the interesting regin have value; Otherwise is zero.
    ## Add this as a new Actor to show where the region is.
    jsonData = request.get_json()

    divide = jsonData['divide']
    blockID = jsonData['blockID']
    size = jsonData['size']
    startPosition = jsonData['startPosition']

    zmin = (blockID // (divide*divide))
    zmax = (blockID // (divide*divide) + 1) 

    ymin = ((blockID % (divide*divide)) // divide)
    ymax = ((blockID % (divide*divide)) // divide) +1
    
    xmin = ((blockID % (divide*divide)) % divide)
    xmax = ((blockID % (divide*divide)) % divide)+1

    range = np.array([xmin, ymin, zmin, xmax, ymax, zmax]) 


    interestingVolume = np.zeros((64, 64, 64))
    interestingVolume[
        startPosition[0] + range[0]*(size[0]//divide): startPosition[0] + range[3]*(size[0]//divide), 
        startPosition[1] + range[1]*(size[1]//divide): startPosition[1] + range[4]*(size[1]//divide),
        startPosition[2] + range[2]*(size[2]//divide): startPosition[2] + range[5]*(size[2]//divide)
    ] = 10**6


    return {'data':interestingVolume.reshape(64*64*64).tolist()}
    

if __name__ == "__main__":
    app.run(host="localhost", port=8789)