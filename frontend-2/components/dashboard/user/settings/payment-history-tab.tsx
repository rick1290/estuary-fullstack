import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material"

// Mock payment history data
const paymentHistory = [
  {
    id: "INV-001",
    date: "2025-04-15",
    amount: 75.0,
    description: "Yoga Session with Sarah Johnson",
    status: "completed",
  },
  {
    id: "INV-002",
    date: "2025-04-10",
    amount: 120.0,
    description: "Life Coaching Package (3 sessions)",
    status: "completed",
  },
  {
    id: "INV-003",
    date: "2025-04-05",
    amount: 45.0,
    description: "Meditation Workshop",
    status: "completed",
  },
  {
    id: "INV-004",
    date: "2025-03-28",
    amount: 60.0,
    description: "Nutrition Consultation",
    status: "refunded",
  },
]

export default function PaymentHistoryTab() {
  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Payment History
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentHistory.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.id}</TableCell>
                <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                <TableCell>{payment.description}</TableCell>
                <TableCell align="right">${payment.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    color={
                      payment.status === "completed" ? "success" : payment.status === "refunded" ? "error" : "default"
                    }
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
