import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { LibraryVisit } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Define the columns for the library researchers table
export const libraryResearcherColumns: ColumnDef<LibraryVisit>[] = [
  {
    accessorKey: "ticketNumber",
    header: "Researcher",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">TN: {row.original.ticketNumber}</div>
        <div className="text-xs text-muted-foreground">ID: {row.original.visitorId}</div>
      </div>
    ),
  },
  {
    accessorKey: "specificStudyArea",
    header: "Study Area",
    cell: ({ row }) => <div>{row.original.specificStudyArea}</div>,
  },
  {
    accessorKey: "checkInTime",
    header: "Time In",
    cell: ({ row }) => (
      <div>{row.original.checkInTime ? format(new Date(row.original.checkInTime), "hh:mm a") : "--"}</div>
    ),
  },
  {
    accessorKey: "checkOutTime",
    header: "Time Out",
    cell: ({ row }) => (
      <div>{row.original.checkOutTime ? format(new Date(row.original.checkOutTime), "hh:mm a") : "--"}</div>
    ),
  },
  {
    accessorKey: "controlOfficer",
    header: "Control Officer",
    cell: ({ row }) => <div>{row.original.controlOfficer}</div>,
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
    cell: ({ row }) => <LibraryVisitActions visit={row.original} />,
  },
];

// Component to handle library visit actions (checkout button)
function LibraryVisitActions({ visit }: { visit: LibraryVisit }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { mutate: checkoutLibraryVisit, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/library/visits/${visit.id}/checkout`, { notes: "" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/library/visits/checkedin"] });
      toast({
        title: "Researcher checked out successfully",
        description: `Ticket #${visit.ticketNumber} has been checked out of the library.`,
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
  
  // Only show checkout button for checked-in visitors
  if (visit.status !== "CheckedIn") {
    return null;
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => checkoutLibraryVisit()}
      disabled={isPending}
    >
      <i className="fas fa-sign-out-alt mr-2"></i>
      Check Out
    </Button>
  );
}

interface LibraryResearcherTableProps {
  visits: LibraryVisit[];
}

export function LibraryResearcherTable({ visits }: LibraryResearcherTableProps) {
  return (
    <DataTable
      columns={libraryResearcherColumns}
      data={visits}
      searchKey="ticketNumber"
      searchPlaceholder="Search by ticket number..."
    />
  );
}
