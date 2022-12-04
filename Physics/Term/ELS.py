import pandas as pd
import numpy as np
import datetime

data = pd.read_csv("KRX_adj_except_div.csv", encoding="CP949", index_col="Unnamed: 0")

ELS_data = data[["015760", "086790"]]
ELS_before_start = ELS_data.loc["20060518":].dropna()
ELS_after_start = ELS_data.loc["20080518":"20060518"]

ELS_before_start["015760"] = ELS_before_start["015760"] / ELS_before_start[
    "015760"
].shift(-1)
ELS_before_start["086790"] = ELS_before_start["086790"] / ELS_before_start[
    "086790"
].shift(-1)

corr = ELS_before_start.corr().iloc[0, 1]
sigma1 = ELS_before_start["015760"].std()
sigma2 = ELS_before_start["086790"].std()
print(sigma1, sigma2, corr)

# 한국전력의 일별 수익률 분포
(ELS_before_start["015760"] - 1).hist(bins=20)
# 하나금융지주의 일별 수익률 분포
(ELS_before_start["086790"] - 1).hist(bins=20)

n_days = ELS_after_start.shape[0]  ### 만들 데이터 크기 정의
div1 = 0  ##배당률은 0으로 가정
div2 = 0
r = 0.05 / 365  # 무위험 이자율
T = 1  # 일간 변동성을 이용하여 데이터를 만드는 것이므로 T==1
simul_data1 = np.ones(n_days)
simul_data2 = np.ones(n_days)
x1 = np.random.normal(size=n_days)  ### 정규분포 (0,1) 생성
x2 = np.random.normal(size=n_days)

e1 = x1
e2 = corr * x1 + x2 * np.sqrt(1 - pow(corr, 2))  ###몬테카를로 변수

###가상 데이터 생성
simul_data1 = simul_data1 / np.exp(
    (div1 - r - pow(sigma1, 2) / 2) * T + sigma1 * e1 * np.sqrt(T)
)
simul_data2 = simul_data2 / np.exp(
    (div2 - r - pow(sigma2, 2) / 2) * T + sigma2 * e2 * np.sqrt(T)
)

simul_data = pd.DataFrame(columns=ELS_after_start.columns, index=ELS_after_start.index)
simul_data["015760"] = simul_data1
simul_data["086790"] = simul_data2
simul_data.index = pd.to_datetime(simul_data.index, format="%Y%m%d")
simul_data.plot()

simul_data["015760"][::-1].cumprod().plot()
simul_data["086790"][::-1].cumprod().plot()

simul_data["015760"] = simul_data["015760"][::-1].cumprod()[::-1]
simul_data["086790"] = simul_data["086790"][::-1].cumprod()[::-1]
simul_data = simul_data[::-1]

case = 0

time1 = simul_data.index[0] + datetime.timedelta(days=186)
time2 = simul_data.index[0] + datetime.timedelta(days=365)
time3 = simul_data.index[0] + datetime.timedelta(days=365 + 185)
time4 = simul_data.index[0] + datetime.timedelta(days=365 + 364)
profit = 0
if simul_data["015760"].loc[time1] > 0.85 and simul_data["086790"].loc[time1] > 0.85:
    case = 1
    profit = pow(1.125, 0.5) / pow(1 + r * 365, 0.5)
elif simul_data["015760"].loc[time2] > 0.8 and simul_data["086790"].loc[time2] > 0.80:
    case = 2
    profit = pow(1.125, 1) / pow(1 + r * 365, 1)
elif simul_data["015760"].loc[time3] > 0.75 and simul_data["086790"].loc[time3] > 0.75:
    case = 3
    profit = pow(1.125, 1.5) / pow(1 + r * 365, 1.5)
elif simul_data["015760"].loc[time4] > 0.70 and simul_data["086790"].loc[time4] > 0.70:
    case = 4
    profit = pow(1.125, 2) / pow(1 + r * 365, 2)
### 60퍼 이상 하락한적이 없는경우
if simul_data[simul_data < 0.6].dropna().shape[0] == 0 and (
    simul_data["015760"].loc[time4] < 0.70 or simul_data["086790"].loc[time4] < 0.70
):
    case = 5
    profit = 1 / pow(1 + r * 365, 2)
### 60퍼 이상 하락한적이 있는경우
if simul_data[simul_data < 0.6].dropna().shape[0] != 0 and (
    simul_data["015760"].loc[time4] < 0.70 or simul_data["086790"].loc[time4] < 0.70
):
    case = 6
    profit = min(
        simul_data["015760"].loc[time4], simul_data["086790"].loc[time4]
    ) / pow(1 + r * 365, 2)
print(case, profit)

##몬테 카를로 시뮬레션을 이용한 가상 데이터 생성

n_days = ELS_after_start.shape[0]  ### 만들 데이터 크기 정의
div1 = 0  ##배당률
div2 = 0
r = 0.05 / 365  # 무위험 이자율
T = 1  # 일간 변동성을 이용하여 데이터를 만드는 것이므로 T==1

# N개의 시뮬레이션 생성
N = 100
simul_data1 = np.ones((n_days, N))
simul_data2 = np.ones((n_days, N))
x1 = np.random.normal(size=(n_days, N))  ### 정규분포 (0,1) 생성
x2 = np.random.normal(size=(n_days, N))

e1 = x1
e2 = corr * x1 + x2 * np.sqrt(1 - pow(corr, 2))  ###몬테카를로 변수
simul_data1 = simul_data1 / np.exp(
    (div1 - r - pow(sigma1, 2) / 2) * T + sigma1 * e1 * np.sqrt(T)
)
simul_data2 = simul_data2 / np.exp(
    (div2 - r - pow(sigma2, 2) / 2) * T + sigma2 * e2 * np.sqrt(T)
)

case_list = []
profit_list = []
for i in range(N):
    simul_data = pd.DataFrame(
        columns=ELS_after_start.columns, index=ELS_after_start.index
    )
    simul_data["015760"] = simul_data1[:, i]
    simul_data["086790"] = simul_data2[:, i]
    simul_data.index = pd.to_datetime(simul_data.index, format="%Y%m%d")
    simul_data["015760"] = simul_data["015760"][::-1].cumprod()[::-1]
    simul_data["086790"] = simul_data["086790"][::-1].cumprod()[::-1]
    simul_data = simul_data[::-1]

    case = 0

    time1 = simul_data.index[0] + datetime.timedelta(days=186)
    time2 = simul_data.index[0] + datetime.timedelta(days=365)
    time3 = simul_data.index[0] + datetime.timedelta(days=365 + 185)
    time4 = simul_data.index[0] + datetime.timedelta(days=365 + 364)
    profit = 0
    if (
        simul_data["015760"].loc[time1] > 0.85
        and simul_data["086790"].loc[time1] > 0.85
    ):
        case = 1
        profit = pow(1.125, 0.5) / pow(1 + r * 365, 0.5)
    elif (
        simul_data["015760"].loc[time2] > 0.8 and simul_data["086790"].loc[time2] > 0.80
    ):
        case = 2
        profit = pow(1.125, 1) / pow(1 + r * 365, 1)
    elif (
        simul_data["015760"].loc[time3] > 0.75
        and simul_data["086790"].loc[time3] > 0.75
    ):
        case = 3
        profit = pow(1.125, 1.5) / pow(1 + r * 365, 1.5)
    elif (
        simul_data["015760"].loc[time4] > 0.70
        and simul_data["086790"].loc[time4] > 0.70
    ):
        case = 4
        profit = pow(1.125, 2) / pow(1 + r * 365, 2)
    ### 60퍼 이상 하락한적이 없는경우
    if simul_data[simul_data < 0.6].dropna().shape[0] == 0 and (
        simul_data["015760"].loc[time4] < 0.70 or simul_data["086790"].loc[time4] < 0.70
    ):
        case = 5
        profit = 1 / pow(1 + r * 365, 2)
    ### 60퍼 이상 하락한적이 있는경우
    if simul_data[simul_data < 0.6].dropna().shape[0] != 0 and (
        simul_data["015760"].loc[time4] < 0.70 or simul_data["086790"].loc[time4] < 0.70
    ):
        case = 6
        profit = min(
            simul_data["015760"].loc[time4], simul_data["086790"].loc[time4]
        ) / pow(1 + r * 365, 2)
    case_list.append(case)
    profit_list.append(profit)
