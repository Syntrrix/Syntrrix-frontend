import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CircularProgress,
  InputAdornment,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { fetchBotCustomers } from '../../../api/customers';

function OnlineEntry() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetchBotCustomers();
      if (resp?.success && Array.isArray(resp.data)) {
        setRows(resp.data);
      } else {
        setRows([]);
      }
    } catch (e) {
      setError(e.message || 'Failed to load entries.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.full_name || '').toLowerCase();
      const mobile = (r.mobile_number || '').toString();
      const email = (r.email || '').toLowerCase();
      const extra = (r.bot_payload && JSON.stringify(r.bot_payload)) || '';
      return name.includes(q) || mobile.includes(q) || email.includes(q) || extra.toLowerCase().includes(q);
    });
  }, [rows, search]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: '#020617',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        color: '#e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Card
        sx={{
          backgroundColor: '#020617',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
          p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header + Search (mirrors Customers page) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Data Hub
          </Typography>
          <Box
            sx={{
              ml: 'auto',
              width: { xs: '100%', sm: 340, md: 360 },
              mt: { xs: 2, sm: 0 },
            }}
          >
            <TextField
              fullWidth
              placeholder="Search by Name, Phone or Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                ),
                sx: {
                  color: '#e5e7eb',
                  backgroundColor: '#0f2339',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(148, 163, 184, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0ea5e9',
                  },
                },
              }}
            />
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Table area – match Customers table styling */}
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              flexGrow: 1,
              overflow: 'auto',
              minHeight: 0,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Created Date
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Customer Name
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Mobile Number
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Email
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                      fontWeight: 600,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Data Storage Requirement
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                      No online entries found.
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                      No entries match your search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((r) => (
                    <TableRow
                      key={r.customer_id}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(148, 163, 184, 0.05)',
                        },
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                      }}
                    >
                      <TableCell sx={{ color: '#e5e7eb' }}>{formatDate(r.created_at)}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>{r.full_name || 'N/A'}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>{r.mobile_number || 'N/A'}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>{r.email || 'N/A'}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {r.bot_payload?.data_storage_requirement || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Pagination – same visual style as Customers */}
        {!loading && filtered.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mt: 3,
              mb: 2,
              flexShrink: 0,
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#e5e7eb',
                  '&.Mui-selected': {
                    backgroundColor: '#0ea5e9',
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: '#0284c7',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  },
                },
                '& .MuiPaginationItem-ellipsis': {
                  color: '#9ca3af',
                },
              }}
            />
          </Box>
        )}
      </Card>
    </Box>
  );
}

export default OnlineEntry;


 