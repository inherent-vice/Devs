"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { useBillingStore, type CostRecord } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function BillingPage() {
  const { records, monthlyBudget, addRecord, setMonthlyBudget, getMonthlyTotal } = useBillingStore();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [newBudget, setNewBudget] = useState(monthlyBudget.toString());


  // Filter records by time range
  const filteredRecords = useMemo(() => {
    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
      case "7d":
        cutoffDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "30d":
        cutoffDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "90d":
        cutoffDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        cutoffDate = new Date(0);
    }

    return records.filter((r) => new Date(r.date) >= cutoffDate);
  }, [records, timeRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCost = filteredRecords.reduce((sum, r) => sum + r.total, 0);
    const avgCostPerVideo = filteredRecords.length > 0 ? totalCost / filteredRecords.length : 0;

    const breakdown = filteredRecords.reduce(
      (acc, r) => ({
        research: acc.research + r.breakdown.research,
        production: acc.production + r.breakdown.production,
        quality: acc.quality + r.breakdown.quality,
        thumbnails: acc.thumbnails + r.breakdown.thumbnails,
      }),
      { research: 0, production: 0, quality: 0, thumbnails: 0 }
    );

    // Calculate month-over-month change
    const thisMonthTotal = getMonthlyTotal();
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);

    const lastMonthTotal = records
      .filter((r) => {
        const date = new Date(r.date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, r) => sum + r.total, 0);

    const monthChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return {
      totalCost,
      avgCostPerVideo,
      breakdown,
      thisMonthTotal,
      lastMonthTotal,
      monthChange,
      videoCount: filteredRecords.length,
    };
  }, [filteredRecords, records, getMonthlyTotal]);

  // Budget usage
  const budgetUsage = (stats.thisMonthTotal / monthlyBudget) * 100;
  const isOverBudget = budgetUsage > 100;
  const isNearBudget = budgetUsage > 80;

  // Daily costs for chart
  const dailyCosts = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      days[key] = 0;
    }

    filteredRecords.forEach((r) => {
      if (days[r.date] !== undefined) {
        days[r.date] += r.total;
      }
    });

    return Object.entries(days).map(([date, cost]) => ({ date, cost }));
  }, [filteredRecords]);

  const maxDailyCost = Math.max(...dailyCosts.map((d) => d.cost), 1);

  const handleSaveBudget = () => {
    const budget = parseFloat(newBudget);
    if (isNaN(budget) || budget <= 0) {
      toast.error("유효한 금액을 입력해주세요");
      return;
    }
    setMonthlyBudget(budget);
    toast.success("예산이 업데이트되었습니다");
    setBudgetDialogOpen(false);
  };

  const exportRecords = () => {
    const csv = [
      ["Date", "Project", "Research", "Production", "Quality", "Thumbnails", "Total"],
      ...filteredRecords.map((r) => [
        r.date,
        r.projectTitle,
        r.breakdown.research.toFixed(2),
        r.breakdown.production.toFixed(2),
        r.breakdown.quality.toFixed(2),
        r.breakdown.thumbnails.toFixed(2),
        r.total.toFixed(2),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("비용 데이터가 내보내졌습니다");
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            비용 관리
          </h1>
          <p className="text-muted-foreground">API 사용 비용을 추적하고 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v: typeof timeRange) => setTimeRange(v)}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">최근 7일</SelectItem>
              <SelectItem value="30d">최근 30일</SelectItem>
              <SelectItem value="90d">최근 90일</SelectItem>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportRecords}>
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Budget Alert */}
      {isOverBudget && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">월간 예산 초과</p>
              <p className="text-sm text-muted-foreground">
                이번 달 비용이 예산 {formatCurrency(monthlyBudget)}을 초과했습니다.
              </p>
            </div>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(true)}>
              예산 조정
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* This Month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              이번 달 비용
              {stats.monthChange !== 0 && (
                <Badge variant={stats.monthChange > 0 ? "destructive" : "default"} className="text-xs">
                  {stats.monthChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(stats.monthChange).toFixed(0)}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonthTotal)}</div>
            <Progress
              value={Math.min(budgetUsage, 100)}
              className={`mt-2 h-2 ${isOverBudget ? "[&>div]:bg-destructive" : isNearBudget ? "[&>div]:bg-yellow-500" : ""}`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              예산 {formatCurrency(monthlyBudget)} 중 {budgetUsage.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              기간 총 비용
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.videoCount}개 영상
            </p>
          </CardContent>
        </Card>

        {/* Average Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              영상당 평균 비용
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgCostPerVideo)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {timeRange === "7d" ? "지난 7일" : timeRange === "30d" ? "지난 30일" : timeRange === "90d" ? "지난 90일" : "전체"} 기준
            </p>
          </CardContent>
        </Card>

        {/* Budget Settings */}
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setBudgetDialogOpen(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              월간 예산
              <Settings className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">클릭하여 수정</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Cost Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              일별 비용
            </CardTitle>
            <CardDescription>지난 30일간의 일별 비용 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end gap-1">
              {dailyCosts.map((day, i) => (
                <div
                  key={day.date}
                  className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t relative group"
                  style={{ height: `${(day.cost / maxDailyCost) * 100}%`, minHeight: "2px" }}
                >
                  {day.cost > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                      {formatDate(day.date)}: {formatCurrency(day.cost)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>30일 전</span>
              <span>오늘</span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              비용 구성
            </CardTitle>
            <CardDescription>항목별 비용 비율</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "프로덕션", value: stats.breakdown.production, color: "bg-blue-500" },
              { label: "품질 평가", value: stats.breakdown.quality, color: "bg-yellow-500" },
              { label: "리서치", value: stats.breakdown.research, color: "bg-purple-500" },
              { label: "썸네일", value: stats.breakdown.thumbnails, color: "bg-green-500" },
            ].map((item) => {
              const percentage = stats.totalCost > 0 ? (item.value / stats.totalCost) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      {item.label}
                    </span>
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                  </div>
                  <Progress value={percentage} className={`h-2 [&>div]:${item.color}`} />
                  <div className="text-xs text-muted-foreground text-right">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            최근 비용 내역
          </CardTitle>
          <CardDescription>최근 발생한 비용 기록</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              비용 기록이 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {filteredRecords.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <div className="font-medium">{record.projectTitle}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(record.date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(record.total)}</div>
                    <div className="text-xs text-muted-foreground">
                      R: ${record.breakdown.research.toFixed(2)} |
                      P: ${record.breakdown.production.toFixed(2)} |
                      Q: ${record.breakdown.quality.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>월간 예산 설정</DialogTitle>
            <DialogDescription>
              월간 API 사용 예산을 설정합니다. 예산 초과 시 알림을 받을 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="budget">월간 예산 (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="budget"
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="pl-10"
                  placeholder="100.00"
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              현재 이번 달 사용량: {formatCurrency(stats.thisMonthTotal)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveBudget}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
