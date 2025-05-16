import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

// Login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Create login form
  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Mutation to handle login
  const { mutate: login } = useMutation({
    mutationFn: async (data: z.infer<typeof loginFormSchema>) => {
      setIsLoading(true);
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      // Redirect based on user role
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.fullName}`,
      });
      
      // Redirect based on role
      switch (data.user.role) {
        case "Receptionist":
          setLocation("/reception");
          break;
        case "Accountant":
          setLocation("/accounts");
          break;
        case "LibraryOfficer":
          setLocation("/library");
          break;
        case "Admin":
          setLocation("/reports");
          break;
        default:
          setLocation("/");
      }
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });
  
  // Handle form submission
  function onSubmit(data: z.infer<typeof loginFormSchema>) {
    login(data);
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-md p-4">
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 bg-white rounded p-2 shadow-sm">
                <svg 
                  className="h-full w-full"
                  viewBox="0 0 100 100" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="50" cy="50" r="45" fill="#edcb23" />
                  <path d="M50 10 L85 85 L15 85 Z" fill="#d4351c" />
                  <path d="M50 20 L75 75 L25 75 Z" fill="#f2f2f2" />
                  <path d="M50 30 L65 65 L35 65 Z" fill="#006400" />
                  <circle cx="50" cy="48" r="10" fill="#000" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Staff Login</CardTitle>
            <p className="text-sm text-neutral-500">
              National Archives of Zimbabwe
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your username" 
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your password" 
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    <>Sign In</>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <Separator />
          <CardFooter className="justify-center py-4">
            <p className="text-xs text-neutral-500">
              © National Archives of Zimbabwe. All rights reserved.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}