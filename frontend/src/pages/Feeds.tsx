import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import { feedsApi } from '../services/api';
import { Feed } from '../types';

const Feeds: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    enabled: true,
  });

  const queryClient = useQueryClient();
  const { data: feeds = [], isLoading } = useQuery<Feed[]>('feeds', feedsApi.getAll);

  const createMutation = useMutation(feedsApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('feeds');
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<Feed> }) => feedsApi.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('feeds');
        handleCloseDialog();
      },
    }
  );

  const deleteMutation = useMutation(feedsApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('feeds');
    },
  });

  const fetchMutation = useMutation(feedsApi.fetch, {
    onSuccess: () => {
      queryClient.invalidateQueries('feeds');
    },
  });

  const fetchAllMutation = useMutation(feedsApi.fetchAll, {
    onSuccess: () => {
      queryClient.invalidateQueries('feeds');
    },
  });

  const handleOpenDialog = (feed?: Feed) => {
    if (feed) {
      setEditingFeed(feed);
      setFormData({
        url: feed.url,
        title: feed.title,
        description: feed.description || '',
        enabled: feed.enabled,
      });
    } else {
      setEditingFeed(null);
      setFormData({
        url: '',
        title: '',
        description: '',
        enabled: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFeed(null);
    setFormData({
      url: '',
      title: '',
      description: '',
      enabled: true,
    });
  };

  const handleSubmit = () => {
    if (editingFeed) {
      updateMutation.mutate({ id: editingFeed.id!, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this feed?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFetch = (id: number) => {
    fetchMutation.mutate(id);
  };

  const handleFetchAll = () => {
    if (window.confirm('Fetch all enabled RSS feeds? This may take a few moments.')) {
      fetchAllMutation.mutate();
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">RSS Feeds</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleFetchAll}
            disabled={fetchAllMutation.isLoading}
          >
            {fetchAllMutation.isLoading ? 'Fetching...' : 'Fetch All'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Feed
          </Button>
        </Box>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Fetched</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feeds.map((feed) => (
              <TableRow key={feed.id}>
                <TableCell>
                  <Typography variant="subtitle2">{feed.title}</Typography>
                  {feed.description && (
                    <Typography variant="body2" color="textSecondary">
                      {feed.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {feed.url}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={feed.enabled ? 'Active' : 'Disabled'}
                    color={feed.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {feed.last_fetched
                    ? format(new Date(feed.last_fetched), 'MMM dd, yyyy HH:mm')
                    : 'Never'}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleFetch(feed.id!)}
                    disabled={fetchMutation.isLoading}
                  >
                    <RefreshIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(feed)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(feed.id!)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingFeed ? 'Edit Feed' : 'Add New Feed'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="RSS URL"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            margin="normal"
            required
            disabled={!!editingFeed}
          />
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
            }
            label="Enabled"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.url || !formData.title || createMutation.isLoading || updateMutation.isLoading}
          >
            {editingFeed ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alerts */}
      {(createMutation.error || updateMutation.error || deleteMutation.error || fetchAllMutation.error) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          An error occurred. Please try again.
        </Alert>
      )}

      {/* Success Alerts */}
      {fetchAllMutation.isSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Successfully initiated fetch for all enabled feeds.
        </Alert>
      )}
    </Box>
  );
};

export default Feeds;
