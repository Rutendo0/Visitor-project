import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import useTabState from "@/hooks/use-tab-state";
import { formatDate } from "@/utils/format-date";
import { Visitor } from "@shared/schema";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VisitorTable } from "@/components/VisitorTable";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// Fee payment schema
const feePaymentSchema = z.object({
  searchTerm: z.string().min(3, "Enter at least 3 characters to search"),
});

// Payment confirmation schema
const paymentConfirmSchema = z.object({
  feePaid: z.boolean(),
  ticketNumber: z.string().min(3, "Ticket number is required"),
});

export default function Accounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [foundVisitor, setFoundVisitor] = useState<Visitor | null>(null);
  
  // Get researchers for today
  const { data: researchers, isLoading: loadingResearchers } = useQuery({
    queryKey: ["/api/visitors/researchers"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/visitors?date=${today}&type=Researcher`);
      if (!res.ok) throw new Error("Failed to load researchers");
      return await res.json();
    }
  });
  
  // Create search form
  const searchForm = useForm<z.infer<typeof feePaymentSchema>>({
    resolver: zodResolver(feePaymentSchema),
    defaultValues: {
      searchTerm: "",
    },
  });
  
  // Create payment form
  const paymentForm = useForm<z.infer<typeof paymentConfirmSchema>>({
    resolver: zodResolver(paymentConfirmSchema),
    defaultValues: {
      feePaid: false,
      ticketNumber: "",
    },
  });
  
  // Mutation to update researcher fee status
  const { mutate: updateFeeStatus, isPending } = useMutation({
    mutationFn: async (data: { id: number, feePaid: boolean, ticketNumber: string }) => {
      const res = await apiRequest("PATCH", `/api/visitors/${data.id}/fee`, {
        feePaid: data.feePaid,
        ticketNumber: data.ticketNumber
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/researchers"] });
      
      setFoundVisitor(null);
      searchForm.reset({ searchTerm: "" });
      paymentForm.reset({ feePaid: false, ticketNumber: "" });
      
      toast({
        title: "Fee payment recorded successfully",
        description: "The researcher can now proceed to the library.",
      });
    },
    onError: () => {
      toast({
        title: "Error recording fee payment",
        description: "There was an error recording the fee payment. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle search form submission
  async function onSearchResearcher(data: z.infer<typeof feePaymentSchema>) {
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
      
      setFoundVisitor(visitor);
      
      // Generate ticket number if not present
      const ticketNumber = visitor.ticketNumber || `NAZ-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Pre-fill the payment form
      paymentForm.setValue("feePaid", visitor.feePaid || false);
      paymentForm.setValue("ticketNumber", ticketNumber);
    } catch (err) {
      toast({
        title: "Error searching for researcher",
        description: "There was an error searching for the researcher. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  // Handle payment form submission
  function onConfirmPayment(data: z.infer<typeof paymentConfirmSchema>) {
    if (!foundVisitor) return;
    
    updateFeeStatus({
      id: foundVisitor.id,
      feePaid: data.feePaid,
      ticketNumber: data.ticketNumber
    });
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Fee Payment Form */}
      <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
        <h2 className="text-xl font-semibold text-primary mb-6">Researcher Fee Management</h2>
        
        {/* Search Form */}
        <div className="mb-6 p-4 bg-neutral-100 rounded-md">
          <h3 className="font-medium text-primary mb-3">Search Researcher</h3>
          <Form {...searchForm}>
            <form onSubmit={searchForm.handleSubmit(onSearchResearcher)} className="flex gap-4">
              <FormField
                control={searchForm.control}
                name="searchTerm"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        placeholder="Enter researcher ID number" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">
                <i className="fas fa-search mr-2"></i>Search
              </Button>
            </form>
          </Form>
        </div>
        
        {/* Researcher Info & Payment Form */}
        {foundVisitor && (
          <div className="mb-6 border border-neutral-200 rounded-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-sm text-neutral-500">Name</Label>
                <p className="font-medium">{foundVisitor.fullName}</p>
              </div>
              <div>
                <Label className="text-sm text-neutral-500">ID Number</Label>
                <p className="font-medium">{foundVisitor.idNumber}</p>
              </div>
              <div>
                <Label className="text-sm text-neutral-500">Institute</Label>
                <p className="font-medium">{foundVisitor.institute || "Not specified"}</p>
              </div>
              <div>
                <Label className="text-sm text-neutral-500">Research Area</Label>
                <p className="font-medium">{foundVisitor.researchArea || "Not specified"}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm text-neutral-500">Fee Status</Label>
                <p className="font-medium">
                  {foundVisitor.feePaid ? (
                    <Badge className="bg-success bg-opacity-20 text-success hover:bg-success hover:bg-opacity-20">
                      <i className="fas fa-check-circle mr-1"></i> Paid
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive bg-opacity-20 text-destructive hover:bg-destructive hover:bg-opacity-20">
                      <i className="fas fa-times-circle mr-1"></i> Not Paid
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(onConfirmPayment)} className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={paymentForm.control}
                    name="feePaid"
                    render={({ field }) => (
                      <FormItem className="flex space-x-2 space-y-0 items-center">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-medium text-base cursor-pointer">
                          Mark Fee as Paid
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={paymentForm.control}
                    name="ticketNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          This ticket number will be used for library access
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="submit" className="mt-2" disabled={isPending}>
                  {isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      {foundVisitor.feePaid ? "Update Record" : "Confirm Payment"}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}
        
        {/* Recent Transactions */}
        <div>
          <h3 className="font-medium text-primary mb-3">Recent Researcher Payments</h3>
          {loadingResearchers ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : researchers && researchers.length > 0 ? (
            <VisitorTable visitors={researchers} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-neutral-500">
                <i className="fas fa-info-circle text-2xl mb-2"></i>
                <p>No researcher transactions for today</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Information Card */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fee Payment Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Standard Research Fee</h4>
              <p className="text-sm text-neutral-600">$25 per day for standard access to archives</p>
            </div>
            <div>
              <h4 className="font-medium">Special Collection Access</h4>
              <p className="text-sm text-neutral-600">$50 per day for access to restricted collections</p>
            </div>
            <div>
              <h4 className="font-medium">Student Discount</h4>
              <p className="text-sm text-neutral-600">50% discount with valid student ID</p>
            </div>
            <div>
              <h4 className="font-medium">Payment Methods</h4>
              <p className="text-sm text-neutral-600">Cash, mobile money, or bank transfer accepted</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Researcher Process</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2">
                <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0">1</Badge>
                <span>Reception: Visitor check-in</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0">2</Badge>
                <span>Accounts: Fee payment & ticket issuance</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0">3</Badge>
                <span>Library: Research material access</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0">4</Badge>
                <span>Library: Return materials & check out</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0">5</Badge>
                <span>Reception: Final check-out</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}