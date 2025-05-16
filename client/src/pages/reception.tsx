import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import useTabState from "@/hooks/use-tab-state";
import { formatDate } from "@/utils/format-date";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { VisitorTable } from "@/components/VisitorTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Define the visitor form schema
const visitorFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  idNumber: z.string().min(2, "ID number is required"),
  phoneNumber: z.string().min(9, "Phone number is required"),
  visitorType: z.enum(["General", "Researcher"]),
  destination: z.string().min(1, "Destination is required"),
  timeIn: z.string().transform((val) => new Date(val).toISOString()),
  // Optional researcher fields
  institute: z.string().optional(),
  researchArea: z.string().optional(),
  homeAddress: z.string().optional(),
  // These will be added on the back-end
  ticketNumber: z.string().optional(),
  feePaid: z.boolean().optional(),
});

// Checkout form schema
const checkoutFormSchema = z.object({
  searchTerm: z.string().min(3, "Enter at least 3 characters to search"),
});

export default function Reception() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useTabState("checkin", ["checkin", "checkout"]);
  const [foundVisitor, setFoundVisitor] = useState<any>(null);
  
  // Get visitors for today
  const { data: visitors, isLoading: loadingVisitors } = useQuery({
    queryKey: ["/api/visitors"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/visitors?date=${today}`);
      if (!res.ok) throw new Error("Failed to load visitors");
      return await res.json();
    }
  });
  
  // Get checked-in visitors
  const { data: checkedInVisitors, isLoading: loadingCheckedIn } = useQuery({
    queryKey: ["/api/visitors/checkedin"],
    queryFn: async () => {
      const res = await fetch("/api/visitors/checkedin");
      if (!res.ok) throw new Error("Failed to load checked-in visitors");
      return await res.json();
    }
  });
  
  // Create check-in form
  const form = useForm<z.infer<typeof visitorFormSchema>>({
    resolver: zodResolver(visitorFormSchema),
    defaultValues: {
      fullName: "",
      idNumber: "",
      phoneNumber: "",
      visitorType: "General",
      destination: "",
      timeIn: new Date().toISOString(),
      institute: "",
      researchArea: "",
      homeAddress: "",
    },
  });
  
  // Create check-out search form
  const checkoutForm = useForm<z.infer<typeof checkoutFormSchema>>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      searchTerm: "",
    },
  });
  
  // Mutation to create a visitor
  const { mutate: createVisitor, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof visitorFormSchema>) => {
      const res = await apiRequest("POST", "/api/visitors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/checkedin"] });
      
      form.reset({
        fullName: "",
        idNumber: "",
        phoneNumber: "",
        visitorType: "General",
        destination: "",
        timeIn: new Date().toISOString(),
        institute: "",
        researchArea: "",
        homeAddress: "",
      });
      
      toast({
        title: "Visitor checked in successfully",
        description: "The visitor has been recorded in the system.",
      });
    },
    onError: () => {
      toast({
        title: "Error checking in visitor",
        description: "There was an error checking in the visitor. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to check out a visitor
  const { mutate: checkoutVisitor, isPending: isCheckingOut } = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/visitors/${id}/checkout`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/checkedin"] });
      
      checkoutForm.reset({
        searchTerm: "",
      });
      
      setFoundVisitor(null);
      
      toast({
        title: "Visitor checked out successfully",
        description: "The visitor has been checked out of the system.",
      });
    },
    onError: () => {
      toast({
        title: "Error checking out visitor",
        description: "There was an error checking out the visitor. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle check-in form submission
  function onSubmit(data: z.infer<typeof visitorFormSchema>) {
    createVisitor(data);
  }
  
  // Handle ID search for checkout
  async function onSearchVisitor(data: z.infer<typeof checkoutFormSchema>) {
    try {
      const res = await fetch(`/api/visitors/idnumber/${data.searchTerm}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          toast({
            title: "Visitor not found",
            description: "No active visitor found with this ID number.",
            variant: "destructive",
          });
          setFoundVisitor(null);
          return;
        }
        throw new Error("Failed to search for visitor");
      }
      
      const visitor = await res.json();
      setFoundVisitor(visitor);
    } catch (err) {
      toast({
        title: "Error searching for visitor",
        description: "There was an error searching for the visitor. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  const visitorType = form.watch("visitorType");
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Check-in/Check-out Form Card */}
      <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-primary">Visitor Check-in</h2>
          <div className="flex">
            <Button
              variant={tab === "checkin" ? "default" : "outline"}
              className={tab === "checkin" ? "" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}
              onClick={() => setTab("checkin")}
            >
              <i className="fas fa-sign-in-alt mr-2"></i>Check-in
            </Button>
            <Button
              variant={tab === "checkout" ? "default" : "outline"}
              className={`ml-2 ${tab === "checkout" ? "" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}
              onClick={() => setTab("checkout")}
            >
              <i className="fas fa-sign-out-alt mr-2"></i>Check-out
            </Button>
          </div>
        </div>

        {/* Check-in Form */}
        {tab === "checkin" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4 md:col-span-2">
                <FormField
                  control={form.control}
                  name="visitorType"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>Visitor Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="General" id="general" />
                            <Label htmlFor="general">General Visitor</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Researcher" id="researcher" />
                            <Label htmlFor="researcher">Researcher</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Number*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ID number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Records">Records</SelectItem>
                        <SelectItem value="Accounts">Accounts</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Library">Library</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Research">Research</SelectItem>
                        <SelectItem value="Oral">Oral</SelectItem>
                        <SelectItem value="Secretary">Secretary</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Researcher-specific fields */}
              {visitorType === "Researcher" && (
                <div className="md:col-span-2 p-4 bg-blue-50 rounded mb-4">
                  <h3 className="font-medium text-primary mb-2">Researcher Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="institute"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Institute of Affiliation</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter institute" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="researchArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specific Area of Study</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter research area" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="homeAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter home address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-start mt-4">
                      <div className="bg-primary/10 p-3 rounded">
                        <h4 className="text-primary text-sm font-medium mb-1">
                          <i className="fas fa-info-circle mr-1"></i> Note
                        </h4>
                        <p className="text-sm text-neutral-700">
                          Researchers must proceed to Accounts to pay the required fee before accessing the Library.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="md:col-span-2 mt-2">
                <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
                  {isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <i className="fas fa-check-circle mr-2"></i>Complete Check-in
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Check-out Form */}
        {tab === "checkout" && (
          <Form {...checkoutForm}>
            <form onSubmit={checkoutForm.handleSubmit(onSearchVisitor)} className="grid grid-cols-1 gap-4">
              <div className="mb-6">
                <FormField
                  control={checkoutForm.control}
                  name="searchTerm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search by ID Number</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <Input 
                            placeholder="Enter ID number" 
                            {...field} 
                            className="rounded-r-none"
                          />
                        </FormControl>
                        <Button 
                          type="submit" 
                          className="rounded-l-none"
                        >
                          <i className="fas fa-search"></i>
                        </Button>
                      </div>
                      <FormDescription>Enter the visitor's ID number to find their record</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {foundVisitor && (
                <Card className="mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-primary">Visitor Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-neutral-500">Full Name</Label>
                        <p className="font-medium">{foundVisitor.fullName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-neutral-500">ID Number</Label>
                        <p className="font-medium">{foundVisitor.idNumber}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-neutral-500">Destination</Label>
                        <p className="font-medium">{foundVisitor.destination}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-neutral-500">Check-in Time</Label>
                        <p className="font-medium">
                          {formatDate(foundVisitor.timeIn, "hh:mm a")}
                        </p>
                      </div>
                      <div className="col-span-2 mt-4">
                        <Button 
                          onClick={() => checkoutVisitor(foundVisitor.id)}
                          disabled={isCheckingOut}
                          className="w-full"
                        >
                          {isCheckingOut ? (
                            <>Processing...</>
                          ) : (
                            <>
                              <i className="fas fa-sign-out-alt mr-2"></i>Complete Check-out
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>
          </Form>
        )}
      </div>

      {/* Today's Visitors Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Today's Visitors</h2>
        
        <div className="flex justify-between mb-4">
          <div>
            <span className="text-sm font-medium">Total: </span>
            <Badge variant="default" className="bg-primary">
              {loadingVisitors ? "..." : visitors?.length || 0}
            </Badge>
          </div>
          <div>
            <span className="text-sm font-medium">Currently In: </span>
            <Badge variant="default" className="bg-accent">
              {loadingCheckedIn ? "..." : checkedInVisitors?.length || 0}
            </Badge>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[600px]">
          {loadingVisitors ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[70px]" />
                </div>
              ))}
            </div>
          ) : visitors?.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Destination</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {visitors.map((visitor: any) => (
                  <tr key={visitor.id}>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-neutral-700">{visitor.fullName}</div>
                      <div className="text-xs text-neutral-500">ID: {visitor.idNumber}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-neutral-700">{visitor.destination}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        visitor.status === "CheckedIn" 
                          ? "bg-accent bg-opacity-20 text-accent" 
                          : "bg-success bg-opacity-20 text-success"
                      }`}>
                        {visitor.status === "CheckedIn" ? "Checked In" : "Checked Out"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-neutral-500">
              No visitors for today
            </div>
          )}
        </div>
      </div>

      {/* Recent Check-ins Section with image */}
      <div className="mt-8 lg:col-span-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden lg:col-span-2">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-primary mb-4">Reception Activity</h2>
              
              {loadingVisitors ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[70px]" />
                    </div>
                  ))}
                </div>
              ) : visitors?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">ID Number</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Destination</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Time In</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Time Out</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {visitors.map((visitor: any) => (
                        <tr key={visitor.id}>
                          <td className="px-4 py-3 text-sm font-medium text-neutral-700">{visitor.fullName}</td>
                          <td className="px-4 py-3 text-sm text-neutral-700">{visitor.idNumber}</td>
                          <td className="px-4 py-3 text-sm text-neutral-700">{visitor.destination}</td>
                          <td className="px-4 py-3 text-sm text-neutral-700">
                            {formatDate(visitor.timeIn, "hh:mm a")}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-700">
                            {visitor.timeOut ? formatDate(visitor.timeOut, "hh:mm a") : "--"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              visitor.visitorType === "Researcher" 
                                ? "bg-primary bg-opacity-20 text-primary" 
                                : "bg-neutral-200 text-neutral-700"
                            }`}>
                              {visitor.visitorType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-neutral-500">
                  No reception activity for today
                </div>
              )}
            </div>
          </div>
          
          {/* Reception desk image */}
          <div className="rounded-lg shadow-md overflow-hidden">
            <div className="w-full h-64 bg-neutral-200 flex items-center justify-center">
              <svg className="w-full h-full text-neutral-400" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
                <rect width="800" height="600" fill="#f5f5f5" />
                <rect x="150" y="150" width="500" height="300" fill="#e6e6e6" rx="10" />
                <rect x="200" y="200" width="400" height="50" fill="#d4d4d4" rx="5" />
                <rect x="200" y="270" width="400" height="80" fill="#d4d4d4" rx="5" />
                <rect x="200" y="370" width="190" height="50" fill="#d4d4d4" rx="5" />
                <rect x="410" y="370" width="190" height="50" fill="#d4d4d4" rx="5" />
                <text x="400" y="480" fontSize="24" textAnchor="middle" fill="#888">
                  National Archives Reception Desk
                </text>
              </svg>
            </div>
            <div className="p-4 bg-white">
              <h3 className="font-medium text-primary mb-2">Reception Services</h3>
              <p className="text-sm text-neutral-700">
                The reception desk is the first point of contact for all visitors. 
                Staff are available to assist with check-in procedures and direct 
                visitors to their destinations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
