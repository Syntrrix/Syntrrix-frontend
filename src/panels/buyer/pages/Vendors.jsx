import { Card, CardContent, Stack, Typography } from '@mui/material';

function Vendors() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={600}>
            Vendors
          </Typography>
          <Typography color="text.secondary">
            Placeholder listing for preferred vendors and contact details.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default Vendors;




