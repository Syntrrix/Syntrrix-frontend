import { Card, CardContent, Stack, Typography } from '@mui/material';

function Shipments() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={600}>
            Shipments
          </Typography>
          <Typography color="text.secondary">
            Static placeholder for shipment tracking and logistics.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default Shipments;




