# DLA-VPS (Visualization)

![pannel](https://user-images.githubusercontent.com/59753286/150677459-e089cde2-8625-4c08-b427-cf9711908c46.png)

## Introduction

This work proposes a deep-learning-assisted visual analysis system, which utilizes a generative adversarial network (GAN) to emulate Nyx simulation and conduct efficient data exploration and analysis. [Nyx](https://amrex-astro.github.io/Nyx/) is a widely used cosmological simulation developed by Lawrence Berkeley National Laboratory.

The trained model acts as the backend analysis framework, facilitating various visual interactions and analysis activities in the system.
The detail of the trained model please check [here](https://github.com/andy1213aa/DLA-VPS_3dGAN).

## Prerequisites
* python-3.7.11
* Anaconda 4.10.1
* python 3.7.11
* tensorflow-gpu 2.3
* cuda 10.1
* cudnn 7.6.5
* flask 2.0.2
* umap-learn (https://umap-learn.readthedocs.io/en/latest/)

## Usage

* Step1: Download the folder `model` by clicking [here](https://drive.google.com/drive/folders/1O5VLNXT3CVkpuehQr8VKPDylcOaakbUh?usp=sharing), which contain the models that are trained on different quantities and different loss functions. 
The directory of the folder `model` should be saved at the same level of the file `app.py`.
* Step2: Run `app.py` to activate the flask server. 
* Step3: Copy the localhost address and paste into the website.
* Step4: Have fun!


## Use Case
### Discovery of Valuable Simulation Parameter Configurations
![changeOfHubble](https://user-images.githubusercontent.com/59753286/150678211-6542e1ff-d767-410d-8423-8bb3122a5e36.png)
### Sub-region Analysis
#### Fig.1
![sunregionComparioson](https://user-images.githubusercontent.com/59753286/150678233-e28024ea-9f84-4423-a8d8-112faedbbe72.png)
#### Fig.2
![usecase_comparisonView_with_click](https://user-images.githubusercontent.com/59753286/150678239-10ed9bb2-581a-4445-b372-5c972a4fb0ca.png)


## Notes
* The details of each visual component and the use cases can be found in the theses [DLA-VPS](https://www.airitilibrary.com/Publication/alDetailedMesh1?DocID=U0021-NTNU40243).
* Anyone is welcome to let us know how to improve in any way.
