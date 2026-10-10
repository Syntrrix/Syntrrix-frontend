import { Card, CardContent, Stack, Typography } from '@mui/material';

function Orders() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={600}>
            Orders
          </Typography>
          <Typography color="text.secondary">
            Static page for tracking purchase orders from suppliers.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default Orders;




