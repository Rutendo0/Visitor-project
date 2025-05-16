import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Visitor } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Define the columns for the visitors table
export const visitorColumns: ColumnDef<Visitor>[] = [
  {
    accessorKey: "fullName",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.fullName}</div>
        <div className="text-xs text-muted-foreground">ID: {row.original.idNumber}</div>
      </div>
    ),
  },
  {
    accessorKey: "destination",
    header: "Destination",
    cell: ({ row }) => <div>{row.original.destination}</div>,
  },
  {
    accessorKey: "timeIn",
    header: "Time In",
    cell: ({ row }) => (
      <div>{row.original.timeIn ? format(new Date(row.original.timeIn), "hh:mm a") : "--"}</div>
    ),
  },
  {
    accessorKey: "timeOut",
    header: "Time Out",
    cell: ({ row }) => (
      <div>{row.original.timeOut ? format(new Date(row.original.timeOut), "hh:mm a") : "--"}</div>
    ),
  },
  {
    accessorKey: "visitorType",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant={row.original.visitorType === "Researcher" ? "default" : "secondary"}>
        {row.original.visitorType}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className={
            status === "CheckedIn"
              ? "bg-accent bg-opacity-20 text-accent hover:bg-accent hover:bg-opacity-20"
              : "bg-success bg-opacity-20 text-success hover:bg-success hover:bg-opacity-20"
          }
        >
          {status === "CheckedIn" ? "Checked In" : "Checked Out"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <VisitorActions visitor={row.original} />,
  },
];

// Component to handle visitor actions (checkout button)
function VisitorActions({ visitor }: { visitor: Visitor }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { mutate: checkoutVisitor, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/visitors/${visitor.id}/checkout`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors/checkedin"] });
      toast({
        title: "Visitor checked out successfully",
        description: `${visitor.fullName} has been checked out.`,
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
  
  // Only show checkout button for checked-in visitors
  if (visitor.status !== "CheckedIn") {
    return null;
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => checkoutVisitor()}
      disabled={isPending}
    >
      <i className="fas fa-sign-out-alt mr-2"></i>
      Check Out
    </Button>
  );
}

interface VisitorTableProps {
  visitors: Visitor[];
}

export function VisitorTable({ visitors }: VisitorTableProps) {
  return (
    <DataTable
      columns={visitorColumns}
      data={visitors}
      searchKey="fullName"
      searchPlaceholder="Search by name..."
    />
  );
}
