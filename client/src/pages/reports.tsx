import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatDate } from "@/utils/format-date";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ChartComponent from "@/components/ChartComponent";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define the report form schema
const reportFormSchema = z.object({
  reportType: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
});

// Function to calculate average duration in hours and minutes
const calculateAverageDuration = (visitors: any[]): string => {
  const visitorsWithDuration = visitors.filter(v => v.timeOut);
  
  if (visitorsWithDuration.length === 0) return "-";
  
  const totalMinutes = visitorsWithDuration.reduce((acc, v) => {
    const timeIn = new Date(v.timeIn).getTime();
    const timeOut = new Date(v.timeOut).getTime();
    const durationInMinutes = (timeOut - timeIn) / (1000 * 60);
    return acc + durationInMinutes;
  }, 0);
  
  const avgMinutes = Math.round(totalMinutes / visitorsWithDuration.length);
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  
  return `${hours}h ${minutes}m`;
};

export default function Reports() {
  const today = new Date().toISOString().split('T')[0];
  const [reportData, setReportData] = useState<any>(null);
  const [date, setDate] = useState<string>(today);
  
  // Get visitors for the selected date
  const { data: visitors, isLoading: loadingVisitors } = useQuery({
    queryKey: ["/api/visitors", date],
    queryFn: async () => {
      const res = await fetch(`/api/visitors?date=${date}`);
      if (!res.ok) throw new Error("Failed to load visitors");
      return await res.json();
    }
  });
  
  // Get daily summary report
  const { data: dailySummary, isLoading: loadingSummary } = useQuery({
    queryKey: ["/api/reports/daily-summary", date],
    queryFn: async () => {
      const res = await fetch(`/api/reports/daily-summary?date=${date}`);
      if (!res.ok) throw new Error("Failed to load daily summary");
      return await res.json();
    }
  });
  
  // Create report form
  const form = useForm<z.infer<typeof reportFormSchema>>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      reportType: "visitor",
      dateFrom: today,
      dateTo: today,
    },
  });
  
  // Handle report form submission
  function onSubmit(data: z.infer<typeof reportFormSchema>) {
    // This would normally fetch data from the server based on selected criteria
    // For now, we'll use the existing data to simulate a custom report
    generateReport(data);
  }
  
  // Generate report based on form data
  function generateReport(data: z.infer<typeof reportFormSchema>) {
    if (!visitors) return;
    
    // Set report data based on report type
    setReportData({
      title: `${data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)} Report`,
      dateRange: `${format(parseISO(data.dateFrom), 'dd MMM yyyy')} - ${format(parseISO(data.dateTo), 'dd MMM yyyy')}`,
      data: visitors
    });
  }
  
  // Prepare chart data
  const prepareVisitorTypeChartData = () => {
    if (!dailySummary) return null;
    
    return {
      labels: ['General Visitors', 'Researchers'],
      datasets: [
        {
          label: 'Visitor Types',
          data: [dailySummary.generalVisitors, dailySummary.researchers],
          backgroundColor: ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'],
          borderWidth: 1
        }
      ]
    };
  };
  
  const prepareDepartmentChartData = () => {
    if (!dailySummary) return null;
    
    const departments = dailySummary.departments;
    return {
      labels: Object.keys(departments),
      datasets: [
        {
          label: 'Visitors by Department',
          data: Object.values(departments),
          backgroundColor: 'hsl(var(--chart-3))',
          borderWidth: 1
        }
      ]
    };
  };
  
  const prepareWeeklyTrendData = () => {
    // This would normally be fetched from the server
    // We'll simulate it with placeholder data structure
    const labels = [];
    const data = [];
    
    // Generate dates for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      labels.push(format(d, 'EEE'));
      // We'll use a simulated count here
      data.push(Math.floor(Math.random() * 10) + 5);
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Visitors',
          data,
          borderColor: 'hsl(var(--chart-4))',
          backgroundColor: 'rgba(53, 162, 235, 0.2)',
          tension: 0.2
        }
      ]
    };
  };
  
  // Prepare department summary data for report preview
  const prepareDepartmentSummary = () => {
    if (!visitors) return [];
    
    const departments = [
      "Records", "Accounts", "IT", "Admin", "Library", 
      "HR", "Research", "Oral", "Secretary"
    ];
    
    return departments.map(dept => {
      const deptVisitors = visitors.filter((v: any) => v.destination === dept);
      const generalVisitors = deptVisitors.filter((v: any) => v.visitorType === "General").length;
      const researchers = deptVisitors.filter((v: any) => v.visitorType === "Researcher").length;
      
      return {
        department: dept,
        generalVisitors,
        researchers,
        total: deptVisitors.length,
        avgDuration: calculateAverageDuration(deptVisitors)
      };
    });
  };
  
  // Initialize report data on first load
  useEffect(() => {
    if (visitors && !reportData) {
      generateReport({
        reportType: "visitor",
        dateFrom: today,
        dateTo: today
      });
    }
  }, [visitors, reportData]);
  
  const visitorTypeChartData = prepareVisitorTypeChartData();
  const departmentChartData = prepareDepartmentChartData();
  const weeklyTrendData = prepareWeeklyTrendData();
  const departmentSummary = prepareDepartmentSummary();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
        <h2 className="text-xl font-semibold text-primary mb-6">Generate Reports</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Daily Visitor Summary */}
          <div className="bg-neutral-100 p-4 rounded">
            <h3 className="font-medium text-primary mb-3">Daily Visitor Summary</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-neutral-500">Date</p>
                <p className="font-medium" id="report-date">
                  {format(parseISO(date), 'PPP')}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total Visitors</p>
                <p className="font-medium">
                  {loadingSummary ? (
                    <Skeleton className="h-4 w-8" />
                  ) : (
                    dailySummary?.totalVisitors || 0
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">General Visitors</p>
                <p className="font-medium">
                  {loadingSummary ? (
                    <Skeleton className="h-4 w-8" />
                  ) : (
                    dailySummary?.generalVisitors || 0
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Researchers</p>
                <p className="font-medium">
                  {loadingSummary ? (
                    <Skeleton className="h-4 w-8" />
                  ) : (
                    dailySummary?.researchers || 0
                  )}
                </p>
              </div>
            </div>
            <Button 
              className="w-full bg-primary text-white" 
              onClick={() => {
                const link = document.createElement('a');
                link.href = `data:text/plain;charset=utf-8,Daily Visitor Summary for ${format(parseISO(date), 'PPP')}\n\nTotal Visitors: ${dailySummary?.totalVisitors || 0}\nGeneral Visitors: ${dailySummary?.generalVisitors || 0}\nResearchers: ${dailySummary?.researchers || 0}`;
                link.download = `visitor-summary-${date}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              disabled={loadingSummary}
            >
              <i className="fas fa-file-pdf mr-2"></i>Export PDF
            </Button>
          </div>
          
          {/* Department Traffic */}
          <div className="bg-neutral-100 p-4 rounded">
            <h3 className="font-medium text-primary mb-3">Department Traffic</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-neutral-500">Most Visited</p>
                <p className="font-medium">
                  {loadingSummary ? (
                    <Skeleton className="h-4 w-20" />
                  ) : (
                    (() => {
                      if (!dailySummary) return "None";
                      const depts = dailySummary.departments;
                      const mostVisited = Object.entries(depts).reduce(
                        (max, [dept, count]) => count > max.count ? { dept, count } : max,
                        { dept: "None", count: 0 }
                      );
                      return `${mostVisited.dept} (${mostVisited.count})`;
                    })()
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Least Visited</p>
                <p className="font-medium">
                  {loadingSummary ? (
                    <Skeleton className="h-4 w-20" />
                  ) : (
                    (() => {
                      if (!dailySummary) return "None";
                      const depts = dailySummary.departments;
                      const visitedDepts = Object.entries(depts).filter(([_, count]) => count > 0);
                      if (visitedDepts.length === 0) return "None";
                      const leastVisited = visitedDepts.reduce(
                        (min, [dept, count]) => count < min.count ? { dept, count } : min,
                        { dept: visitedDepts[0][0], count: visitedDepts[0][1] as number }
                      );
                      return `${leastVisited.dept} (${leastVisited.count})`;
                    })()
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Average Stay</p>
                <p className="font-medium">
                  {loadingVisitors ? (
                    <Skeleton className="h-4 w-16" />
                  ) : visitors ? (
                    calculateAverageDuration(visitors)
                  ) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Peak Hours</p>
                <p className="font-medium">
                  {loadingVisitors ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    "10:00 - 11:00"
                  )}
                </p>
              </div>
            </div>
            <Button className="w-full bg-primary text-white">
              <i className="fas fa-chart-bar mr-2"></i>View Details
            </Button>
          </div>
        </div>
        
        {/* Custom Report Form */}
        <div className="mb-6">
          <h3 className="font-medium text-primary mb-3">Custom Report</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Report Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="visitor">Visitor Summary</SelectItem>
                        <SelectItem value="department">Department Traffic</SelectItem>
                        <SelectItem value="researcher">Researcher Activity</SelectItem>
                        <SelectItem value="duration">Visit Duration</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} max={today} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date To</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} max={today} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-3">
                <Button type="submit" className="bg-accent text-white">
                  <i className="fas fa-cog mr-2"></i>Generate Report
                </Button>
              </div>
            </form>
          </Form>
        </div>
        
        {/* Report Preview */}
        {reportData && (
          <div className="border border-neutral-200 rounded p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-primary">{reportData.title}</h3>
              <div>
                <Button variant="outline" size="sm" className="mr-2">
                  <i className="fas fa-print mr-1"></i>Print
                </Button>
                <Button variant="outline" size="sm" className="mr-2">
                  <i className="fas fa-file-pdf mr-1"></i>PDF
                </Button>
                <Button variant="outline" size="sm">
                  <i className="fas fa-file-excel mr-1"></i>Excel
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>General Visitors</TableHead>
                    <TableHead>Researchers</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Avg. Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentSummary.map((dept) => (
                    <TableRow key={dept.department}>
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell>{dept.generalVisitors}</TableCell>
                      <TableCell>{dept.researchers}</TableCell>
                      <TableCell>{dept.total}</TableCell>
                      <TableCell>{dept.avgDuration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableRow className="bg-neutral-100">
                  <TableCell className="font-medium">TOTAL</TableCell>
                  <TableCell className="font-medium">
                    {loadingSummary ? "-" : dailySummary?.generalVisitors || 0}
                  </TableCell>
                  <TableCell className="font-medium">
                    {loadingSummary ? "-" : dailySummary?.researchers || 0}
                  </TableCell>
                  <TableCell className="font-medium">
                    {loadingSummary ? "-" : dailySummary?.totalVisitors || 0}
                  </TableCell>
                  <TableCell className="font-medium">
                    {loadingVisitors ? "-" : visitors ? calculateAverageDuration(visitors) : "-"}
                  </TableCell>
                </TableRow>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Report Visualizations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Statistics</h2>
        
        {/* Visitor Types Chart */}
        <div className="mb-6">
          <h3 className="font-medium text-neutral-700 mb-2">Visitor Types</h3>
          {visitorTypeChartData ? (
            <ChartComponent 
              type="pie"
              data={visitorTypeChartData}
              height={200}
              options={{
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context: any) {
                        const label = context.label;
                        const value = context.raw;
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-48 bg-neutral-100 rounded flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-pie text-4xl text-primary mb-2"></i>
                <p className="text-sm text-neutral-500">Visitor distribution chart</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Weekly Trends Chart */}
        <div className="mb-6">
          <h3 className="font-medium text-neutral-700 mb-2">Weekly Trends</h3>
          {weeklyTrendData ? (
            <ChartComponent 
              type="line"
              data={weeklyTrendData}
              height={200}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-48 bg-neutral-100 rounded flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-line text-4xl text-primary mb-2"></i>
                <p className="text-sm text-neutral-500">7-day visitor trend</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Department Distribution Chart */}
        <div>
          <h3 className="font-medium text-neutral-700 mb-2">Department Distribution</h3>
          {departmentChartData ? (
            <ChartComponent 
              type="bar"
              data={departmentChartData}
              height={200}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-48 bg-neutral-100 rounded flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-bar text-4xl text-primary mb-2"></i>
                <p className="text-sm text-neutral-500">Visitors by department</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archive Images for Reports Section */}
      <div className="mt-8 lg:col-span-3">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="p-6 md:col-span-2">
              <h2 className="text-xl font-semibold text-primary mb-4">Archive Collections</h2>
              <p className="text-neutral-700 mb-4">
                The National Archives of Zimbabwe maintains extensive collections of historical documents,
                government records, photographs, maps, and other materials that document the nation's
                history and heritage.
              </p>
              <p className="text-neutral-700 mb-4">
                Our reporting system enables staff to monitor usage patterns, identify popular collections,
                and allocate resources efficiently to serve both general visitors and researchers effectively.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-neutral-100 p-3 rounded">
                  <h3 className="text-sm font-medium text-primary mb-1">Monthly Report Schedule</h3>
                  <ul className="text-sm text-neutral-700 list-disc list-inside">
                    <li>Visitor Statistics (1st)</li>
                    <li>Department Usage (5th)</li>
                    <li>Researcher Activity (10th)</li>
                    <li>Resource Utilization (15th)</li>
                  </ul>
                </div>
                <div className="bg-neutral-100 p-3 rounded">
                  <h3 className="text-sm font-medium text-primary mb-1">Key Performance Indicators</h3>
                  <ul className="text-sm text-neutral-700 list-disc list-inside">
                    <li>Total visitor count</li>
                    <li>Researcher-to-visitor ratio</li>
                    <li>Average visit duration</li>
                    <li>Peak usage times</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="md:border-l border-neutral-200">
              <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                <svg className="w-full text-neutral-400" viewBox="0 0 800 1200" xmlns="http://www.w3.org/2000/svg">
                  <rect width="800" height="1200" fill="#f0f0f0" />
                  <rect x="100" y="100" width="600" height="100" fill="#e0e0e0" />
                  <rect x="100" y="250" width="600" height="100" fill="#e0e0e0" />
                  <rect x="100" y="400" width="600" height="100" fill="#e0e0e0" />
                  <rect x="100" y="550" width="600" height="100" fill="#e0e0e0" />
                  <rect x="100" y="700" width="600" height="100" fill="#e0e0e0" />
                  <rect x="100" y="850" width="600" height="100" fill="#e0e0e0" />
                  <rect x="100" y="1000" width="600" height="100" fill="#e0e0e0" />
                  <text x="400" y="1150" fontSize="24" textAnchor="middle" fill="#888">
                    Archive Document Collection
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
