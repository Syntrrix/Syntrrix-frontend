import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  alpha,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Swal from 'sweetalert2';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../../api/categories';
import { useThemeContext } from '../../../context/ThemeContext';

function Categories() {
  const { isDark } = useThemeContext();
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    setError('');
    try {
      const response = await fetchCategories();
      if (response && response.success && Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message || 'Failed to load categories.');
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleOpenModal = () => {
    setEditMode(false);
    setEditingCategory(null);
    setCategoryName('');
    setDescription('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditMode(false);
    setEditingCategory(null);
    setCategoryName('');
    setDescription('');
  };

  const handleEditCategory = (category) => {
    setEditMode(true);
    setEditingCategory(category);
    setCategoryName(category.category_name || '');
    setDescription(category.description || '');
    setModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a category name.',
        confirmButtonColor: '#0ea5e9',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        category_name: categoryName.trim(),
        ...(description.trim() && { description: description.trim() }),
      };

      let response;
      if (editMode && editingCategory) {
        // Update existing category
        response = await updateCategory(editingCategory.category_id, payload);
      } else {
        // Create new category
        response = await createCategory(payload);
      }

      if (response && response.success) {
        // Close modal first
        handleCloseModal();
        
        // Reload categories
        await loadCategories();
        
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || (editMode ? 'Category updated successfully.' : 'Category added successfully.'),
          confirmButtonColor: '#0ea5e9',
        });
      } else {
        throw new Error(response.message || 'Failed to save category.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save category.';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    // Show confirmation dialog
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${category.category_name}"? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await deleteCategory(category.category_id);
      if (response && response.success) {
        // Reload categories
        await loadCategories();
        
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: response.message || 'Category deleted successfully.',
          confirmButtonColor: '#0ea5e9',
        });
      } else {
        throw new Error(response.message || 'Failed to delete category.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete category.';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setLoading(false);
    }
  };

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
      return dateString;
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        backgroundColor: isDark ? '#0b1624' : '#f1f5f9',
        color: isDark ? '#e5e7eb' : '#0f172a',
        minHeight: '100vh',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      <Card
        sx={{
          backgroundColor: isDark ? '#0f1f33' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
          boxShadow: isDark ? 'none' : '0 10px 30px rgba(0,0,0,0.05)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {/* Header with Add Categories button */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="contained"
              onClick={handleOpenModal}
              sx={{
                textTransform: 'none',
                backgroundColor: '#0ea5e9',
                '&:hover': { backgroundColor: '#0284c7' },
              }}
            >
              + Add Category
            </Button>
            <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 700 }}>
              Categories
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Categories Table */}
          {loadingCategories ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                backgroundColor: '#0f1f33',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.06)',
                maxHeight: '70vh',
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}>
                      Sr.No
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}>
                      Category Name
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}>
                      Description
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}>
                      Created Date
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                        No categories found. Click "Add Category" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category, index) => (
                      <TableRow
                        key={category.category_id}
                        hover
                        sx={{
                          '&:hover': { backgroundColor: alpha('#22d3ee', 0.05) },
                        }}
                      >
                        <TableCell sx={{ color: '#e5e7eb' }}>{index + 1}</TableCell>
                        <TableCell sx={{ color: '#e5e7eb', fontWeight: 600 }}>
                          {category.category_name}
                        </TableCell>
                        <TableCell sx={{ color: '#9ca3af' }}>
                          {category.description || '—'}
                        </TableCell>
                        <TableCell sx={{ color: '#9ca3af' }}>
                          {formatDate(category.created_at)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditCategory(category)}
                            disabled={loading}
                            sx={{
                              color: '#22d3ee',
                              '&:hover': {
                                backgroundColor: alpha('#22d3ee', 0.15),
                              },
                              mr: 1,
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCategory(category)}
                            disabled={loading}
                            sx={{
                              color: '#f97373',
                              '&:hover': {
                                backgroundColor: alpha('#f97373', 0.15),
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Category Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f1f33',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.08)',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {editMode ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Category Name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Enter category name"
            required
            InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
            InputProps={{
              sx: {
                color: '#e5e7eb',
                backgroundColor: '#0b1c2d',
                borderRadius: 1,
              },
            }}
            sx={{ mb: 2 }}
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading && categoryName.trim()) {
                handleSaveCategory();
              }
            }}
          />
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter category description (optional)"
            multiline
            rows={3}
            InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
            InputProps={{
              sx: {
                color: '#e5e7eb',
                backgroundColor: '#0b1c2d',
                borderRadius: 1,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Button
            onClick={handleCloseModal}
            disabled={loading}
            sx={{ textTransform: 'none', color: '#e5e7eb' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCategory}
            disabled={loading || !categoryName.trim()}
            sx={{
              textTransform: 'none',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            {loading ? 'Saving...' : editMode ? 'Update Category' : 'Save Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Categories;
