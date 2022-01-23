import tensorflow as tf
from tensorflow.keras.models import load_model 
import os 

from importlib import import_module

gpus = tf.config.experimental.list_physical_devices('GPU')

if gpus:
    try:
        # Currently, memory growth needs to be the same across GPUs
        for gpu in gpus:
          tf.config.experimental.set_memory_growth(gpu, True)
        logical_gpus = tf.config.experimental.list_logical_devices('GPU')
        print(len(gpus), "Physical GPUs,", len(logical_gpus), "Logical GPUs")
    except RuntimeError as e:
        # Memory growth must be set before GPUs have been initialized
        print(e)
        
class evaluate():
    def __init__(self, modelDir, dataSize, variable):
        
        self.modelDir = modelDir
        self.dataSize = dataSize
        self.variable = variable
        
        
        if variable == 'density':
      
            self.maxi = 492655700000.0
            self.mini = 562485060.0

        elif variable == 'xmom':

            self.maxi = 62882016000000.0
            self.mini = -70025482000000.0

        elif variable == 'Temp':

            self.maxi = 2361152.0
            self.mini = 2.4191138e-09
#       
        elif variable == 'rho_e':
            self.maxi = 2.3533318e+16
            self.mini = 0.42123172
        
        elif variable == 'particle_mass_density':
            self.maxi = 1657542300000.0
            self.mini = 0.0
            
        elif variable == 'zmom':
            self.maxi = 63409750000000.0
            self.mini = -80423330000000.0
            
        elif variable == 'phi_grav':
            self.maxi = 1695419.0
            self.mini = -409077.1

        elif variable == 'ymom':
            self.maxi = 180579870000000.0
            self.mini = -124431645000000.0
        else:
            print('No variable is given.')
        
    def loadGenModel(self):
        self.gen = tf.keras.models.load_model(self.modelDir)
    