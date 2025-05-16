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
import { Textarea } from "@/components/ui/textarea";
import { LibraryResearcherTable } from "@/components/LibraryResearcherTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Define the library check-in form schema
const libraryCheckInSchema = z.object({
  visitorId: z.number().min(1, "Visitor ID is required"),
  ticketNumber: z.string().min(1, "Ticket number is required"),
  specificStudyArea: z.string().min(1, "Study area is required"),
  materialsRequested: z.string().optional(),
  controlOfficer: z.string().min(1, "Control officer is required"),
  checkInTime: z.string().transform((val) => new Date(val).toISOString()),
});

// Define the library check-out form schema
const libraryCheckOutSchema = z.object({
  searchTerm: z.string().min(3, "Enter at least 3 characters to search"),
  notes: z.string().optional(),
});

// Search form schema
const searchResearcherSchema = z.object({
  searchTerm: z.string().min(3, "Enter at least 3 characters to search"),
});

export default function Library() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useTabState("checkin", ["checkin", "checkout"]);
  const [foundVisitor, setFoundVisitor] = useState<any>(null);
  const [foundLibraryVisit, setFoundLibraryVisit] = useState<any>(null);
  
  // Get library visits for today
  const { data: libraryVisits, isLoading: loadingVisits } = useQuery({
    queryKey: ["/api/library/visits"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/library/visits?date=${today}`);
      if (!res.ok) throw new Error("Failed to load library visits");
      return await res.json();
    }
  });
  
  // Get checked-in library visits
  const { data: checkedInVisits, isLoading: loadingCheckedIn } = useQuery({
    queryKey: ["/api/library/visits/checkedin"],
    queryFn: async () => {
      const res = await fetch("/api/library/visits/checkedin");
      if (!res.ok) throw new Error("Failed to load checked-in library visits");
      return await res.json();
    }
  });
  
  // Create library check-in form
  const form = useForm<z.infer<typeof libraryCheckInSchema>>({
    resolver: zodResolver(libraryCheckInSchema),
    defaultValues: {
      visitorId: 0,
      ticketNumber: "",
      specificStudyArea: "",
      materialsRequested: "",
      controlOfficer: "",
      checkInTime: new Date().toISOString(),
    },
  });
  
  // Create library check-out form
  const checkoutForm = useForm<z.infer<typeof libraryCheckOutSchema>>({
    resolver: zodResolver(libraryCheckOutSchema),
    defaultValues: {
      searchTerm: "",
      notes: "",
    },
  });
  
  // Create researcher search form
  const searchForm = useForm<z.infer<typeof searchResearcherSchema>>({
    resolver: zodResolver(searchResearcherSchema),
    defaultValues: {
      searchTerm: "",
    },
  });
  
  // Mutation to create a library visit
  const { mutate: createLibraryVisit, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof libraryCheckInSchema>) => {
      const res = await apiRequest("POST", "/api/library/visits", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/library/visits/checkedin"] });
      
      form.reset({
        visitorId: 0,
        ticketNumber: "",
        specificStudyArea: "",
        materialsRequested: "",
        controlOfficer: "",
        checkInTime: new Date().toISOString(),
      });
      
      setFoundVisitor(null);
      
      toast({
        title: "Researcher checked in successfully",
        description: "The researcher has been checked into the library.",
      });
    },
    onError: () => {
      toast({
        title: "Error checking in researcher",
        description: "There was an error checking in the researcher. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to check out a library visit
  const { mutate: checkoutLibraryVisit, isPending: isCheckingOut } = useMutation({
    mutationFn: async (data: { id: number, notes: string }) => {
      const res = await apiRequest("PATCH", `/api/library/visits/${data.id}/checkout`, { notes: data.notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/library/visits/checkedin"] });
      
      checkoutForm.reset({
        searchTerm: "",
        notes: "",
      });
      
      setFoundLibraryVisit(null);
      
      toast({
        title: "Researcher checked out successfully",
        description: "The researcher has been checked out of the library.",
      });
    },
    onError: () => {
      toast({
        title: "Error checking out researcher",
        description: "There was an error checking out the researcher. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle library check-in form submission
  function onSubmit(data: z.infer<typeof libraryCheckInSchema>) {
    createLibraryVisit(data);
  }
  
  // Handle library check-out form submission
  function onCheckout(data: z.infer<typeof libraryCheckOutSchema>) {
    if (!foundLibraryVisit) return;
    
    checkoutLibraryVisit({
      id: foundLibraryVisit.id,
      notes: data.notes || "",
    });
  }
  
  // Handle visitor search for check-in
  async function onSearchResearcher(data: z.infer<typeof searchResearcherSchema>) {
    try {
      const res = await fetch(`/api/visitors/idnumber/${data.searchTerm}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          toast({
            title: "Researcher not found",
            description: "No active researcher found with this ID number.",
            variant: "destructive",
          });
          setFoundVisitor(null);
          return;
        }
        throw new Error("Failed to search for researcher");
      }
      
      const visitor = await res.json();
      
      // Validate that this is a researcher
      if (visitor.visitorType !== "Researcher") {
        toast({
          title: "Not a researcher",
          description: "This visitor is not registered as a researcher.",
          variant: "destructive",
        });
        setFoundVisitor(null);
        return;
      }
      
      // Generate ticket number if not present
      const ticketNumber = visitor.ticketNumber || `NAZ-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      setFoundVisitor({
        ...visitor,
        ticketNumber,
      });
      
      // Pre-fill the form
      form.setValue("visitorId", visitor.id);
      form.setValue("ticketNumber", ticketNumber);
      if (visitor.researchArea) {
        form.setValue("specificStudyArea", visitor.researchArea);
      }
    } catch (err) {
      toast({
        title: "Error searching for researcher",
        description: "There was an error searching for the researcher. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  // Handle ticket search for check-out
  async function onSearchTicket(data: z.infer<typeof libraryCheckOutSchema>) {
    try {
      const res = await fetch(`/api/library/visits/ticket/${data.searchTerm}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          toast({
            title: "Library visit not found",
            description: "No active library visit found with this ticket number.",
            variant: "destructive",
          });
          setFoundLibraryVisit(null);
          return;
        }
        throw new Error("Failed to search for library visit");
      }
      
      const visit = await res.json();
      setFoundLibraryVisit(visit);
    } catch (err) {
      toast({
        title: "Error searching for library visit",
        description: "There was an error searching for the library visit. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Library Check-in/Check-out Form Card */}
      <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-primary">Library Researcher Control</h2>
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

        {/* Library Check-in Form */}
        {tab === "checkin" && (
          <>
            <Form {...searchForm}>
              <form onSubmit={searchForm.handleSubmit(onSearchResearcher)} className="mb-6">
                <FormField
                  control={searchForm.control}
                  name="searchTerm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Researcher by ID Number</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <Input 
                            placeholder="Enter researcher ID number" 
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
                      <FormDescription>
                        Only researchers who have completed payment at Accounts are eligible for library check-in
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            
            {foundVisitor && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="visitorId"
                    render={({ field }) => (
                      <input type="hidden" {...field} value={foundVisitor.id} />
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="checkInTime"
                    render={({ field }) => (
                      <input type="hidden" {...field} />
                    )}
                  />
                  
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <Input 
                      value={foundVisitor.fullName} 
                      readOnly 
                      className="bg-neutral-100" 
                    />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>ID Number</FormLabel>
                    <Input 
                      value={foundVisitor.idNumber} 
                      readOnly 
                      className="bg-neutral-100" 
                    />
                  </FormItem>
                  
                  <FormField
                    control={form.control}
                    name="ticketNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Number*</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            readOnly={!!foundVisitor.ticketNumber}
                            className={foundVisitor.ticketNumber ? "bg-neutral-100" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specificStudyArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Area of Study*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter specific study area" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="materialsRequested"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Materials Requested</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="List specific documents, archives, or materials the researcher is requesting" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="controlOfficer"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Control Desk Officer on Duty*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Officer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="T. Maraire">T. Maraire</SelectItem>
                            <SelectItem value="S. Chitongo">S. Chitongo</SelectItem>
                            <SelectItem value="N. Dube">N. Dube</SelectItem>
                            <SelectItem value="P. Zengeni">P. Zengeni</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="md:col-span-2 mt-4">
                    <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
                      {isPending ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <i className="fas fa-check-circle mr-2"></i>Complete Library Check-in
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </>
        )}

        {/* Library Check-out Form */}
        {tab === "checkout" && (
          <Form {...checkoutForm}>
            <form onSubmit={checkoutForm.handleSubmit(onSearchTicket)} className="mb-6">
              <FormField
                control={checkoutForm.control}
                name="searchTerm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search by Ticket Number</FormLabel>
                    <div className="flex">
                      <FormControl>
                        <Input 
                          placeholder="Enter ticket number" 
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
            
            {foundLibraryVisit && (
              <>
                <Card className="mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-primary">Researcher Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-neutral-500">Ticket Number</Label>
                        <p className="font-medium">{foundLibraryVisit.ticketNumber}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-neutral-500">Visitor ID</Label>
                        <p className="font-medium">{foundLibraryVisit.visitorId}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-neutral-500">Check-in Time</Label>
                        <p className="font-medium">
                          {formatDate(foundLibraryVisit.checkInTime, "hh:mm a")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-neutral-500">Study Area</Label>
                        <p className="font-medium">{foundLibraryVisit.specificStudyArea}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <FormField
                  control={checkoutForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any notes about materials used, condition, etc." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  onClick={checkoutForm.handleSubmit(onCheckout)}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <i className="fas fa-sign-out-alt mr-2"></i>Complete Library Check-out
                    </>
                  )}
                </Button>
              </>
            )}
          </Form>
        )}
      </div>

      {/* Currently in Library Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Currently in Library</h2>
        
        <div className="flex justify-between mb-4">
          <div>
            <span className="text-sm font-medium">Total Today: </span>
            <Badge variant="default" className="bg-primary">
              {loadingVisits ? "..." : libraryVisits?.length || 0}
            </Badge>
          </div>
          <div>
            <span className="text-sm font-medium">Currently In: </span>
            <Badge variant="default" className="bg-accent">
              {loadingCheckedIn ? "..." : checkedInVisits?.length || 0}
            </Badge>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[600px]">
          {loadingVisits ? (
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
          ) : checkedInVisits?.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Ticket</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Study Area</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Time In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {checkedInVisits.map((visit: any) => (
                  <tr key={visit.id}>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-neutral-700">{visit.ticketNumber}</div>
                      <div className="text-xs text-neutral-500">ID: {visit.visitorId}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-neutral-700">{visit.specificStudyArea}</td>
                    <td className="px-3 py-3 text-sm text-neutral-700">
                      {formatDate(visit.checkInTime, "hh:mm a")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-neutral-500">
              No researchers currently in the library
            </div>
          )}
        </div>
      </div>

      {/* Library Gallery Section */}
      <div className="mt-8 lg:col-span-3">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Library Facilities</h2>
            <p className="text-neutral-700 mb-6">
              The National Archives of Zimbabwe houses extensive collections of historical documents, 
              records, and materials. Researchers can access these resources after completing 
              registration and payment procedures.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Library interior images */}
              {[
                {
                  title: "Reading Room",
                  description: "Quiet space for researchers to study archive materials",
                },
                {
                  title: "Archive Collections",
                  description: "Historical documents and records preserved for research",
                },
                {
                  title: "Control Desk",
                  description: "Library staff provide assistance and monitor material usage",
                }
              ].map((item, index) => (
                <div key={index} className="rounded-lg overflow-hidden shadow-sm">
                  <div className="w-full h-48 bg-neutral-200 flex items-center justify-center">
                    <svg className="w-24 h-24 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="p-3 bg-neutral-100">
                    <h3 className="text-sm font-medium text-primary">{item.title}</h3>
                    <p className="text-xs text-neutral-700">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
