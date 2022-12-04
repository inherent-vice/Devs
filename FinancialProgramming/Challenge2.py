# 1. IBM과 SP 500 INDEX 의 주식 수익률 데이터를 구합니다. (샘플 기간 2012-01-01 - 2016-12-31) 

# 2. 총 샘플 기간 내 둘의 공분산 행렬을 구하세요 (행렬의 대각항에서 벗어나 있는 두 값은 같으므로 대칭 행렬입니다 - 왜 그럴까요?) 

# 3. 21일 거래일 기준 공분산을 구하여 하루씩 윈도우를 움직인 후 총 샘플기간에 대한 시계열 자료를 구합니다. (주의: 행렬의 시계열 자료이므로 샘플 기간 중 맨 앞의 20일 제외한 총 날수에 해당하는 큰 행렬이 만들어질 것입니다) 

# 4. 이 자료를 바탕으로 IBM과 SP500 인덱스의 correlation이 샘플 기간 중 어떻게 움직였는지 살펴보세요. 

# 5. 샘플 기간 내 4번의 correlation과 SP 500 인덱스의 주가 간의 평균적인 관계는 어떻게 되는지 하나의 수치로 제시하세요.
!pip install yfinance
import pandas as pd
import numpy as np
import yfinance as yf

%matplotlib inline
%config InlineBackend.figure_format = 'retina'

import matplotlib.pyplot as plt
import warnings

plt.style.use('seaborn')
plt.rcParams['figure.dpi'] = 300
warnings.simplefilter(action='ignore', category=FutureWarning)
