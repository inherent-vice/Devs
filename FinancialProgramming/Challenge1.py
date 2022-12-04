import numpy_financial as npf
from matplotlib.pyplot import *
cashflows = [504,-432,-432,-432,832]
rate = []
npv = []
x=(0,0.3)
y=(0,0)

for i in range(1,30000):
  rate.append(0.00001*i)
  npv.append(npf.npv(0.00001*i, cashflows))
  npv1 = npf.npv(0.00001*i, cashflows)
  npv2 = npf.npv(0.00001*(i+1), cashflows)
  if npv1 >= 0 and npv2 <= 0:
    print("미분값 음수 IRR = ", 0.00001*i)
    a = 0.00001*i
  elif npv1 <= 0 and npv2 >= 0:
    print("미분값 양수 IRR = ", 0.00001*i)
    b = 0.00001*i


title("NPV profile")
xlabel("Discount rate")
ylabel("NPV")
plot(rate,npv)
plot(x,y)
scatter(a,0)
scatter(b,0)
annotate(a,(a,0),(0.1,10),arrowprops={'color':'red'})
annotate(b,(b,0),(0.1,5),arrowprops={'color':'green'})
show()

npf.irr(cashflows)